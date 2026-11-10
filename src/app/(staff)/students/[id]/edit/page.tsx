import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { canManageStudent, requireRole } from "@/lib/auth/guards";
import { hasRole } from "@/lib/auth/roles";
import { placeableClasses } from "@/lib/student-classes";
import { studentName } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import StudentForm from "../../student-form";
import { updateStudent } from "../../actions";

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("admin", "teacher");
  const { id } = await params;
  const student = await db.student.findUnique({ where: { id: Number(id) } });
  if (!student) notFound();
  if (!(await canManageStudent(user, student.id))) redirect("/forbidden");
  const isAdmin = hasRole(user.roles, "admin");
  return (
    <>
      <PageHeader title={`Edit ${studentName(student)}`} subtitle={student.admissionNo} />
      <StudentForm
        action={updateStudent.bind(null, student.id)}
        student={student}
        classes={await placeableClasses(user)}
        classRequired={!isAdmin}
      />
    </>
  );
}
