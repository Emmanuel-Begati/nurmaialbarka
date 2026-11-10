import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { className, studentName } from "@/lib/format";
import { Button, Card, Field, PageHeader } from "@/components/ui";
import { ConfirmDelete } from "@/components/confirm";
import { deleteClass, saveClassSubjects, updateClass } from "../actions";

export default async function ClassDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const id = Number((await params).id);
  const cls = await db.class.findUnique({
    where: { id },
    include: {
      classTeacher: true,
      subjects: true,
      students: { where: { status: "active" }, orderBy: [{ lastName: "asc" }] },
    },
  });
  if (!cls) notFound();
  const [teachers, subjects] = await Promise.all([
    db.user.findMany({ where: { roles: { contains: "teacher" }, active: true }, orderBy: { fullName: "asc" } }),
    db.subject.findMany({ orderBy: { name: "asc" } }),
  ]);
  const assigned = new Map(cls.subjects.map((s) => [s.subjectId, s]));

  const teacherOptions = (
    <>
      <option value="">— none —</option>
      {teachers.map((t) => (
        <option key={t.id} value={t.id}>
          {t.title} {t.fullName}
        </option>
      ))}
    </>
  );

  return (
    <>
      <PageHeader title={className(cls)} subtitle={`${cls.students.length} active students`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Subjects & subject teachers">
            <form action={saveClassSubjects.bind(null, cls.id)}>
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-10">On</th>
                    <th>Subject</th>
                    <th>Subject teacher</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s) => {
                    const cs = assigned.get(s.id);
                    return (
                      <tr key={s.id}>
                        <td>
                          <input type="checkbox" name={`on_${s.id}`} defaultChecked={!!cs} className="h-4 w-4 accent-brand-600" />
                        </td>
                        <td>{s.name}</td>
                        <td>
                          <select name={`t_${s.id}`} defaultValue={cs?.teacherId ?? ""} className="input py-1">
                            {teacherOptions}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="p-4">
                <Button>Save subjects</Button>
                <p className="mt-2 text-xs text-gray-500">A subject that already has scores entered won&apos;t be removed.</p>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Class settings">
            <form action={updateClass.bind(null, cls.id)} className="space-y-3 p-4">
              <Field label="Class teacher">
                <select name="classTeacherId" defaultValue={cls.classTeacherId ?? ""} className="input">
                  {teacherOptions}
                </select>
              </Field>
              <Field label="Custom label (optional)">
                <input name="labelOverride" defaultValue={cls.labelOverride ?? ""} className="input" />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="active" defaultChecked={cls.active} className="h-4 w-4 accent-brand-600" /> Active
              </label>
              <Button>Save</Button>
            </form>
            <form action={deleteClass.bind(null, cls.id)} className="border-t border-gray-100 p-4">
              <ConfirmDelete
                label="Delete class"
                warning={
                  <>
                    Delete <strong>{className(cls)}</strong>? Its {cls.students.length} student(s) are kept but become unassigned. Its registers,
                    scores and fee items are erased.
                  </>
                }
              />
            </form>
          </Card>
          <Card title="Students">
            <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto text-sm">
              {cls.students.map((s) => (
                <li key={s.id} className="px-4 py-1.5">
                  <Link href={`/students/${s.id}`} className="hover:text-brand-700">
                    {studentName(s)}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
