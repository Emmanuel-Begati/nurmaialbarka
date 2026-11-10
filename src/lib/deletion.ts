import "server-only";
import { db } from "@/lib/db";
import { deletePhotos } from "@/lib/photos";

/**
 * Permanently delete students and everything that belongs to them:
 * attendance, scores, Qur'an progress, report remarks, payments, enrollments,
 * their portal logins, and any guardian left with no other children.
 */
export async function deleteStudentsCascade(ids: number[]) {
  if (ids.length === 0) return 0;
  const students = await db.student.findMany({
    where: { id: { in: ids } },
    select: { id: true, userId: true, guardians: { select: { guardianId: true } } },
  });
  const studentIds = students.map((s) => s.id);
  const studentUserIds = students.map((s) => s.userId).filter((x): x is number => x !== null);
  const guardianIds = [...new Set(students.flatMap((s) => s.guardians.map((g) => g.guardianId)))];

  await db.$transaction([
    db.attendance.deleteMany({ where: { studentId: { in: studentIds } } }),
    db.score.deleteMany({ where: { studentId: { in: studentIds } } }),
    db.quranProgress.deleteMany({ where: { studentId: { in: studentIds } } }),
    db.termReport.deleteMany({ where: { studentId: { in: studentIds } } }),
    db.payment.deleteMany({ where: { studentId: { in: studentIds } } }),
    db.enrollment.deleteMany({ where: { studentId: { in: studentIds } } }),
    db.studentGuardian.deleteMany({ where: { studentId: { in: studentIds } } }),
    deletePhotos("student", studentIds),
    db.student.deleteMany({ where: { id: { in: studentIds } } }),
    db.user.deleteMany({ where: { id: { in: studentUserIds } } }),
  ]);

  // guardians who no longer have any child at the school
  const orphans = await db.guardian.findMany({
    where: { id: { in: guardianIds }, students: { none: {} } },
    select: { id: true, userId: true },
  });
  const orphanUserIds = orphans.map((g) => g.userId).filter((x): x is number => x !== null);
  await db.$transaction([
    db.guardian.deleteMany({ where: { id: { in: orphans.map((g) => g.id) } } }),
    // only remove logins that are purely parent accounts (never a staff member who is also a parent)
    db.user.deleteMany({ where: { id: { in: orphanUserIds }, roles: "parent" } }),
  ]);
  return studentIds.length;
}

/**
 * Permanently delete classes. Students in them are NOT deleted. They become "unassigned"
 * so they can be moved to another class. The class's attendance registers, subject
 * scores and fee items are removed.
 */
export async function deleteClassesCascade(ids: number[]) {
  if (ids.length === 0) return 0;
  await db.$transaction([
    db.student.updateMany({ where: { classId: { in: ids } }, data: { classId: null } }),
    db.attendance.deleteMany({ where: { classId: { in: ids } } }),
    db.enrollment.deleteMany({ where: { classId: { in: ids } } }),
    db.score.deleteMany({ where: { classSubject: { classId: { in: ids } } } }),
    db.classSubject.deleteMany({ where: { classId: { in: ids } } }),
    db.feeItem.deleteMany({ where: { classId: { in: ids } } }),
    db.class.deleteMany({ where: { id: { in: ids } } }),
  ]);
  return ids.length;
}

/**
 * Delete a staff account. Staff who have taken registers or recorded payments are
 * disabled instead, so the school's records keep showing who did what.
 */
export async function deleteStaffAccount(userId: number): Promise<"deleted" | "disabled"> {
  const u = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: { _count: { select: { attendanceMarked: true, paymentsRecorded: true, paymentsVoided: true } } },
  });
  const hasHistory = u._count.attendanceMarked + u._count.paymentsRecorded + u._count.paymentsVoided > 0;

  const unassign = [
    db.class.updateMany({ where: { classTeacherId: userId }, data: { classTeacherId: null } }),
    db.classSubject.updateMany({ where: { teacherId: userId }, data: { teacherId: null } }),
    db.session.deleteMany({ where: { userId } }),
  ];
  if (hasHistory) {
    await db.$transaction([...unassign, db.user.update({ where: { id: userId }, data: { active: false } })]);
    return "disabled";
  }
  await db.$transaction([
    ...unassign,
    db.guardian.updateMany({ where: { userId }, data: { userId: null } }),
    db.student.updateMany({ where: { userId }, data: { userId: null } }),
    deletePhotos("staff", [userId]),
    db.user.delete({ where: { id: userId } }),
  ]);
  return "deleted";
}
