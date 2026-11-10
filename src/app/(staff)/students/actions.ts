"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  assertRole,
  audit,
  canManageStudent,
  canManageStudentsIn,
  ForbiddenError,
  studentManagerClassIds,
} from "@/lib/auth/guards";
import type { CurrentUser } from "@/lib/auth/session";

/** Admin, or the class teacher of the student's class. Throws otherwise. */
async function assertStudentManager(studentId: number): Promise<CurrentUser> {
  const user = await assertRole("admin", "teacher");
  if (!(await canManageStudent(user, studentId))) throw new ForbiddenError("Only the admin or this student's class teacher can do that.");
  return user;
}
import { hashPassword } from "@/lib/auth/session";
import { getCurrentTerm } from "@/lib/current";
import { deleteStudentsCascade } from "@/lib/deletion";
import { applyPhotoFromForm, PhotoError } from "@/lib/photos";

/** Save the photo fields of a form; returns an error message instead of throwing for bad images. */
async function savePhoto(studentId: number, fd: FormData) {
  try {
    await applyPhotoFromForm("student", studentId, fd);
    return null;
  } catch (e) {
    if (e instanceof PhotoError) return e.message;
    throw e;
  }
}


const idsFrom = (fd: FormData) => fd.getAll("ids").map(Number).filter((n) => Number.isInteger(n) && n > 0);

export async function deleteStudent(id: number) {
  const user = await assertStudentManager(id);
  const s = await db.student.findUnique({ where: { id }, select: { admissionNo: true, firstName: true, lastName: true } });
  if (!s) redirect("/students");
  await deleteStudentsCascade([id]);
  await audit(user.id, "student.delete", "Student", id, `${s.admissionNo} ${s.lastName} ${s.firstName}`);
  redirect("/students?deleted=1");
}

export async function deleteStudents(fd: FormData) {
  const user = await assertRole("admin", "teacher");
  const allowed = await studentManagerClassIds(user);
  // teachers can only bulk-delete students in their own class(es); anything else is silently skipped
  const list = await db.student.findMany({
    where: { id: { in: idsFrom(fd) }, ...(allowed === "all" ? {} : { classId: { in: allowed } }) },
    select: { id: true, admissionNo: true },
  });
  const n = await deleteStudentsCascade(list.map((s) => s.id));
  await audit(user.id, "student.bulkDelete", "Student", "*", list.map((s) => s.admissionNo).join(", "));
  redirect(`/students?deleted=${n}`);
}

const studentSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Surname is required"),
  otherName: z.string().trim().default(""),
  gender: z.enum(["M", "F"]),
  dateOfBirth: z.string().optional(),
  address: z.string().trim().default(""),
  classId: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
  status: z.enum(["active", "graduated", "withdrawn"]).default("active"),
});

function parseStudent(fd: FormData) {
  return studentSchema.parse({
    firstName: fd.get("firstName"),
    lastName: fd.get("lastName"),
    otherName: fd.get("otherName") ?? "",
    gender: fd.get("gender"),
    dateOfBirth: fd.get("dateOfBirth") || undefined,
    address: fd.get("address") ?? "",
    classId: fd.get("classId") ?? "",
    status: fd.get("status") ?? "active",
  });
}

async function nextAdmissionNo() {
  const year = new Date().getFullYear();
  const prefix = `NQ/${year}/`;
  const last = await db.student.findFirst({
    where: { admissionNo: { startsWith: prefix } },
    orderBy: { admissionNo: "desc" },
    select: { admissionNo: true },
  });
  const n = last ? parseInt(last.admissionNo.slice(prefix.length), 10) + 1 : 1;
  return prefix + String(n).padStart(3, "0");
}

/** Prisma "unique constraint failed" */
const isUniqueError = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";

export async function createStudent(fd: FormData) {
  const user = await assertRole("admin", "teacher");
  const data = parseStudent(fd);
  if (!(await canManageStudentsIn(user, data.classId))) throw new ForbiddenError("You can only add students to your own class.");

  // Each admission form carries a one-time token. If the same form is submitted again
  // (double click, slow network, browser retry) we return the student already created.
  const formToken = String(fd.get("formToken") ?? "").trim() || null;
  if (formToken) {
    const existing = await db.student.findUnique({ where: { formToken }, select: { id: true } });
    if (existing) redirect(`/students/${existing.id}?created=1`);
  }

  let student;
  for (let attempt = 0; !student; attempt++) {
    try {
      student = await db.student.create({
        data: {
          ...data,
          formToken,
          admissionNo: await nextAdmissionNo(),
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        },
      });
    } catch (e) {
      if (!isUniqueError(e) || attempt >= 3) throw e;
      // a parallel duplicate of this same form won the race, so use its student
      if (formToken) {
        const existing = await db.student.findUnique({ where: { formToken }, select: { id: true } });
        if (existing) redirect(`/students/${existing.id}?created=1`);
      }
      // otherwise two different admissions picked the same admission number, so retry with the next one
    }
  }
  if (data.classId) {
    const term = await getCurrentTerm();
    if (term) {
      await db.enrollment.upsert({
        where: { studentId_sessionId: { studentId: student.id, sessionId: term.sessionId } },
        create: { studentId: student.id, classId: data.classId, sessionId: term.sessionId },
        update: { classId: data.classId },
      });
    }
  }

  // optional guardian
  const gName = String(fd.get("guardianName") ?? "").trim();
  if (gName) {
    const g = await db.guardian.create({
      data: {
        fullName: gName,
        relationship: String(fd.get("guardianRelationship") ?? "Parent"),
        phone: String(fd.get("guardianPhone") ?? ""),
        email: String(fd.get("guardianEmail") ?? ""),
      },
    });
    await db.studentGuardian.create({ data: { studentId: student.id, guardianId: g.id, isPrimary: true } });
  }
  // the student is already admitted at this point, so a bad photo only shows a warning
  const photoError = await savePhoto(student.id, fd);
  await audit(user.id, "student.create", "Student", student.id, student.admissionNo);
  redirect(`/students/${student.id}?created=1${photoError ? `&photoError=${encodeURIComponent(photoError)}` : ""}`);
}

