import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/roles";
import { className, toISODate } from "@/lib/format";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasRole(user.roles, "admin")) return new Response("Forbidden", { status: 403 });

  const students = await db.student.findMany({
    include: { class: { include: { classTeacher: true } }, guardians: { include: { guardian: true } } },
    orderBy: [{ lastName: "asc" }],
  });
  const rows = [
    ["Admission No", "Surname", "First name", "Other name", "Gender", "Date of birth", "Class", "Status", "Guardian", "Guardian phone", "Address"],
    ...students.map((s) => {
      const g = s.guardians.find((x) => x.isPrimary)?.guardian ?? s.guardians[0]?.guardian;
      return [
        s.admissionNo,
        s.lastName,
        s.firstName,
        s.otherName,
        s.gender,
        s.dateOfBirth ? toISODate(s.dateOfBirth) : "",
        s.class ? className(s.class) : "",
        s.status,
        g?.fullName,
        g?.phone,
        s.address,
      ];
    }),
  ];
  const csv = rows.map((r) => r.map(esc).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="students-${toISODate(new Date())}.csv"`,
    },
  });
}
