import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { hasRole } from "@/lib/auth/roles";
import { allTerms, resolveTerm } from "@/lib/current";
import { gradeFor, ordinal, parseComponents, rank } from "@/lib/grading";
import { className, studentName, termLabel } from "@/lib/format";
import { Alert, Badge, Button, Card, Empty, FilterBar, PageHeader } from "@/components/ui";
import { saveScores } from "./actions";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ cs?: string; term?: string; saved?: string; error?: string }>;
}) {
  const user = await requireRole("admin", "teacher");
  const sp = await searchParams;
  const term = await resolveTerm(sp.term);
  const terms = await allTerms();
  const isAdmin = hasRole(user.roles, "admin");

  const options = await db.classSubject.findMany({
    where: { ...(isAdmin ? {} : { teacherId: user.id }), class: { active: true } },
    include: { subject: true, class: { include: { classTeacher: true } } },
    orderBy: [{ classId: "asc" }, { subject: { name: "asc" } }],
  });

  if (!term) return <Empty>Create a term first.</Empty>;
  if (options.length === 0) {
    return (
      <>
        <PageHeader title="Score entry" />
        <Alert>You have not been assigned any subjects yet. Ask the admin to assign you in Classes.</Alert>
      </>
    );
  }

  const csId = Number(sp.cs ?? options[0].id);
  const cs = options.find((o) => o.id === csId) ?? options[0];

  const [components, bands, students, scores, reports] = await Promise.all([
    db.assessmentComponent.findMany({ orderBy: { order: "asc" } }),
    db.gradeBand.findMany({ orderBy: { min: "desc" } }),
    db.student.findMany({ where: { classId: cs.classId, status: "active" }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    db.score.findMany({ where: { classSubjectId: cs.id, termId: term.id } }),
    db.termReport.findMany({ where: { termId: term.id, published: true } }),
  ]);
  const byStudent = new Map(scores.map((s) => [s.studentId, s]));
  const positions = rank(new Map(scores.map((s) => [s.studentId, s.total])));
  const publishedIds = new Set(reports.map((r) => r.studentId));
  const maxTotal = components.reduce((s, c) => s + c.maxScore, 0);
  const avg = scores.length ? scores.reduce((s, x) => s + x.total, 0) / scores.length : 0;

  return (
    <>
      <PageHeader
        title="Score entry"
        subtitle={`${cs.subject.name} · ${className(cs.class)} · ${termLabel(term)}`}
      />
      <FilterBar>
        <select name="cs" defaultValue={cs.id} className="input w-80">
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {className(o.class)}: {o.subject.name}
            </option>
          ))}
        </select>
        <select name="term" defaultValue={term.id} className="input w-56">
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {termLabel(t)}
            </option>
          ))}
        </select>
      </FilterBar>

      {sp.saved && !sp.error && <Alert kind="success">Scores saved.</Alert>}
      {sp.error && <Alert kind="error">Some scores were skipped: {sp.error}</Alert>}

      <Card actions={<span className="text-xs text-gray-500">{scores.length ? `Class average: ${avg.toFixed(1)} / ${maxTotal}` : ""}</span>} title="Scores">
        {students.length === 0 ? (
          <Empty>No students in this class.</Empty>
        ) : (
          <form key={`${cs.id}-${term.id}`} action={saveScores.bind(null, cs.id, term.id)}>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    {components.map((c) => (
                      <th key={c.key} className="text-center">
                        {c.label}
                        <div className="font-normal normal-case text-gray-400">/{c.maxScore}</div>
                      </th>
                    ))}
                    <th className="text-right">Total</th>
                    <th className="text-center">Grade</th>
                    <th className="text-right">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
                    const sc = byStudent.get(s.id);
                    const comp = sc ? parseComponents(sc.components) : {};
                    const locked = publishedIds.has(s.id) && !isAdmin;
                    const g = sc ? gradeFor(sc.total, bands) : null;
                    return (
                      <tr key={s.id}>
                        <td className="text-gray-400">{i + 1}</td>
                        <td>
                          {studentName(s)} {publishedIds.has(s.id) && <Badge color="blue">Published</Badge>}
                        </td>
                        {components.map((c) => (
                          <td key={c.key} className="text-center">
                            <input
                              name={`${s.id}_${c.key}`}
                              type="number"
                              min={0}
                              max={c.maxScore}
                              step="0.5"
                              defaultValue={comp[c.key] ?? ""}
                              disabled={locked}
                              className="input mx-auto w-20 py-1 text-center"
                            />
                          </td>
                        ))}
                        <td className="text-right font-semibold">{sc ? sc.total : "—"}</td>
                        <td className="text-center">{g ? <span title={g.remark}>{g.grade}</span> : "—"}</td>
                        <td className="text-right">{positions.get(s.id) ? ordinal(positions.get(s.id)!) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-xs text-gray-500">Totals, grades and positions update when you save. Leave a row blank to clear it.</span>
              <Button>Save scores</Button>
            </div>
          </form>
        )}
      </Card>
    </>
  );
}
