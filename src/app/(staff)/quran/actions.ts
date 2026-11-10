"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertRole, audit, ForbiddenError } from "@/lib/auth/guards";
import { quranClassIds } from "./access";

const rating = (v: FormDataEntryValue | null) => {
  const n = Number(v);
  return n >= 1 && n <= 5 ? n : null;
};

export async function saveQuranProgress(classId: number, termId: number, fd: FormData) {
  const user = await assertRole("admin", "teacher");
  if (!(await quranClassIds(user)).includes(classId)) throw new ForbiddenError();

  const students = await db.student.findMany({ where: { classId, status: "active" }, select: { id: true } });
  await db.$transaction(
    students.map((s) => {
      const f = (k: string) => fd.get(`${s.id}_${k}`);
      const currentJuz = Number(f("currentJuz"));
      const data = {
        memorisedFrom: String(f("from") ?? "").trim(),
        memorisedTo: String(f("to") ?? "").trim(),
        currentJuz: currentJuz >= 1 && currentJuz <= 30 ? currentJuz : null,
        totalJuz: Math.min(30, Math.max(0, Number(f("totalJuz")) || 0)),
        hifzRating: rating(f("hifz")),
        tajweedRating: rating(f("tajweed")),
        recitationRating: rating(f("recitation")),
        remark: String(f("remark") ?? "").trim().slice(0, 300),
      };
      return db.quranProgress.upsert({
        where: { studentId_termId: { studentId: s.id, termId } },
        create: { studentId: s.id, termId, ...data },
        update: data,
      });
    }),
  );
  await audit(user.id, "quran.save", "Class", classId, `term ${termId}`);
  redirect(`/quran?class=${classId}&term=${termId}&saved=1`);
}
