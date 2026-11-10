import { randomUUID } from "crypto";
import type { Student } from "@prisma/client";
import { className, toISODate } from "@/lib/format";
import { Button, Card, Field, LinkButton } from "@/components/ui";
import { PhotoInput } from "@/components/photo-input";
import { photoUrl } from "@/lib/photo-url";

type ClassOption = { id: number; labelOverride: string | null; classTeacher: { title: string; fullName: string } | null };

export default function StudentForm({
  action,
  student,
  withGuardian,
  classes,
  classRequired,
}: {
  action: (fd: FormData) => Promise<void>;
  student?: Student;
  withGuardian?: boolean;
  /** Only the classes this user may place students in. */
  classes: ClassOption[];
  /** Teachers must pick one of their classes; admin may leave a student unassigned. */
  classRequired?: boolean;
}) {
  return (
    <form action={action} className="space-y-6">
      {/* one-time token: lets the server ignore a repeated submit of this same form */}
      {!student && <input type="hidden" name="formToken" value={randomUUID()} />}
      <Card title="Student details">
        <div className="border-b border-gray-100 p-4">
          <span className="label mb-2 block">Passport photo (optional)</span>
          <PhotoInput
            name={student ? `${student.firstName} ${student.lastName}` : "New student"}
            currentUrl={student ? photoUrl("student", student.id, student.photoAt) : null}
          />
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <Field label="Surname">
            <input name="lastName" required defaultValue={student?.lastName} className="input" />
          </Field>
          <Field label="First name">
            <input name="firstName" required defaultValue={student?.firstName} className="input" />
          </Field>
          <Field label="Other name">
            <input name="otherName" defaultValue={student?.otherName} className="input" />
          </Field>
          <Field label="Gender">
            <select name="gender" required defaultValue={student?.gender ?? ""} className="input">
              <option value="" disabled>
                Select…
              </option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </Field>
          <Field label="Date of birth">
            <input
              type="date"
              name="dateOfBirth"
              defaultValue={student?.dateOfBirth ? toISODate(student.dateOfBirth) : ""}
              className="input"
            />
          </Field>
          <Field label="Class">
            <select
              name="classId"
              required={classRequired}
              defaultValue={student?.classId ?? (classRequired && classes.length === 1 ? classes[0].id : "")}
              className="input"
            >
              <option value="" disabled={classRequired}>
                {classRequired ? "Select class…" : "Not assigned"}
              </option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {className(c)}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Home address">
              <input name="address" defaultValue={student?.address} className="input" />
            </Field>
          </div>
          {student && (
            <Field label="Status">
              <select name="status" defaultValue={student.status} className="input">
                <option value="active">Active</option>
                <option value="graduated">Graduated</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </Field>
          )}
        </div>
      </Card>

      {withGuardian && (
        <Card title="Parent / guardian (optional)">
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Field label="Full name">
              <input name="guardianName" className="input" />
            </Field>
            <Field label="Relationship">
              <select name="guardianRelationship" className="input">
                <option>Father</option>
                <option>Mother</option>
                <option>Guardian</option>
                <option>Uncle</option>
                <option>Aunt</option>
              </select>
            </Field>
            <Field label="Phone">
              <input name="guardianPhone" className="input" />
            </Field>
            <Field label="Email">
              <input name="guardianEmail" type="email" className="input" />
            </Field>
          </div>
        </Card>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <LinkButton href={student ? `/students/${student.id}` : "/students"} variant="secondary">
          Cancel
        </LinkButton>
        <Button type="submit" pendingText={student ? "Saving…" : "Admitting student…"}>
          {student ? "Save changes" : "Admit student"}
        </Button>
      </div>
    </form>
  );
}
