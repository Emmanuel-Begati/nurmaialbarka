"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole, audit } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import { getCurrentTerm } from "@/lib/current";
import { deleteClassesCascade } from "@/lib/deletion";

export async function deleteClass(id: number) {
  const user = await assertRole("admin");
  await deleteClassesCascade([id]);
  await audit(user.id, "class.delete", "Class", id);
  redirect("/classes?deleted=1");
}

export async function deleteClasses(fd: FormData) {
  const user = await assertRole("admin");
  const ids = fd.getAll("ids").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const n = await deleteClassesCascade(ids);
  await audit(user.id, "class.bulkDelete", "Class", "*", ids.join(", "));
  redirect(`/classes?deleted=${n}`);
}

const optInt = (v: FormDataEntryValue | null) => (v && String(v) !== "" ? Number(v) : null);

export async function createClass(fd: FormData) {
  const user = await assertRole("admin");
  const term = await getCurrentTerm();
  if (!term) throw new Error("Set up a session and term first (Settings).");
  const c = await db.class.create({
    data: {
      sessionId: term.sessionId,
      classTeacherId: optInt(fd.get("classTeacherId")),
      labelOverride: String(fd.get("labelOverride") ?? "").trim() || null,
    },
  });
  // attach every existing subject by default
  const subjects = await db.subject.findMany();
  await db.classSubject.createMany({
    data: subjects.map((s) => ({ classId: c.id, subjectId: s.id, teacherId: c.classTeacherId })),
  });
  await audit(user.id, "class.create", "Class", c.id);
  revalidatePath("/classes");
}

export async function updateClass(classId: number, fd: FormData) {
  const user = await assertRole("admin");
  await db.class.update({
    where: { id: classId },
    data: {
      classTeacherId: optInt(fd.get("classTeacherId")),
      labelOverride: String(fd.get("labelOverride") ?? "").trim() || null,
      active: fd.get("active") === "on",
    },
  });
  await audit(user.id, "class.update", "Class", classId);
  revalidatePath("/classes");
}

export async function saveClassSubjects(classId: number, fd: FormData) {
  await assertRole("admin");
  const subjects = await db.subject.findMany();
  for (const s of subjects) {
    const enabled = fd.get(`on_${s.id}`) === "on";
    const teacherId = optInt(fd.get(`t_${s.id}`));
    if (enabled) {
      await db.classSubject.upsert({
        where: { classId_subjectId: { classId, subjectId: s.id } },
        create: { classId, subjectId: s.id, teacherId },
        update: { teacherId },
      });
    } else {
      // only remove when no scores exist, to protect results
      const cs = await db.classSubject.findUnique({
        where: { classId_subjectId: { classId, subjectId: s.id } },
        include: { _count: { select: { scores: true } } },
      });
      if (cs && cs._count.scores === 0) await db.classSubject.delete({ where: { id: cs.id } });
    }
  }
  revalidatePath(`/classes/${classId}`);
}

export async function createSubject(fd: FormData) {
  await assertRole("admin");
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return;
  await db.subject.upsert({ where: { name }, create: { name, code: String(fd.get("code") ?? "") }, update: {} });
  revalidatePath("/classes");
}
