import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { className } from "@/lib/format";
import { Alert, Badge, Button, Card, Field, PageHeader } from "@/components/ui";
import { BulkDeleteBar, ConfirmDelete, SelectAll } from "@/components/confirm";
import { createClass, createSubject, deleteClass, deleteClasses } from "./actions";

export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await requireRole("admin");
  const { deleted } = await searchParams;
  const [classes, teachers, subjects] = await Promise.all([
    db.class.findMany({
      include: {
        classTeacher: true,
        session: true,
        _count: { select: { students: { where: { status: "active" } }, subjects: true } },
      },
      orderBy: [{ active: "desc" }, { id: "asc" }],
    }),
    db.user.findMany({ where: { roles: { contains: "teacher" }, active: true }, orderBy: { fullName: "asc" } }),
    db.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="Classes" subtitle="Each class is named after its class teacher." />
      {deleted && (
        <Alert kind="success">
          {deleted} class{deleted === "1" ? "" : "es"} deleted. Their students are now unassigned. Give them a new class from Students.
        </Alert>
      )}
      <BulkDeleteBar
        formId="bulk-classes"
        action={deleteClasses}
        noun="class"
        warning="Students are kept but become unassigned. The classes' registers, scores and fee items are erased."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="All classes" className="lg:col-span-2">
          <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-10">
                  <SelectAll formId="bulk-classes" />
                </th>
                <th>Class</th>
                <th>Session</th>
                <th className="text-right">Students</th>
                <th className="text-right">Subjects</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id}>
                  <td>
                    <input type="checkbox" name="ids" value={c.id} form="bulk-classes" aria-label={`Select ${className(c)}`} className="h-4 w-4 accent-red-600" />
                  </td>
                  <td>
                    <Link href={`/classes/${c.id}`} className="font-medium text-brand-700 hover:underline">
                      {className(c)}
                    </Link>
                  </td>
                  <td>{c.session.name}</td>
                  <td className="text-right">{c._count.students}</td>
                  <td className="text-right">{c._count.subjects}</td>
                  <td>{c.active ? <Badge color="green">Active</Badge> : <Badge>Inactive</Badge>}</td>
                  <td className="text-right">
                    <form action={deleteClass.bind(null, c.id)}>
                      <ConfirmDelete
                        small
                        warning={
                          <>
                            Delete <strong>{className(c)}</strong>? Its {c._count.students} student(s) are kept but become unassigned.
                          </>
                        }
                      />
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="New class">
            <form action={createClass} className="space-y-3 p-4">
              <Field label="Class teacher" hint="The class will be named after this teacher.">
                <select name="classTeacherId" className="input" required>
                  <option value="">Select teacher…</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} {t.fullName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Custom label (optional)" hint="Use if one teacher has two classes, e.g. 'Ustadh Sani (Morning)'.">
                <input name="labelOverride" className="input" />
              </Field>
              <Button>Create class</Button>
            </form>
          </Card>

          <Card title="Subjects">
            <ul className="flex flex-wrap gap-1.5 p-4">
              {subjects.map((s) => (
                <Badge key={s.id}>{s.name}</Badge>
              ))}
            </ul>
            <form action={createSubject} className="flex gap-2 border-t border-gray-100 p-4">
              <input name="name" required placeholder="New subject name" className="input" />
              <Button variant="secondary" className="shrink-0">
                Add
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
