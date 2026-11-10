import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Deterministic pseudo-random so the demo data is the same every reset
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
const between = (lo: number, hi: number) => Math.round(lo + rand() * (hi - lo));
const iso = (d: Date) => d.toISOString().slice(0, 10);

const FIRST_M = ["Abdullahi", "Muhammad", "Umar", "Yusuf", "Ibrahim", "Aliyu", "Usman", "Bilal", "Hamza", "Zaid", "Sulaiman", "Idris", "Musa", "Haruna", "Khalid"];
const FIRST_F = ["Aisha", "Fatima", "Khadija", "Maryam", "Zainab", "Hafsat", "Ruqayya", "Safiya", "Hauwa", "Asma'u", "Sumayya", "Amina", "Halima", "Rahma", "Bilkisu"];
const LAST = ["Bello", "Abubakar", "Sani", "Lawal", "Garba", "Mustapha", "Adamu", "Yakubu", "Danjuma", "Salihu", "Olawale", "Adebayo", "Ogunleye", "Balogun", "Ishaq"];
const SURAHS = ["An-Naba", "An-Nazi'at", "Abasa", "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Mulk", "Yasin", "Al-Kahf"];

async function main() {
  // wipe (child tables first)
  await db.auditLog.deleteMany();
  await db.termReport.deleteMany();
  await db.quranProgress.deleteMany();
  await db.score.deleteMany();
  await db.payment.deleteMany();
  await db.feeItem.deleteMany();
  await db.attendance.deleteMany();
  await db.enrollment.deleteMany();
  await db.studentGuardian.deleteMany();
  await db.guardian.deleteMany();
  await db.student.deleteMany();
  await db.classSubject.deleteMany();
  await db.subject.deleteMany();
  await db.class.deleteMany();
  await db.schoolSettings.deleteMany();
  await db.term.deleteMany();
  await db.academicSession.deleteMany();
  await db.gradeBand.deleteMany();
  await db.assessmentComponent.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  // ----- Calendar -----
  const session = await db.academicSession.create({ data: { name: "2026/2027" } });
  const term1 = await db.term.create({
    data: { sessionId: session.id, number: 1, startDate: new Date("2026-09-14"), endDate: new Date("2026-12-18"), nextTermBegins: new Date("2027-01-11") },
  });
  await db.term.create({ data: { sessionId: session.id, number: 2, startDate: new Date("2027-01-11"), endDate: new Date("2027-04-09") } });
  await db.term.create({ data: { sessionId: session.id, number: 3, startDate: new Date("2027-04-26"), endDate: new Date("2027-07-23") } });

  await db.schoolSettings.create({
    data: {
      id: 1,
      name: "Nurul Qur'an Islamiyyah School",
      address: "12 Masjid Road, Ilorin, Kwara State",
      phone: "0803 000 0000",
      motto: "Knowledge, Character and the Qur'an",
      principalName: "Sheikh Abdulrahman Yusuf",
      currentTermId: term1.id,
    },
  });

  // ----- Grading -----
  await db.assessmentComponent.createMany({
    data: [
      { key: "ca1", label: "1st CA", maxScore: 20, order: 1 },
      { key: "ca2", label: "2nd CA", maxScore: 20, order: 2 },
      { key: "exam", label: "Exam", maxScore: 60, order: 3 },
    ],
  });
  await db.gradeBand.createMany({
    data: [
      { grade: "A", min: 70, max: 100, remark: "Excellent" },
      { grade: "B", min: 60, max: 69, remark: "Very Good" },
      { grade: "C", min: 50, max: 59, remark: "Good" },
      { grade: "D", min: 45, max: 49, remark: "Fair" },
      { grade: "E", min: 40, max: 44, remark: "Pass" },
      { grade: "F", min: 0, max: 39, remark: "Fail" },
    ],
  });

  // ----- Staff -----
  const admin = await db.user.create({
    data: { username: "admin@nurulquran.local", passwordHash: hash("admin123"), fullName: "Abdulrahman Yusuf", title: "Sheikh", roles: "admin" },
  });
  await db.user.create({
    data: { username: "bursar@nurulquran.local", passwordHash: hash("bursar123"), fullName: "Hajara Mohammed", title: "Mrs", roles: "bursar" },
  });
  const teacherData = [
    { username: "abdullahi@nurulquran.local", fullName: "Abdullahi Sani", title: "Ustadh" },
    { username: "khadija@nurulquran.local", fullName: "Khadija Bello", title: "Ustadha" },
    { username: "ismail@nurulquran.local", fullName: "Ismail Adewale", title: "Mallam" },
  ];
  const teachers = [];
  for (const t of teacherData) {
    teachers.push(await db.user.create({ data: { ...t, passwordHash: hash("teacher123"), roles: "teacher" } }));
  }
  // a subject-only teacher (not a class teacher)
  const arabicTeacher = await db.user.create({
    data: { username: "arabic@nurulquran.local", passwordHash: hash("teacher123"), fullName: "Ahmad Tijani", title: "Ustadh", roles: "teacher" },
  });

  // ----- Subjects & classes -----
  const subjectNames = ["Qur'an (Hifz)", "Tajweed", "Arabic Language", "Fiqh", "Hadith", "Tawheed", "Seerah", "Arabic Writing (Khatt)"];
  const subjects = [];
  for (const name of subjectNames) subjects.push(await db.subject.create({ data: { name } }));

  const classes = [];
  for (const t of teachers) {
    const c = await db.class.create({ data: { sessionId: session.id, classTeacherId: t.id } });
    classes.push(c);
    for (const s of subjects) {
      // class teacher teaches most subjects; Arabic subjects go to the Arabic teacher
      const teacherId = s.name.startsWith("Arabic") ? arabicTeacher.id : t.id;
      await db.classSubject.create({ data: { classId: c.id, subjectId: s.id, teacherId } });
    }
  }

  // ----- Fee items (per term) -----
  const tuitionByClass = [25000, 30000, 35000];
  for (let i = 0; i < classes.length; i++) {
    await db.feeItem.create({ data: { termId: term1.id, classId: classes[i].id, name: "Tuition", amount: tuitionByClass[i] } });
  }
  await db.feeItem.create({ data: { termId: term1.id, classId: null, name: "Books & Materials", amount: 7500 } });
  await db.feeItem.create({ data: { termId: term1.id, classId: null, name: "Development Levy", amount: 2500 } });

  // ----- Students & guardians -----
  const components = await db.assessmentComponent.findMany();
  const classSubjects = await db.classSubject.findMany();
  let admNo = 1;
  let receipt = 1;
  const schoolDays: string[] = [];
  for (let d = new Date("2026-10-19"); d <= new Date("2026-11-09"); d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) schoolDays.push(iso(d));
  }

  let firstParentLinked = false;
  for (let ci = 0; ci < classes.length; ci++) {
    const c = classes[ci];
    for (let i = 0; i < 10; i++) {
      const gender = rand() > 0.5 ? "M" : "F";
      const lastName = pick(LAST);
      const firstName = pick(gender === "M" ? FIRST_M : FIRST_F);
      const admissionNo = `NQ/2026/${String(admNo++).padStart(3, "0")}`;

      // first student gets a portal login (admission no + password)
      const studentUser =
        admNo === 2
          ? await db.user.create({ data: { username: admissionNo, passwordHash: hash("student123"), fullName: `${firstName} ${lastName}`, roles: "student" } })
          : null;

      const student = await db.student.create({
        data: {
          admissionNo,
          firstName,
          lastName,
          gender,
          dateOfBirth: new Date(2014 + ci, between(0, 11), between(1, 28)),
          address: `${between(1, 99)} ${pick(["Taiwo", "Unity", "Emir", "Gambari", "Offa"])} Road, Ilorin`,
          classId: c.id,
          userId: studentUser?.id,
        },
      });
      await db.enrollment.create({ data: { studentId: student.id, classId: c.id, sessionId: session.id } });

      // guardian (first one gets a parent login)
      let parentUserId: number | undefined;
      if (!firstParentLinked) {
        const pu = await db.user.create({
          data: { username: "parent@nurulquran.local", passwordHash: hash("parent123"), fullName: `Alhaji ${pick(FIRST_M)} ${lastName}`, roles: "parent" },
        });
        parentUserId = pu.id;
        firstParentLinked = true;
      }
      const guardian = await db.guardian.create({
        data: {
          fullName: `${gender === "M" ? "Alhaji" : "Hajiya"} ${pick(gender === "M" ? FIRST_M : FIRST_F)} ${lastName}`,
          relationship: pick(["Father", "Mother", "Uncle"]),
          phone: `080${between(10000000, 99999999)}`,
          userId: parentUserId,
        },
      });
      await db.studentGuardian.create({ data: { studentId: student.id, guardianId: guardian.id, isPrimary: true } });

      // attendance
      for (const date of schoolDays) {
        const r = rand();
        const status = r < 0.86 ? "present" : r < 0.93 ? "late" : r < 0.98 ? "absent" : "excused";
        await db.attendance.create({ data: { studentId: student.id, classId: c.id, date, status, markedById: teachers[ci].id } });
      }

      // payments: ~50% full, ~30% partial, ~20% nothing
      const expected = tuitionByClass[ci] + 7500 + 2500;
      const r = rand();
      const amounts = r < 0.5 ? [expected] : r < 0.8 ? [Math.round((expected * between(30, 70)) / 100 / 500) * 500] : [];
      for (const amount of amounts) {
        await db.payment.create({
          data: {
            receiptNo: `RCT/2026/${String(receipt++).padStart(5, "0")}`,
            studentId: student.id,
            termId: term1.id,
            amount,
            method: pick(["cash", "transfer", "pos"]),
            paidOn: new Date(`2026-09-${between(14, 30)}`),
            recordedById: admin.id,
          },
        });
      }

      // scores for term 1
      const ability = rand();
      for (const cs of classSubjects.filter((x) => x.classId === c.id)) {
        const comp: Record<string, number> = {};
        let total = 0;
        for (const k of components) {
          const v = Math.min(k.maxScore, Math.round(k.maxScore * (0.35 + ability * 0.5 + rand() * 0.2)));
          comp[k.key] = v;
          total += v;
        }
        await db.score.create({ data: { studentId: student.id, classSubjectId: cs.id, termId: term1.id, components: JSON.stringify(comp), total } });
      }

      // Qur'an progress
      const fromIdx = between(0, 8);
      await db.quranProgress.create({
        data: {
          studentId: student.id,
          termId: term1.id,
          memorisedFrom: `Surah ${SURAHS[fromIdx]}`,
          memorisedTo: `Surah ${SURAHS[fromIdx + between(2, 6)]}`,
          currentJuz: 30 - ci - between(0, 2),
          totalJuz: Math.round((ci + 1 + rand() * 3) * 2) / 2,
          hifzRating: between(2, 5),
          tajweedRating: between(2, 5),
          recitationRating: between(2, 5),
          remark: pick(["Masha Allah, keep it up.", "Good effort; revise daily.", "Needs more revision at home.", "Excellent memorisation."]),
        },
      });
    }
  }

  console.log("Seeded. Logins:");
  console.log("  admin@nurulquran.local / admin123");
  console.log("  bursar@nurulquran.local / bursar123");
  console.log("  abdullahi@nurulquran.local / teacher123  (class teacher)");
  console.log("  arabic@nurulquran.local / teacher123     (subject teacher)");
  console.log("  parent@nurulquran.local / parent123");
  console.log("  NQ/2026/001 / student123                 (student)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
