import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/roles";
import { portalStudentIds } from "@/lib/auth/guards";
import { getCurrentTerm } from "@/lib/current";
import { feeBalances } from "@/lib/fees";
import { Avatar } from "@/components/avatar";
import { photoUrl } from "@/lib/photo-url";
import { className, formatDate, formatNaira, studentName, termLabel } from "@/lib/format";
import { Alert, AttendanceBadge, Card, Empty, FeeStatusBadge, PageHeader, Stat } from "@/components/ui";

export default async function PortalHome({ searchParams }: { searchParams: Promise<{ child?: string; notice?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const ids = await portalStudentIds(user);
  if (ids.length === 0) return <Alert>No student is linked to your account yet. Please contact the school office.</Alert>;

  const children = await db.student.findMany({
    where: { id: { in: ids } },
    include: { class: { include: { classTeacher: true } } },
    orderBy: { firstName: "asc" },
  });
  const child = children.find((c) => c.id === Number(sp.child)) ?? children[0];
  const term = await getCurrentTerm();
  const isParent = hasRole(user.roles, "parent");

  const [attendance, published, payments, balance] = await Promise.all([
    db.attendance.findMany({ where: { studentId: child.id }, orderBy: { date: "desc" }, take: 60 }),
    db.termReport.findMany({ where: { studentId: child.id, published: true }, include: { term: { include: { session: true } } }, orderBy: { term: { startDate: "desc" } } }),
    isParent ? db.payment.findMany({ where: { studentId: child.id, voided: false }, include: { term: { include: { session: true } } }, orderBy: { paidOn: "desc" } }) : [],
    isParent && term ? (await feeBalances(term.id, [child.id])).get(child.id) : undefined,
  ]);

  const termStart = term?.startDate.toISOString().slice(0, 10) ?? "";
  const termAtt = attendance.filter((a) => a.date >= termStart);
  const present = termAtt.filter((a) => a.status === "present" || a.status === "late").length;

  return (
    <>
      {sp.notice === "unpublished" && <Alert>That report card has not been released by the school yet.</Alert>}
      {children.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {children.map((c) => (
            <Link
              key={c.id}
              href={`/portal?child=${c.id}`}
              className={`rounded-full border px-3 py-1 text-sm ${c.id === child.id ? "border-brand-600 bg-brand-600 text-white" : "border-gray-300 bg-white"}`}
            >
              {c.firstName}
            </Link>
          ))}
        </div>
      )}
      <div className="mb-2">
        <Avatar size="md" name={studentName(child)} src={photoUrl("student", child.id, child.photoAt)} />
      </div>
      <PageHeader
        title={studentName(child)}
        subtitle={`${child.admissionNo} · ${child.class ? className(child.class) : "No class"}${term ? ` · ${termLabel(term)}` : ""}`}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Attendance this term" value={termAtt.length ? `${Math.round((present / termAtt.length) * 100)}%` : "—"} hint={`${present} of ${termAtt.length} days`} />
        <Stat label="Report cards released" value={published.length} />
        {isParent && balance && (
          <Stat
            label="Fees balance (this term)"
            value={formatNaira(balance.balance)}
            hint={
              <>
                <FeeStatusBadge status={balance.status} /> {formatNaira(balance.paid)} of {formatNaira(balance.expected)} paid
              </>
            }
          />
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Report cards">
          {published.length === 0 ? (
            <Empty>No report cards have been released yet.</Empty>
          ) : (
            <ul className="divide-y divide-gray-100">
              {published.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  {termLabel(r.term)}
                  <Link href={`/print/report/${r.termId}/${child.id}`} className="font-medium text-brand-700 hover:underline">
                    View / print
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent attendance">
          {attendance.length === 0 ? (
            <Empty>No attendance recorded yet.</Empty>
          ) : (
            <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto text-sm">
              {attendance.slice(0, 20).map((a) => (
                <li key={a.id} className="flex items-center justify-between px-4 py-2">
                  <span>{formatDate(a.date)}</span>
                  <span className="flex items-center gap-2">
                    {a.remark && <span className="text-xs text-gray-500">{a.remark}</span>}
                    <AttendanceBadge status={a.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {isParent && (
          <Card title="Payments & receipts" className="md:col-span-2">
            {payments.length === 0 ? (
              <Empty>No payments recorded.</Empty>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Term</th>
                    <th>Date</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/print/receipt/${p.id}`} className="font-mono text-xs text-brand-700 hover:underline">
                          {p.receiptNo}
                        </Link>
                      </td>
                      <td>{termLabel(p.term)}</td>
                      <td>{formatDate(p.paidOn)}</td>
                      <td className="text-right">{formatNaira(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
