"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertRole, audit } from "@/lib/auth/guards";
import { applyPhotoFromForm, PhotoError } from "@/lib/photos";
import { PROPRIETOR_PHOTO_ID } from "@/lib/public-site";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const back = (msg: string, kind: "saved" | "error" = "saved") => redirect(`/settings?${kind}=${encodeURIComponent(msg)}`);

export async function saveSchool(fd: FormData) {
  const me = await assertRole("admin");
  await db.schoolSettings.upsert({
    where: { id: 1 },
    create: { id: 1, name: s(fd, "name"), address: s(fd, "address"), phone: s(fd, "phone"), motto: s(fd, "motto"), principalName: s(fd, "principalName") },
    update: { name: s(fd, "name"), address: s(fd, "address"), phone: s(fd, "phone"), motto: s(fd, "motto"), principalName: s(fd, "principalName") },
  });
  await audit(me.id, "settings.school", "SchoolSettings", 1);
  back("School details saved.");
}

const SITE_FIELDS = ["tagline", "aboutText", "principalMessage", "programmeText", "admissionsText", "feesText", "email", "officeHours"] as const;

/** Wording of the public website ("/"). Empty fields fall back to the default text. */
export async function savePublicSite(fd: FormData) {
  const me = await assertRole("admin");
  // keep line breaks in the long texts, only trim the ends
  const data = Object.fromEntries(SITE_FIELDS.map((k) => [k, String(fd.get(k) ?? "").replace(/\r\n/g, "\n").trim()])) as Record<(typeof SITE_FIELDS)[number], string>;
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) back("The website email address is not valid.", "error");
  const showStaffPublicly = fd.get("showStaffPublicly") === "on";
  await db.schoolSettings.update({ where: { id: 1 }, data: { ...data, showStaffPublicly } });
  try {
    await applyPhotoFromForm("site", PROPRIETOR_PHOTO_ID, fd);
  } catch (e) {
    if (e instanceof PhotoError) back(`Text saved, but the proprietor's photo was not: ${e.message}`, "error");
    throw e;
  }
  await audit(me.id, "settings.website", "SchoolSettings", 1);
  revalidatePath("/");
  back("Public website updated.");
}

export async function setCurrentTerm(fd: FormData) {
  const me = await assertRole("admin");
  const termId = Number(fd.get("termId"));
  await db.schoolSettings.update({ where: { id: 1 }, data: { currentTermId: termId } });
  await audit(me.id, "settings.currentTerm", "Term", termId);
  back("Current term updated.");
}

export async function createSession(fd: FormData) {
  const me = await assertRole("admin");
  const name = s(fd, "name");
  if (!/^\d{4}\/\d{4}$/.test(name)) back("Session name must look like 2027/2028.", "error");
  if (await db.academicSession.findUnique({ where: { name } })) back("That session already exists.", "error");
  const startYear = Number(name.slice(0, 4));
  const session = await db.academicSession.create({
    data: {
      name,
      terms: {
        create: [
          { number: 1, startDate: new Date(`${startYear}-09-14`), endDate: new Date(`${startYear}-12-18`) },
          { number: 2, startDate: new Date(`${startYear + 1}-01-11`), endDate: new Date(`${startYear + 1}-04-09`) },
          { number: 3, startDate: new Date(`${startYear + 1}-04-26`), endDate: new Date(`${startYear + 1}-07-23`) },
        ],
      },
    },
  });
  await audit(me.id, "session.create", "AcademicSession", session.id, name);
  back(`Session ${name} created with three terms. Adjust the dates below.`);
}

export async function updateTerm(termId: number, fd: FormData) {
  await assertRole("admin");
  const start = s(fd, "startDate");
  const end = s(fd, "endDate");
  const next = s(fd, "nextTermBegins");
  if (!start || !end || end < start) back("End date must be after start date.", "error");
  await db.term.update({
    where: { id: termId },
    data: { startDate: new Date(start), endDate: new Date(end), nextTermBegins: next ? new Date(next) : null },
  });
  revalidatePath("/settings");
}

export async function saveGrading(fd: FormData) {
  const me = await assertRole("admin");
  const comps = await db.assessmentComponent.findMany();
  const newMax = comps.map((c) => ({ id: c.id, label: s(fd, `c_label_${c.id}`) || c.label, maxScore: Number(fd.get(`c_max_${c.id}`)) }));
  const total = newMax.reduce((a, c) => a + c.maxScore, 0);
  if (total !== 100) back(`Assessment maximums must add up to 100 (currently ${total}).`, "error");

  const bands = await db.gradeBand.findMany();
  await db.$transaction([
    ...newMax.map((c) => db.assessmentComponent.update({ where: { id: c.id }, data: { label: c.label, maxScore: c.maxScore } })),
    ...bands.map((b) =>
      db.gradeBand.update({
        where: { id: b.id },
        data: { min: Number(fd.get(`b_min_${b.id}`)), max: Number(fd.get(`b_max_${b.id}`)), remark: s(fd, `b_remark_${b.id}`) || b.remark },
      }),
    ),
  ]);
  await audit(me.id, "settings.grading", "GradeBand", "*");
  back("Grading settings saved.");
}

/**
 * End-of-session promotion: move all active students from one class into another class
 * (usually in the new session), or mark them as graduated.
 */
export async function promoteClass(fd: FormData) {
  const me = await assertRole("admin");
  const fromClassId = Number(fd.get("fromClassId"));
  const to = s(fd, "toClassId");
  const students = await db.student.findMany({ where: { classId: fromClassId, status: "active" }, select: { id: true } });
  if (students.length === 0) back("That class has no active students.", "error");

  if (to === "graduate") {
    await db.student.updateMany({ where: { id: { in: students.map((x) => x.id) } }, data: { status: "graduated", classId: null } });
    await audit(me.id, "promotion.graduate", "Class", fromClassId, `${students.length} students`);
    back(`${students.length} students marked as graduated.`);
  }
  const toClass = await db.class.findUniqueOrThrow({ where: { id: Number(to) } });
  await db.$transaction([
    db.student.updateMany({ where: { id: { in: students.map((x) => x.id) } }, data: { classId: toClass.id } }),
    ...students.map((st) =>
      db.enrollment.upsert({
        where: { studentId_sessionId: { studentId: st.id, sessionId: toClass.sessionId } },
        create: { studentId: st.id, classId: toClass.id, sessionId: toClass.sessionId },
        update: { classId: toClass.id },
      }),
    ),
  ]);
  await audit(me.id, "promotion.move", "Class", fromClassId, `to ${toClass.id}: ${students.length} students`);
  back(`${students.length} students moved.`);
}
