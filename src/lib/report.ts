import "server-only";
import { db } from "@/lib/db";
import { gradeFor, parseComponents, rank } from "@/lib/grading";

/** Results for every active student in a class for a term: per-subject totals, averages and class positions. */
export async function classResults(classId: number, termId: number) {
  const [subjects, students, scores, bands] = await Promise.all([
    db.classSubject.findMany({ where: { classId }, include: { subject: true }, orderBy: { subject: { name: "asc" } } }),
    db.student.findMany({ where: { classId, status: "active" }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    db.score.findMany({ where: { termId, classSubject: { classId } } }),
    db.gradeBand.findMany({ orderBy: { min: "desc" } }),
  ]);

  const scoreMap = new Map(scores.map((s) => [`${s.studentId}|${s.classSubjectId}`, s]));
  const averages = new Map<number, number>();
  const rows = students.map((st) => {
    const subj = subjects.map((cs) => scoreMap.get(`${st.id}|${cs.id}`));
    const taken = subj.filter(Boolean);
    const total = taken.reduce((a, s) => a + s!.total, 0);
    const average = taken.length ? total / taken.length : 0;
    if (taken.length) averages.set(st.id, Math.round(average * 100) / 100);
    return { student: st, scores: subj, total, average, count: taken.length };
  });
  const positions = rank(averages);

  // per-subject positions & class averages
  const subjectStats = subjects.map((cs) => {
    const list = scores.filter((s) => s.classSubjectId === cs.id);
    return {
      cs,
      positions: rank(new Map(list.map((s) => [s.studentId, s.total]))),
      average: list.length ? list.reduce((a, s) => a + s.total, 0) / list.length : 0,
      highest: list.length ? Math.max(...list.map((s) => s.total)) : 0,
      lowest: list.length ? Math.min(...list.map((s) => s.total)) : 0,
    };
  });

  return { subjects, subjectStats, rows: rows.map((r) => ({ ...r, position: positions.get(r.student.id) })), bands, classSize: averages.size };
}

/** Everything needed to print one student's term report card. */
export async function reportCard(studentId: number, termId: number) {
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { class: { include: { classTeacher: true } }, guardians: { include: { guardian: true } } },
  });
  if (!student?.classId) return null;
  const term = await db.term.findUnique({ where: { id: termId }, include: { session: true } });
  if (!term) return null;

  const [results, components, quran, report, attendance, settings] = await Promise.all([
    classResults(student.classId, termId),
    db.assessmentComponent.findMany({ orderBy: { order: "asc" } }),
    db.quranProgress.findUnique({ where: { studentId_termId: { studentId, termId } } }),
    db.termReport.findUnique({ where: { studentId_termId: { studentId, termId } } }),
    db.attendance.findMany({
      where: {
        studentId,
        date: { gte: term.startDate.toISOString().slice(0, 10), lte: term.endDate.toISOString().slice(0, 10) },
      },
    }),
    db.schoolSettings.findUnique({ where: { id: 1 } }),
  ]);

  // "days school opened" = distinct dates the class register was taken this term
  const classDays = await db.attendance.findMany({
    where: {
      classId: student.classId,
      date: { gte: term.startDate.toISOString().slice(0, 10), lte: term.endDate.toISOString().slice(0, 10) },
    },
    select: { date: true },
    distinct: ["date"],
  });

  const row = results.rows.find((r) => r.student.id === studentId)!;
  const subjects = results.subjectStats
    .map((st, i) => {
      const sc = row.scores[i];
      if (!sc) return null;
      const g = gradeFor(sc.total, results.bands);
      return {
        name: st.cs.subject.name,
        components: parseComponents(sc.components),
        total: sc.total,
        grade: g.grade,
        remark: g.remark,
        position: st.positions.get(studentId),
        classAverage: st.average,
        highest: st.highest,
        lowest: st.lowest,
      };
    })
    .filter((x) => x !== null);

  return {
    student,
    term,
    settings,
    components,
    subjects,
    total: row.total,
    average: row.average,
    position: row.position,
    classSize: results.classSize,
    overallGrade: gradeFor(row.average, results.bands),
    quran,
    report,
    bands: results.bands,
    attendance: {
      opened: classDays.length,
      present: attendance.filter((a) => a.status === "present" || a.status === "late").length,
      absent: attendance.filter((a) => a.status === "absent").length,
    },
  };
}
