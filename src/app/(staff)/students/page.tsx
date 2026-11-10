import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, studentManagerClassIds } from "@/lib/auth/guards";
import { hasRole } from "@/lib/auth/roles";
import { studentScope } from "@/lib/scope";
import { className, studentName } from "@/lib/format";
import { Alert, Badge, Card, Empty, FilterBar, LinkButton, PageHeader } from "@/components/ui";
import { BulkDeleteBar, SelectAll } from "@/components/confirm";
import { deleteStudents } from "./actions";
import { Avatar } from "@/components/avatar";
import { photoUrl } from "@/lib/photo-url";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; class?: string; status?: string; deleted?: string }>;
}) {
  const user = await requireRole("admin", "bursar", "teacher");
  const sp = await searchParams;
  const scope = await studentScope(user);
  const status = sp.status ?? "active";
  const q = sp.q?.trim();

  const [students, classes] = await Promise.all([
    db.student.findMany({
      where: {
        AND: [
          scope,
          status === "all" ? {} : { status },
          sp.class ? { classId: Number(sp.class) } : {},
          q
            ? { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { admissionNo: { contains: q } }] }
            : {},
        ],
      },
      include: { class: { include: { classTeacher: true } }, guardians: { include: { guardian: true }, where: { isPrimary: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    db.class.findMany({ where: { active: true }, include: { classTeacher: true } }),
  ]);

  const isAdmin = hasRole(user.roles, "admin");
  // admin: every student; class teacher: students in their own class(es)
  const managed = await studentManagerClassIds(user);
  const canManage = (classId: number | null) => managed === "all" || (classId !== null && managed.includes(classId));
  const canAdd = managed === "all" || managed.length > 0;
  const showBulk = canAdd && students.some((s) => canManage(s.classId));

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${students.length} student${students.length === 1 ? "" : "s"}`}
        actions={
          <>
            {isAdmin && (
              <LinkButton href="/students/export" variant="secondary" prefetch={false}>
                Export CSV
              </LinkButton>
            )}
            {canAdd && <LinkButton href="/students/new">Add student</LinkButton>}
          </>
        }
      />
      <FilterBar>
        <input name="q" defaultValue={q} placeholder="Search name or admission no." className="input w-64" />
        <select name="class" defaultValue={sp.class ?? ""} className="input w-56">
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {className(c)}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} className="input w-40">
          <option value="active">Active</option>
          <option value="graduated">Graduated</option>
          <option value="withdrawn">Withdrawn</option>
          <option value="all">All</option>
        </select>
      </FilterBar>
      {sp.deleted && (
        <Alert kind="success">
          {sp.deleted} student{sp.deleted === "1" ? "" : "s"} deleted.
        </Alert>
      )}
      {showBulk && (
        <BulkDeleteBar
          formId="bulk-students"
          action={deleteStudents}
          noun="student"
          warning="This also erases their attendance, results, Qur'an progress, payments and parent logins. It cannot be undone."
        />
      )}
      <Card>
        {students.length === 0 ? (
          <Empty>No students found.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  {showBulk && (
                    <th className="w-10">
                      <SelectAll formId="bulk-students" />
                    </th>
                  )}
                  <th className="hidden sm:table-cell">Adm. No.</th>
                  <th>Name</th>
                  <th className="hidden md:table-cell">Gender</th>
                  <th className="hidden sm:table-cell">Class</th>
                  <th className="hidden lg:table-cell">Guardian</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    {showBulk && (
                      <td>
                        {canManage(s.classId) && (
                          <input type="checkbox" name="ids" value={s.id} form="bulk-students" aria-label={`Select ${studentName(s)}`} className="h-4 w-4 accent-red-600" />
                        )}
                      </td>
                    )}
                    <td className="hidden font-mono text-xs sm:table-cell">{s.admissionNo}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={studentName(s)} src={photoUrl("student", s.id, s.photoAt)} />
                        <div className="min-w-0">
                          <Link href={`/students/${s.id}`} className="font-medium text-brand-700 hover:underline">
                            {studentName(s)}
                          </Link>
                          {/* on phones, the hidden columns are summarised under the name */}
                          <div className="text-xs text-gray-500 sm:hidden">
                            <span className="font-mono">{s.admissionNo}</span>
                            {s.class && <> · {className(s.class)}</>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell">{s.gender}</td>
                    <td className="hidden sm:table-cell">{s.class ? className(s.class) : "—"}</td>
                    <td className="hidden text-gray-600 lg:table-cell">
                      {s.guardians[0] ? `${s.guardians[0].guardian.fullName} · ${s.guardians[0].guardian.phone}` : "—"}
                    </td>
                    <td>
                      <Badge color={s.status === "active" ? "green" : "gray"}>{s.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
