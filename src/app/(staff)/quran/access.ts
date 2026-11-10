import "server-only";
import { db } from "@/lib/db";
import { hasRole } from "@/lib/auth/roles";
import type { CurrentUser } from "@/lib/auth/session";

/** Classes where the user may record Qur'an progress: admin = all, class teacher, or the Qur'an subject teacher. */
export async function quranClassIds(user: CurrentUser) {
  if (hasRole(user.roles, "admin")) return (await db.class.findMany({ where: { active: true }, select: { id: true } })).map((c) => c.id);
  const [own, quranSubjects] = await Promise.all([
    db.class.findMany({ where: { active: true, classTeacherId: user.id }, select: { id: true } }),
    db.classSubject.findMany({ where: { teacherId: user.id, subject: { name: { contains: "Qur" } } }, select: { classId: true } }),
  ]);
  return [...new Set([...own.map((c) => c.id), ...quranSubjects.map((c) => c.classId)])];
}
