import Link from "next/link";
import { db } from "@/lib/db";
import { manageableClasses, requireRole } from "@/lib/auth/guards";
import { className, formatDate, studentName, todayISO } from "@/lib/format";
import { Alert, Button, Card, Empty, FilterBar, PageHeader } from "@/components/ui";
import { saveRegister } from "./actions";

const STATUS = [
  { v: "present", l: "P", title: "Present" },
  { v: "late", l: "L", title: "Late" },
  { v: "absent", l: "A", title: "Absent" },
  { v: "excused", l: "E", title: "Excused" },
];

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; date?: string; saved?: string; view?: string; month?: string }>;
}) {
  const user = await requireRole("admin", "teacher");
  const sp = await searchParams;
  const classes = await manageableClasses(user);
  const classId = Number(sp.class ?? classes[0]?.id);
  const cls = classes.find((c) => c.id === classId);
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayISO();
  const view = sp.view === "summary" ? "summary" : "register";

  if (classes.length === 0) {
    return (
      <>
        <PageHeader title="Attendance" />
        <Alert>You are not the class teacher of any class. Only class teachers take attendance.</Alert>
      </>
    );
  }

  const tabs = (
    <div className="mb-4 flex gap-1 border-b border-gray-200 no-print">
      {(["register", "summary"] as const).map((t) => (
        <Link
          key={t}
          href={`/attendance?class=${classId}&view=${t}${t === "register" ? `&date=${date}` : ""}`}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${view === t ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500"}`}
        >
          {t === "register" ? "Daily register" : "Monthly summary"}
        </Link>
      ))}
    </div>
  );

  const classPicker = (
    <select name="class" defaultValue={classId} className="input w-64">
      {classes.map((c) => (
        <option key={c.id} value={c.id}>
          {className(c)}
        </option>
      ))}
    </select>
  );

  if (view === "summary") {
    return (
      <>
        <PageHeader title="Attendance" subtitle={cls ? className(cls) : ""} />
        {tabs}
        <MonthlySummary classId={classId} month={sp.month} classPicker={classPicker} />
      </>
    );
  }

  const [students, records] = await Promise.all([
    db.student.findMany({ where: { classId, status: "active" }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    db.attendance.findMany({ where: { classId, date } }),
  ]);
  const byStudent = new Map(records.map((r) => [r.studentId, r]));
  const day = new Date(date + "T00:00:00").getDay();
  const isWeekend = day === 0 || day === 6;

  return (
    <>
      <PageHeader title="Attendance" subtitle={`${cls ? className(cls) : ""} · ${formatDate(date)}`} />
      {tabs}
      <FilterBar>
        {classPicker}
        <input type="date" name="date" defaultValue={date} max={todayISO()} className="input w-44" />
      </FilterBar>

      {sp.saved && <Alert kind="success">Register saved for {formatDate(date)}.</Alert>}
      {isWeekend && <Alert>This date is a weekend.</Alert>}
      {records.length === 0 && students.length > 0 && (
        <Alert>Not yet marked. Everyone defaults to Present, so just change those who are absent or late.</Alert>
      )}

      <Card>
        {students.length === 0 ? (
          <Empty>No active students in this class.</Empty>
        ) : (
          <form key={`${classId}-${date}`} action={saveRegister.bind(null, classId, date)}>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-10">#</th>
                    <th>Student</th>
                    <th>Status</th>
                    <th className="hidden sm:table-cell">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
                    const current = byStudent.get(s.id);
                    return (
                      <tr key={s.id}>
                        <td className="text-gray-400 max-sm:px-2">{i + 1}</td>
                        <td>
                          <div className="font-medium">{studentName(s)}</div>
                          <div className="font-mono text-xs text-gray-400">{s.admissionNo}</div>
                        </td>
                        <td>
                          <div className="flex gap-1">
                            {STATUS.map((o) => (
                              <label key={o.v} className="chip" title={o.title}>
                                <input type="radio" name={`s_${s.id}`} value={o.v} defaultChecked={(current?.status ?? "present") === o.v} />
                                <span className={o.v}>{o.l}</span>
                              </label>
                            ))}
                          </div>
                        </td>
                        <td className="hidden sm:table-cell">
                          <input name={`r_${s.id}`} defaultValue={current?.remark} placeholder="optional" className="input py-1" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col-reverse gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-gray-500">P = Present · L = Late · A = Absent · E = Excused</span>
              <Button className="max-sm:w-full">Save register</Button>
            </div>
          </form>
        )}
      </Card>
    </>
  );
}

async function MonthlySummary({ classId, month, classPicker }: { classId: number; month?: string; classPicker: React.ReactNode }) {
  const m = month && /^\d{4}-\d{2}$/.test(month) ? month : todayISO().slice(0, 7);
  const [students, records] = await Promise.all([
    db.student.findMany({ where: { classId, status: "active" }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    db.attendance.findMany({ where: { classId, date: { startsWith: m } } }),
  ]);
  const dates = [...new Set(records.map((r) => r.date))].sort();
  const grid = new Map(records.map((r) => [`${r.studentId}|${r.date}`, r.status]));
  const letter: Record<string, string> = { present: "•", late: "L", absent: "A", excused: "E" };
  const color: Record<string, string> = { present: "text-green-600", late: "text-amber-600", absent: "text-red-600 font-bold", excused: "text-sky-600" };

  return (
    <>
      <FilterBar>
        <input type="hidden" name="view" value="summary" />
        {classPicker}
        <input type="month" name="month" defaultValue={m} className="input w-44" />
      </FilterBar>
      <Card>
        {dates.length === 0 ? (
          <Empty>No attendance recorded in this month.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  {dates.map((d) => (
                    <th key={d} className="px-1 text-center">
                      {d.slice(8)}
                    </th>
                  ))}
                  <th className="text-right">Present</th>
                  <th className="text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const present = dates.filter((d) => ["present", "late"].includes(grid.get(`${s.id}|${d}`) ?? "")).length;
                  return (
                    <tr key={s.id}>
                      <td className="whitespace-nowrap">{studentName(s)}</td>
                      {dates.map((d) => {
                        const st = grid.get(`${s.id}|${d}`);
                        return (
                          <td key={d} className={`px-1 text-center ${st ? color[st] : "text-gray-300"}`}>
                            {st ? letter[st] : "·"}
                          </td>
                        );
                      })}
                      <td className="text-right">
                        {present}/{dates.length}
                      </td>
                      <td className="text-right font-medium">{Math.round((present / dates.length) * 100)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
