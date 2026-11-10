"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertRole, audit, canManageClass, ForbiddenError } from "@/lib/auth/guards";
import { hasRole } from "@/lib/auth/roles";
import { todayISO } from "@/lib/format";

const STATUSES = new Set(["present", "absent", "late", "excused"]);

export async function saveRegister(classId: number, date: string, fd: FormData) {
  const user = await assertRole("admin", "teacher");
  if (!(await canManageClass(user, classId))) throw new ForbiddenError("Only the class teacher can take this register.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");
  if (date > todayISO()) throw new Error("You cannot mark attendance for a future date.");

  // Teachers may only edit the last 7 days; admin can correct any date.
  if (!hasRole(user.roles, "admin")) {
    const limit = new Date();
    limit.setDate(limit.getDate() - 7);
    if (date < limit.toISOString().slice(0, 10)) throw new ForbiddenError("Registers older than 7 days can only be changed by an admin.");
  }

  const students = await db.student.findMany({ where: { classId, status: "active" }, select: { id: true } });
  await db.$transaction(
    students.map((s) => {
      const raw = String(fd.get(`s_${s.id}`) ?? "present");
      const status = STATUSES.has(raw) ? raw : "present";
      const remark = String(fd.get(`r_${s.id}`) ?? "").slice(0, 200);
      return db.attendance.upsert({
        where: { studentId_date: { studentId: s.id, date } },
        create: { studentId: s.id, classId, date, status, remark, markedById: user.id },
        update: { status, remark, classId, markedById: user.id, markedAt: new Date() },
      });
    }),
  );
  await audit(user.id, "attendance.save", "Class", classId, date);
  redirect(`/attendance?class=${classId}&date=${date}&saved=1`);
}
