"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertRole, audit, canEnterScores, ForbiddenError } from "@/lib/auth/guards";

export async function saveScores(classSubjectId: number, termId: number, fd: FormData) {
  const user = await assertRole("admin", "teacher");
  if (!(await canEnterScores(user, classSubjectId))) throw new ForbiddenError("You are not the teacher of this subject.");

  // published reports are locked for teachers
  const cs = await db.classSubject.findUniqueOrThrow({ where: { id: classSubjectId } });
  const [components, students] = await Promise.all([
    db.assessmentComponent.findMany({ orderBy: { order: "asc" } }),
    db.student.findMany({ where: { classId: cs.classId, status: "active" }, select: { id: true } }),
  ]);
  const published = new Set(
    (await db.termReport.findMany({ where: { termId, published: true, studentId: { in: students.map((s) => s.id) } }, select: { studentId: true } })).map(
      (r) => r.studentId,
    ),
  );
  const isAdmin = user.roles.includes("admin");

  const errors: string[] = [];
  const ops = [];
  for (const s of students) {
    if (published.has(s.id) && !isAdmin) continue;
    const comp: Record<string, number> = {};
    let any = false;
    for (const c of components) {
      const raw = String(fd.get(`${s.id}_${c.key}`) ?? "").trim();
      if (raw === "") continue;
      const v = Number(raw);
      if (Number.isNaN(v) || v < 0 || v > c.maxScore) {
        errors.push(`${c.label} must be between 0 and ${c.maxScore}`);
        continue;
      }
      comp[c.key] = v;
      any = true;
    }
    if (!any) {
      ops.push(db.score.deleteMany({ where: { studentId: s.id, classSubjectId, termId } }));
      continue;
    }
    const total = Object.values(comp).reduce((a, b) => a + b, 0);
    ops.push(
      db.score.upsert({
        where: { studentId_classSubjectId_termId: { studentId: s.id, classSubjectId, termId } },
        create: { studentId: s.id, classSubjectId, termId, components: JSON.stringify(comp), total },
        update: { components: JSON.stringify(comp), total },
      }),
    );
  }
  await db.$transaction(ops);
  await audit(user.id, "scores.save", "ClassSubject", classSubjectId, `term ${termId}`);
  const err = errors.length ? `&error=${encodeURIComponent([...new Set(errors)].join("; "))}` : "";
  redirect(`/results?cs=${classSubjectId}&term=${termId}&saved=1${err}`);
}
