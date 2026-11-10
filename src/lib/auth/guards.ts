import "server-only";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, type CurrentUser } from "./session";
import { hasRole, type Role } from "./roles";

export class ForbiddenError extends Error {
  constructor(msg = "You do not have permission to do that.") {
    super(msg);
  }
}

/** For pages: redirect away if the user has none of the listed roles. */
export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!hasRole(user.roles, ...roles)) redirect("/forbidden");
  return user;
}

/** For server actions: throw if the user has none of the listed roles. */
export async function assertRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!hasRole(user.roles, ...roles)) throw new ForbiddenError();
  return user;
}

/** Admin, or the class teacher of this class. */
export async function canManageClass(user: CurrentUser, classId: number) {
  if (hasRole(user.roles, "admin")) return true;
  const c = await db.class.findUnique({ where: { id: classId }, select: { classTeacherId: true } });
  return c?.classTeacherId === user.id;
}

/** Class ids whose students this user may add / edit / delete (admin: all; teacher: classes they are class teacher of). */
export async function studentManagerClassIds(user: CurrentUser): Promise<number[] | "all"> {
  if (hasRole(user.roles, "admin")) return "all";
  if (!hasRole(user.roles, "teacher")) return [];
  const own = await db.class.findMany({ where: { classTeacherId: user.id }, select: { id: true } });
  return own.map((c) => c.id);
}

/** Can this user add/edit/delete a student in this class? (classId null = unassigned → admin only) */
export async function canManageStudentsIn(user: CurrentUser, classId: number | null | undefined) {
  const allowed = await studentManagerClassIds(user);
  if (allowed === "all") return true;
  return classId != null && allowed.includes(classId);
}

/** Can this user edit/delete this existing student? */
export async function canManageStudent(user: CurrentUser, studentId: number) {
  const s = await db.student.findUnique({ where: { id: studentId }, select: { classId: true } });
  return !!s && canManageStudentsIn(user, s.classId);
}

/** Admin, or the subject teacher assigned to this class-subject. */
export async function canEnterScores(user: CurrentUser, classSubjectId: number) {
  if (hasRole(user.roles, "admin")) return true;
  const cs = await db.classSubject.findUnique({ where: { id: classSubjectId }, select: { teacherId: true } });
  return cs?.teacherId === user.id;
}

/** Classes this user may take attendance for and write Qur'an progress / remarks for. */
export async function manageableClasses(user: CurrentUser) {
  const where = hasRole(user.roles, "admin") ? { active: true } : { active: true, classTeacherId: user.id };
  return db.class.findMany({ where, include: { classTeacher: true }, orderBy: { id: "asc" } });
}

/** Student ids a parent or student portal user may see. */
export async function portalStudentIds(user: CurrentUser): Promise<number[]> {
  const ids = new Set<number>();
  if (hasRole(user.roles, "student")) {
    const s = await db.student.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (s) ids.add(s.id);
  }
  if (hasRole(user.roles, "parent")) {
    const g = await db.guardian.findUnique({
      where: { userId: user.id },
      select: { students: { select: { studentId: true } } },
    });
    g?.students.forEach((s) => ids.add(s.studentId));
  }
  return [...ids];
}

export async function audit(userId: number, action: string, entity: string, entityId: string | number, details = "") {
  await db.auditLog.create({ data: { userId, action, entity, entityId: String(entityId), details } });
}
