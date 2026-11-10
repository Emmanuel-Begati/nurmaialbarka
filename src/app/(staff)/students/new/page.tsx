import { requireRole } from "@/lib/auth/guards";
import { hasRole } from "@/lib/auth/roles";
import { placeableClasses } from "@/lib/student-classes";
import { Alert, PageHeader } from "@/components/ui";
import StudentForm from "../student-form";
import { createStudent } from "../actions";

export default async function NewStudentPage() {
  const user = await requireRole("admin", "teacher");
  const isAdmin = hasRole(user.roles, "admin");
  const classes = await placeableClasses(user);

  if (!isAdmin && classes.length === 0) {
    return (
      <>
        <PageHeader title="Admit a new student" />
        <Alert>Only class teachers can add students, and you are not the class teacher of any class. Ask the admin to assign you one.</Alert>
      </>
    );
  }
  return (
    <>
      <PageHeader title="Admit a new student" subtitle="An admission number is generated automatically." />
      <StudentForm action={createStudent} withGuardian classes={classes} classRequired={!isAdmin} />
    </>
  );
}
