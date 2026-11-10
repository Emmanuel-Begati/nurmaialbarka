import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hasRole } from "@/lib/auth/roles";
import type { CurrentUser } from "@/lib/auth/session";

/** Class ids a teacher is connected to (as class teacher or subject teacher). */
export async function teacherClassIds(userId: number) {
  const [asClassTeacher, asSubjectTeacher] = await Promise.all([
    db.class.findMany({ where: { classTeacherId: userId }, select: { id: true } }),
    db.classSubject.findMany({ where: { teacherId: userId }, select: { classId: true } }),
  ]);
  return [...new Set([...asClassTeacher.map((c) => c.id), ...asSubjectTeacher.map((c) => c.classId)])];
}

/**
 * Which students a staff user may view.
 * Admin & bursar: everyone. Teachers: only students in classes they teach.
 */
export async function studentScope(user: CurrentUser): Promise<Prisma.StudentWhereInput> {
  if (hasRole(user.roles, "admin", "bursar")) return {};
  if (hasRole(user.roles, "teacher")) return { classId: { in: await teacherClassIds(user.id) } };
  return { id: -1 };
}

export async function canViewStudent(user: CurrentUser, studentId: number) {
  const scope = await studentScope(user);
  return (await db.student.count({ where: { AND: [scope, { id: studentId }] } })) > 0;
}
