import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { canManageClass } from "@/lib/auth/guards";
import { reportCard } from "@/lib/report";
import { PrintBar } from "@/components/print-button";
import { ReportCard } from "@/components/report-card";

export default async function ClassReportCards({ params }: { params: Promise<{ termId: string; classId: string }> }) {
  const user = await requireRole("admin", "teacher");
  const p = await params;
  const classId = Number(p.classId);
  const termId = Number(p.termId);
  if (!(await canManageClass(user, classId))) redirect("/forbidden");

  const students = await db.student.findMany({ where: { classId, status: "active" }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], select: { id: true } });
  const cards = [];
  for (const s of students) {
    const d = await reportCard(s.id, termId);
    if (d) cards.push(d);
  }
  return (
    <>
      <PrintBar />
      {cards.map((d) => (
        <ReportCard key={d.student.id} d={d} />
      ))}
    </>
  );
}