export async function updateStudent(id: number, fd: FormData) {
  const user = await assertStudentManager(id);
  const data = parseStudent(fd);
  // a class teacher may edit their student but not move them into a class they don't run
  if (!(await canManageStudentsIn(user, data.classId))) throw new ForbiddenError("You can only place students in your own class.");
  await db.student.update({
    where: { id },
    data: { ...data, classId: data.classId ?? null, dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null },
  });
  if (data.classId) {
    const term = await getCurrentTerm();
    if (term) {
      await db.enrollment.upsert({
        where: { studentId_sessionId: { studentId: id, sessionId: term.sessionId } },
        create: { studentId: id, classId: data.classId, sessionId: term.sessionId },
        update: { classId: data.classId },
      });
    }
  }
  const photoError = await savePhoto(id, fd);
  await audit(user.id, "student.update", "Student", id);
  redirect(`/students/${id}?updated=1${photoError ? `&photoError=${encodeURIComponent(photoError)}` : ""}`);
}

/** Quick photo upload/removal from the student's profile page. */
export async function setStudentPhoto(studentId: number, fd: FormData) {
  const user = await assertStudentManager(studentId);
  const photoError = await savePhoto(studentId, fd);
  if (photoError) redirect(`/students/${studentId}?photoError=${encodeURIComponent(photoError)}`);
  await audit(user.id, "student.photo", "Student", studentId);
  revalidatePath(`/students/${studentId}`);
}

export async function addGuardian(studentId: number, fd: FormData) {
  await assertStudentManager(studentId);
  const fullName = String(fd.get("fullName") ?? "").trim();
  if (!fullName) return;
  const g = await db.guardian.create({
    data: {
      fullName,
      relationship: String(fd.get("relationship") ?? "Parent"),
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? "").trim().toLowerCase(),
      address: String(fd.get("address") ?? ""),
    },
  });
  const hasPrimary = await db.studentGuardian.count({ where: { studentId, isPrimary: true } });
  await db.studentGuardian.create({ data: { studentId, guardianId: g.id, isPrimary: hasPrimary === 0 } });
  revalidatePath(`/students/${studentId}`);
}

/** Link an existing guardian (e.g. a sibling's parent) by phone number. */
export async function linkGuardianByPhone(studentId: number, fd: FormData) {
  await assertStudentManager(studentId);
  const phone = String(fd.get("phone") ?? "").trim();
  const g = await db.guardian.findFirst({ where: { phone } });
  if (!g) return;
  await db.studentGuardian.upsert({
    where: { studentId_guardianId: { studentId, guardianId: g.id } },
    create: { studentId, guardianId: g.id },
    update: {},
  });
  revalidatePath(`/students/${studentId}`);
}

export async function removeGuardian(studentId: number, guardianId: number) {
  await assertStudentManager(studentId);
  await db.studentGuardian.delete({ where: { studentId_guardianId: { studentId, guardianId } } });
  revalidatePath(`/students/${studentId}`);
}

/** Create or reset a parent portal login for a guardian. Username = guardian email. */
export async function setGuardianLogin(studentId: number, guardianId: number, fd: FormData) {
  const user = await assertRole("admin");
  const password = String(fd.get("password") ?? "");
  const g = await db.guardian.findUniqueOrThrow({ where: { id: guardianId } });
  const username = (String(fd.get("email") ?? "") || g.email).trim().toLowerCase();
  if (!username || password.length < 6) return;
  const passwordHash = await hashPassword(password);
  if (g.userId) {
    await db.user.update({ where: { id: g.userId }, data: { username, passwordHash, active: true } });
  } else {
    const u = await db.user.create({ data: { username, passwordHash, fullName: g.fullName, roles: "parent" } });
    await db.guardian.update({ where: { id: g.id }, data: { userId: u.id, email: username } });
  }
  await audit(user.id, "guardian.login", "Guardian", guardianId);
  revalidatePath(`/students/${studentId}`);
}

/** Create or reset a student portal login. Username = admission number. */
export async function setStudentLogin(studentId: number, fd: FormData) {
  const user = await assertRole("admin");
  const password = String(fd.get("password") ?? "");
  if (password.length < 6) return;
  const s = await db.student.findUniqueOrThrow({ where: { id: studentId } });
  const passwordHash = await hashPassword(password);
  if (s.userId) {
    await db.user.update({ where: { id: s.userId }, data: { passwordHash, active: true } });
  } else {
    const u = await db.user.create({
      data: { username: s.admissionNo, passwordHash, fullName: `${s.firstName} ${s.lastName}`, roles: "student" },
    });
    await db.student.update({ where: { id: s.id }, data: { userId: u.id } });
  }
  await audit(user.id, "student.login", "Student", studentId);
  revalidatePath(`/students/${studentId}`);
}
