// Removes all students and everything that belongs to them (attendance, scores,
// Qur'an progress, term reports, payments, guardians, student/parent logins).
// Keeps staff, classes, subjects, fee structure, grading and settings.
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const portalUsers = await db.user.findMany({
  where: { OR: [{ student: { isNot: null } }, { guardian: { isNot: null } }] },
  select: { id: true },
});
const portalIds = portalUsers.map((u) => u.id);

const r = await db.$transaction([
  db.attendance.deleteMany(),
  db.score.deleteMany(),
  db.quranProgress.deleteMany(),
  db.termReport.deleteMany(),
  db.payment.deleteMany(),
  db.enrollment.deleteMany(),
  db.studentGuardian.deleteMany(),
  db.guardian.deleteMany(),
  db.student.deleteMany(),
  db.session.deleteMany({ where: { userId: { in: portalIds } } }),
  db.auditLog.deleteMany({ where: { userId: { in: portalIds } } }),
  db.user.deleteMany({ where: { id: { in: portalIds } } }),
]);
const names = ["attendance", "scores", "quranProgress", "termReports", "payments", "enrollments", "studentGuardians", "guardians", "students", "sessions", "auditLogs", "portalUsers"];
names.forEach((n, i) => console.log(`${n.padEnd(18)} deleted ${r[i].count}`));
console.log("remaining staff:", await db.user.count(), "| classes:", await db.class.count(), "| fee items:", await db.feeItem.count());
await db.$disconnect();
