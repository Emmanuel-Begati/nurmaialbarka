import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { canManageStudent, requireRole } from "@/lib/auth/guards";
import { canSeeFees, hasRole } from "@/lib/auth/roles";
import { canViewStudent } from "@/lib/scope";
import { getCurrentTerm } from "@/lib/current";
import { feeBalances } from "@/lib/fees";
import { gradeFor } from "@/lib/grading";
import { className, formatDate, formatNaira, studentName, termLabel } from "@/lib/format";
import { Alert, AttendanceBadge, Badge, Button, Card, Empty, FeeStatusBadge, LinkButton, PageHeader } from "@/components/ui";
import { ConfirmDelete } from "@/components/confirm";
import { Avatar } from "@/components/avatar";
import { PhotoInput } from "@/components/photo-input";
import { photoUrl } from "@/lib/photo-url";
import { addGuardian, deleteStudent, linkGuardianByPhone, removeGuardian, setGuardianLogin, setStudentLogin, setStudentPhoto } from "../actions";

export default async function StudentProfile({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string; photoError?: string }>;
}) {
  const notice = await searchParams;
  const user = await requireRole("admin", "bursar", "teacher");
  const id = Number((await params).id);
  if (!(await canViewStudent(user, id))) redirect("/forbidden");

  const student = await db.student.findUnique({
    where: { id },
    include: {
      class: { include: { classTeacher: true } },
      guardians: { include: { guardian: { include: { user: true } } } },
      user: true,
    },
  });
  if (!student) notFound();

  const term = await getCurrentTerm();
  const isAdmin = hasRole(user.roles, "admin");
  // admin or this student's class teacher may edit/delete the student and their guardians
  const canManage = await canManageStudent(user, id);
  const showFees = canSeeFees(user.roles);

  const [attendance, scores, bands, quran, payments, balance] = await Promise.all([
    db.attendance.findMany({ where: { studentId: id }, orderBy: { date: "desc" } }),
    term
      ? db.score.findMany({ where: { studentId: id, termId: term.id }, include: { classSubject: { include: { subject: true } } } })
      : [],
    db.gradeBand.findMany({ orderBy: { min: "desc" } }),
    term ? db.quranProgress.findUnique({ where: { studentId_termId: { studentId: id, termId: term.id } } }) : null,
    showFees ? db.payment.findMany({ where: { studentId: id }, include: { term: { include: { session: true } } }, orderBy: { paidOn: "desc" } }) : [],
    showFees && term ? (await feeBalances(term.id, [id])).get(id) : undefined,
  ]);

  const termAttendance = term
    ? attendance.filter((a) => a.date >= term.startDate.toISOString().slice(0, 10) && a.date <= term.endDate.toISOString().slice(0, 10))
    : attendance;
  const count = (s: string) => termAttendance.filter((a) => a.status === s).length;

  return (
    <>
      <PageHeader
        title={studentName(student)}
        subtitle={
          <>
            <span className="font-mono">{student.admissionNo}</span> · {student.class ? className(student.class) : "No class"} ·{" "}
            <Badge color={student.status === "active" ? "green" : "gray"}>{student.status}</Badge>
          </>
        }
        actions={
          <>
            {term && (hasRole(user.roles, "admin", "teacher")) && (
              <LinkButton href={`/print/report/${term.id}/${student.id}`} variant="secondary">
                Report card
              </LinkButton>
            )}
            {showFees && <LinkButton href={`/fees/record?student=${student.id}`}>Record payment</LinkButton>}
            {canManage && (
              <LinkButton href={`/students/${student.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            )}
          </>
        }
      />

      {notice.created && (
        <Alert kind="success">
          Student admitted. Admission number <strong>{student.admissionNo}</strong>.{" "}
          <Link href="/students/new" className="font-medium underline">
            Admit another
          </Link>
        </Alert>
      )}
      {notice.updated && <Alert kind="success">Changes saved.</Alert>}
      {notice.photoError && <Alert kind="error">The photo was not saved: {notice.photoError}</Alert>}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Personal details">
          <div className="border-b border-gray-100 p-4">
            {canManage ? (
              <form action={setStudentPhoto.bind(null, student.id)}>
                <PhotoInput autoSubmit name={studentName(student)} currentUrl={photoUrl("student", student.id, student.photoAt)} />
              </form>
            ) : (
              <Avatar size="lg" name={studentName(student)} src={photoUrl("student", student.id, student.photoAt)} />
            )}
          </div>
          <dl className="grid grid-cols-3 gap-y-2 p-4 text-sm">
            <dt className="text-gray-500">Gender</dt>
            <dd className="col-span-2">{student.gender === "M" ? "Male" : "Female"}</dd>
            <dt className="text-gray-500">Date of birth</dt>
            <dd className="col-span-2">{formatDate(student.dateOfBirth)}</dd>
            <dt className="text-gray-500">Address</dt>
            <dd className="col-span-2">{student.address || "—"}</dd>
            <dt className="text-gray-500">Admitted</dt>
            <dd className="col-span-2">{formatDate(student.admittedOn)}</dd>
            <dt className="text-gray-500">Portal login</dt>
            <dd className="col-span-2">{student.user ? <Badge color="green">{student.user.username}</Badge> : "None"}</dd>
          </dl>
          {isAdmin && (
            <form action={setStudentLogin.bind(null, student.id)} className="flex gap-2 border-t border-gray-100 p-4">
              <input name="password" type="password" minLength={6} required placeholder="New password (min 6)" className="input" />
              <Button variant="secondary" className="shrink-0">
                {student.user ? "Reset" : "Create login"}
              </Button>
            </form>
          )}
        </Card>

        <Card title={`Attendance${term ? ` · ${termLabel(term)}` : ""}`}>
          <div className="grid grid-cols-4 gap-2 p-4 text-center">
            {(["present", "late", "absent", "excused"] as const).map((s) => (
              <div key={s}>
                <div className="text-xl font-semibold">{count(s)}</div>
                <AttendanceBadge status={s} />
              </div>
            ))}
          </div>
          <ul className="max-h-48 divide-y divide-gray-100 overflow-y-auto border-t border-gray-100 text-sm">
            {attendance.slice(0, 15).map((a) => (
              <li key={a.id} className="flex justify-between px-4 py-1.5">
                <span>{formatDate(a.date)}</span>
                <AttendanceBadge status={a.status} />
              </li>
            ))}
          </ul>
        </Card>

        {showFees ? (
          <Card title={`School fees${term ? ` · ${termLabel(term)}` : ""}`}>
            {balance ? (
              <dl className="grid grid-cols-2 gap-y-2 p-4 text-sm">
                <dt className="text-gray-500">Expected</dt>
                <dd className="text-right">{formatNaira(balance.expected)}</dd>
                <dt className="text-gray-500">Paid</dt>
                <dd className="text-right">{formatNaira(balance.paid)}</dd>
                <dt className="text-gray-500">Balance</dt>
                <dd className="text-right font-semibold">{formatNaira(balance.balance)}</dd>
                <dt className="text-gray-500">Status</dt>
                <dd className="text-right">
                  <FeeStatusBadge status={balance.status} />
                </dd>
              </dl>
            ) : (
              <Empty>No fee data.</Empty>
            )}
            <ul className="divide-y divide-gray-100 border-t border-gray-100 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-4 py-1.5">
                  <Link href={`/print/receipt/${p.id}`} className={p.voided ? "text-gray-400 line-through" : "text-brand-700 hover:underline"}>
                    {p.receiptNo}
                  </Link>
                  <span className="text-gray-500">{formatDate(p.paidOn)}</span>
                  <span>{formatNaira(p.amount)}</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card title="Qur'an progress">
            <QuranSummary q={quran} />
          </Card>
        )}

        <Card title="Parents / guardians" className="lg:col-span-2">
          {student.guardians.length === 0 && <Empty>No guardian recorded.</Empty>}
          <ul className="divide-y divide-gray-100">
            {student.guardians.map(({ guardian: g, isPrimary }) => (
              <li key={g.id} className="p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">
                      {g.fullName} {isPrimary && <Badge color="blue">Primary</Badge>}
                    </div>
                    <div className="text-gray-500">
                      {g.relationship} · {g.phone || "no phone"} {g.email && `· ${g.email}`}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Portal: {g.user ? <span className="text-green-700">{g.user.username}</span> : "no login"}
                    </div>
                  </div>
                  {canManage && (
                    <form action={removeGuardian.bind(null, student.id, g.id)}>
                      <Button variant="ghost" className="text-red-600">
                        Remove
                      </Button>
                    </form>
                  )}
                </div>
                {isAdmin && (
                  <form action={setGuardianLogin.bind(null, student.id, g.id)} className="mt-2 flex flex-wrap gap-2">
                    <input name="email" type="email" defaultValue={g.user?.username ?? g.email} required placeholder="Login email" className="input max-w-xs" />
                    <input name="password" type="password" minLength={6} required placeholder="Password (min 6)" className="input max-w-xs" />
                    <Button variant="secondary">{g.user ? "Reset parent login" : "Create parent login"}</Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {canManage && (
            <div className="grid gap-4 border-t border-gray-100 p-4 md:grid-cols-2">
              <form action={addGuardian.bind(null, student.id)} className="space-y-2">
                <div className="text-sm font-medium">Add new guardian</div>
                <input name="fullName" required placeholder="Full name" className="input" />
                <div className="flex gap-2">
                  <select name="relationship" className="input">
                    <option>Father</option>
                    <option>Mother</option>
                    <option>Guardian</option>
                    <option>Uncle</option>
                    <option>Aunt</option>
                  </select>
                  <input name="phone" placeholder="Phone" className="input" />
                </div>
                <input name="email" type="email" placeholder="Email (optional)" className="input" />
                <Button variant="secondary">Add guardian</Button>
              </form>
              <form action={linkGuardianByPhone.bind(null, student.id)} className="space-y-2">
                <div className="text-sm font-medium">Link existing guardian (sibling)</div>
                <input name="phone" required placeholder="Guardian's phone number" className="input" />
                <Button variant="secondary">Link guardian</Button>
              </form>
            </div>
          )}
        </Card>

        <Card title={`Results${term ? ` · ${termLabel(term)}` : ""}`}>
          {scores.length === 0 ? (
            <Empty>No scores yet.</Empty>
          ) : (
            <table className="table">
              <tbody>
                {scores.map((s) => (
                  <tr key={s.id}>
                    <td>{s.classSubject.subject.name}</td>
                    <td className="text-right">{s.total}</td>
                    <td className="text-right font-semibold">{gradeFor(s.total, bands).grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {showFees && (
            <div className="border-t border-gray-100">
              <div className="px-4 pt-3 text-xs font-semibold uppercase text-gray-500">Qur&apos;an progress</div>
              <QuranSummary q={quran} />
            </div>
          )}
        </Card>

        {canManage && (
          <Card title="Delete student" className="border-red-200 lg:col-span-3">
            <div className="flex flex-wrap items-start justify-between gap-4 p-4 text-sm text-gray-600">
              <p className="max-w-2xl">
                Permanently removes {studentName(student)} and all their attendance, results, Qur&apos;an progress, payments and portal
                login. If they have just left the school, consider setting their status to <strong>Withdrawn</strong> (Edit) instead, which
                keeps their records.
              </p>
              <form action={deleteStudent.bind(null, student.id)}>
                <ConfirmDelete
                  label="Delete student"
                  warning={
                    <>
                      Delete <strong>{studentName(student)}</strong> ({student.admissionNo}) and all their records? This cannot be undone.
                    </>
                  }
                />
              </form>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

function QuranSummary({ q }: { q: { memorisedFrom: string; memorisedTo: string; totalJuz: number; currentJuz: number | null; remark: string } | null }) {
  if (!q) return <Empty>No Qur&apos;an progress recorded this term.</Empty>;
  return (
    <dl className="grid grid-cols-2 gap-y-2 p-4 text-sm">
      <dt className="text-gray-500">This term</dt>
      <dd>
        {q.memorisedFrom} → {q.memorisedTo}
      </dd>
      <dt className="text-gray-500">Current juz</dt>
      <dd>{q.currentJuz ?? "—"}</dd>
      <dt className="text-gray-500">Total memorised</dt>
      <dd>{q.totalJuz} juz</dd>
      <dt className="text-gray-500">Remark</dt>
      <dd>{q.remark || "—"}</dd>
    </dl>
  );
}
