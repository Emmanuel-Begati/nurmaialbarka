import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { portalStudentIds } from "@/lib/auth/guards";
import { canViewStudent } from "@/lib/scope";
import { reportCard } from "@/lib/report";
import { PrintBar } from "@/components/print-button";
import { ReportCard } from "@/components/report-card";

export default async function ReportCardPage({ params }: { params: Promise<{ termId: string; studentId: string }> }) {
  const user = await requireUser();
  const p = await params;
  const termId = Number(p.termId);
  const studentId = Number(p.studentId);

  if (isStaff(user.roles)) {
    if (!(await canViewStudent(user, studentId))) redirect("/forbidden");
  } else {
    // parents/students: own children only, and only after the school publishes results
    if (!(await portalStudentIds(user)).includes(studentId)) redirect("/forbidden");
    const tr = await db.termReport.findUnique({ where: { studentId_termId: { studentId, termId } } });
    if (!tr?.published) redirect("/portal?notice=unpublished");
  }

  const d = await reportCard(studentId, termId);
  if (!d) notFound();
  return (
    <>
      <PrintBar />
      <ReportCard d={d} />
    </>
  );
}
