"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertRole, audit, canManageClass, ForbiddenError } from "@/lib/auth/guards";
import { hasRole } from "@/lib/auth/roles";

const rating = (v: FormDataEntryValue | null) => {
  const n = Number(v);
  return n >= 1 && n <= 5 ? n : null;
};

/** Class teacher writes remarks/conduct; only admin can write the principal's remark. */
export async function saveRemarks(classId: number, termId: number, fd: FormData) {
  const user = await assertRole("admin", "teacher");
  if (!(await canManageClass(user, classId))) throw new ForbiddenError("Only the class teacher can write remarks.");
  const isAdmin = hasRole(user.roles, "admin");
  const students = await db.student.findMany({ where: { classId, status: "active" }, select: { id: true } });
  const existing = new Map(
    (await db.termReport.findMany({ where: { termId, studentId: { in: students.map((s) => s.id) } } })).map((r) => [r.studentId, r]),
  );

  const ops = [];
  for (const s of students) {
    const prev = existing.get(s.id);
    if (prev?.published && !isAdmin) continue; // locked after publishing
    const f = (k: string) => fd.get(`${s.id}_${k}`);
    const data = {
      teacherRemark: String(f("teacherRemark") ?? "").trim().slice(0, 300),
      conduct: rating(f("conduct")),
      punctuality: rating(f("punctuality")),
      neatness: rating(f("neatness")),
      ...(isAdmin ? { principalRemark: String(f("principalRemark") ?? "").trim().slice(0, 300) } : {}),
    };
    ops.push(
      db.termReport.upsert({
        where: { studentId_termId: { studentId: s.id, termId } },
        create: { studentId: s.id, termId, ...data },
        update: data,
      }),
    );
  }
  await db.$transaction(ops);
  await audit(user.id, "remarks.save", "Class", classId, `term ${termId}`);
  redirect(`/reports?class=${classId}&term=${termId}&tab=remarks&saved=1`);
}

/** Admin publishes (or un-publishes) report cards for a whole class. Published cards appear in the parent portal. */
export async function setPublished(classId: number, termId: number, published: boolean) {
  const user = await assertRole("admin");
  const students = await db.student.findMany({ where: { classId, status: "active" }, select: { id: true } });
  await db.$transaction(
    students.map((s) =>
      db.termReport.upsert({
        where: { studentId_termId: { studentId: s.id, termId } },
        create: { studentId: s.id, termId, published },
        update: { published },
      }),
    ),
  );
  await audit(user.id, published ? "reports.publish" : "reports.unpublish", "Class", classId, `term ${termId}`);
  redirect(`/reports?class=${classId}&term=${termId}`);
}
