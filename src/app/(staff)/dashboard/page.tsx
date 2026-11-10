import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canSeeFees, hasRole } from "@/lib/auth/roles";
import { manageableClasses } from "@/lib/auth/guards";
import { getCurrentTerm } from "@/lib/current";
import { feeBalances } from "@/lib/fees";
import { className, formatDate, formatNaira, termLabel, todayISO } from "@/lib/format";
import { Card, PageHeader, Stat, LinkButton } from "@/components/ui";

export default async function Dashboard() {
  const user = await requireUser();
  const term = await getCurrentTerm();
  const today = todayISO();

  const [studentCount, classes, todayAttendance, recentDays] = await Promise.all([
    db.student.count({ where: { status: "active" } }),
    db.class.findMany({
      where: { active: true },
      include: { classTeacher: true, _count: { select: { students: { where: { status: "active" } } } } },
      orderBy: { id: "asc" },
    }),
    db.attendance.groupBy({ by: ["status"], where: { date: today }, _count: true }),
    db.attendance.groupBy({ by: ["date", "status"], _count: true, orderBy: { date: "desc" }, take: 80 }),
  ]);

  const presentToday = todayAttendance
    .filter((a) => a.status === "present" || a.status === "late")
    .reduce((s, a) => s + a._count, 0);
  const markedToday = todayAttendance.reduce((s, a) => s + a._count, 0);

  // attendance trend: last 10 dates with records
  const byDate = new Map<string, { present: number; total: number }>();
  for (const r of recentDays) {
    const e = byDate.get(r.date) ?? { present: 0, total: 0 };
    e.total += r._count;
    if (r.status === "present" || r.status === "late") e.present += r._count;
    byDate.set(r.date, e);
  }
  const trend = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-10);

  // classes not yet marked today
  const markedClassIds = new Set(
    (await db.attendance.findMany({ where: { date: today }, select: { classId: true }, distinct: ["classId"] })).map((a) => a.classId),
  );
  const myClasses = hasRole(user.roles, "admin", "teacher") ? await manageableClasses(user) : [];
  const unmarked = myClasses.filter((c) => !markedClassIds.has(c.id));

  // fees (only for admin/bursar)
  let fees: { expected: number; paid: number; owingCount: number; partialCount: number; paidCount: number } | null = null;
  let recentPayments: Awaited<ReturnType<typeof getRecentPayments>> = [];
  if (canSeeFees(user.roles) && term) {
    const balances = await feeBalances(term.id);
    fees = { expected: 0, paid: 0, owingCount: 0, partialCount: 0, paidCount: 0 };
    for (const b of balances.values()) {
      fees.expected += b.expected;
      fees.paid += Math.min(b.paid, b.expected || b.paid);
      if (b.status === "owing") fees.owingCount++;
      else if (b.status === "partial") fees.partialCount++;
      else fees.paidCount++;
    }
    recentPayments = await getRecentPayments(term.id);
  }

  const maxClass = Math.max(1, ...classes.map((c) => c._count.students));

  return (
    <>
      <PageHeader
        title={`Assalamu alaikum, ${user.title} ${user.fullName.split(" ")[0]}`}
        subtitle={term ? `${termLabel(term)} · Today is ${formatDate(new Date())}` : "No current term set. Go to Settings."}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active students" value={studentCount} hint={`${classes.length} classes`} />
        <Stat
          label="Attendance today"
          value={markedToday ? `${Math.round((presentToday / markedToday) * 100)}%` : "—"}
          hint={markedToday ? `${presentToday} of ${markedToday} present` : "Not marked yet"}
        />
        {fees ? (
          <>
            <Stat
              label="Fees collected (term)"
              value={formatNaira(fees.paid)}
              hint={`of ${formatNaira(fees.expected)} expected (${fees.expected ? Math.round((fees.paid / fees.expected) * 100) : 0}%)`}
            />
            <Stat label="Students owing" value={fees.owingCount + fees.partialCount} hint={`${fees.owingCount} unpaid · ${fees.partialCount} part-paid`} />
          </>
        ) : (
          <>
            <Stat label="My classes" value={myClasses.length} />
            <Stat label="Registers pending" value={unmarked.length} hint="for today" />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {unmarked.length > 0 && (
          <Card title="Attendance not yet taken today" className="lg:col-span-2">
            <ul className="divide-y divide-gray-100">
              {unmarked.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  {className(c)}
                  <LinkButton href={`/attendance?class=${c.id}&date=${today}`} variant="secondary">
                    Take register
                  </LinkButton>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card title="Attendance rate: last 10 school days">
          <div className="flex h-48 items-end gap-2 px-4 pt-4 pb-2">
            {trend.map(([date, v]) => {
              const pct = v.total ? Math.round((v.present / v.total) * 100) : 0;
              return (
                <div key={date} className="flex flex-1 flex-col items-center gap-1" title={`${date}: ${pct}%`}>
                  <span className="text-[10px] text-gray-500">{pct}%</span>
                  <div className="w-full rounded-t bg-brand-500" style={{ height: `${pct * 1.3}px` }} />
                  <span className="text-[10px] text-gray-400">{date.slice(5)}</span>
                </div>
              );
            })}
            {trend.length === 0 && <p className="m-auto text-sm text-gray-500">No attendance recorded yet.</p>}
          </div>
        </Card>

        <Card title="Students per class">
          <ul className="space-y-3 p-4">
            {classes.map((c) => (
              <li key={c.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{className(c)}</span>
                  <span className="font-medium">{c._count.students}</span>
                </div>
                <div className="h-2 rounded bg-gray-100">
                  <div className="h-2 rounded bg-brand-600" style={{ width: `${(c._count.students / maxClass) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {fees && (
          <Card title="Recent payments" actions={<Link href="/fees/payments" className="text-xs font-medium text-brand-700">View all</Link>} className="lg:col-span-2">
            <table className="table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Student</th>
                  <th>Date</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/print/receipt/${p.id}`} className="text-brand-700 hover:underline">
                        {p.receiptNo}
                      </Link>
                    </td>
                    <td>
                      {p.student.lastName} {p.student.firstName}
                    </td>
                    <td>{formatDate(p.paidOn)}</td>
                    <td className="text-right">{formatNaira(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </>
  );
}

function getRecentPayments(termId: number) {
  return db.payment.findMany({
    where: { termId, voided: false },
    include: { student: true },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
}
