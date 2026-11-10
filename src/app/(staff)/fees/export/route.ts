import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { canSeeFees } from "@/lib/auth/roles";
import { feeBalances } from "@/lib/fees";
import { className, studentName } from "@/lib/format";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !canSeeFees(user.roles)) return new Response("Forbidden", { status: 403 });
  const url = new URL(req.url);
  const termId = Number(url.searchParams.get("term"));
  const classId = url.searchParams.get("class");
  const status = url.searchParams.get("status");
  if (!termId) return new Response("term required", { status: 400 });

  const [students, balances] = await Promise.all([
    db.student.findMany({
      where: { status: "active", ...(classId ? { classId: Number(classId) } : {}) },
      include: { class: { include: { classTeacher: true } }, guardians: { include: { guardian: true }, where: { isPrimary: true } } },
      orderBy: [{ lastName: "asc" }],
    }),
    feeBalances(termId),
  ]);
  const rows = [["Admission No", "Student", "Class", "Guardian phone", "Expected", "Paid", "Balance", "Status"]];
  for (const s of students) {
    const b = balances.get(s.id);
    if (!b) continue;
    if (status && status !== "all" && !(status === b.status || (status === "debtors" && b.status !== "paid"))) continue;
    rows.push([
      s.admissionNo,
      studentName(s),
      s.class ? className(s.class) : "",
      s.guardians[0]?.guardian.phone ?? "",
      String(b.expected),
      String(b.paid),
      String(b.balance),
      b.status,
    ]);
  }
  return new Response(rows.map((r) => r.map(esc).join(",")).join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="fees-term-${termId}.csv"` },
  });
}
