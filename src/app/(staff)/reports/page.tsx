import Link from "next/link";
import { db } from "@/lib/db";
import { manageableClasses, requireRole } from "@/lib/auth/guards";
import { hasRole } from "@/lib/auth/roles";
import { allTerms, resolveTerm } from "@/lib/current";
import { classResults } from "@/lib/report";
import { gradeFor, ordinal } from "@/lib/grading";
import { className, RATING_LABELS, studentName, termLabel } from "@/lib/format";
import { Alert, Badge, Button, Card, Empty, FilterBar, LinkButton, PageHeader } from "@/components/ui";
import { saveRemarks, setPublished } from "./actions";

function Rating({ name, value }: { name: string; value: number | null | undefined }) {
  return (
    <select name={name} defaultValue={value ?? ""} className="input w-24 py-1 text-xs">
      <option value="">—</option>
      {[5, 4, 3, 2, 1].map((n) => (
        <option key={n} value={n}>
          {RATING_LABELS[n]}
        </option>
      ))}
    </select>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; term?: string; tab?: string; saved?: string }>;
}) {
  const user = await requireRole("admin", "teacher");
  const sp = await searchParams;
  const term = await resolveTerm(sp.term);
  const terms = await allTerms();
  const classes = await manageableClasses(user);
  const isAdmin = hasRole(user.roles, "admin");

  if (!term) return <Empty>Create a term first.</Empty>;
  if (classes.length === 0)
    return (
      <>
        <PageHeader title="Report cards" />
        <Alert>Only class teachers and the admin manage report cards.</Alert>
      </>
    );

  const cls = classes.find((c) => c.id === Number(sp.class)) ?? classes[0];
  const tab = sp.tab === "remarks" ? "remarks" : "broadsheet";
  const [results, reports] = await Promise.all([
    classResults(cls.id, term.id),
    db.termReport.findMany({ where: { termId: term.id, student: { classId: cls.id } } }),
  ]);
  const reportMap = new Map(reports.map((r) => [r.studentId, r]));
  const publishedCount = results.rows.filter((r) => reportMap.get(r.student.id)?.published).length;
  const allPublished = publishedCount === results.rows.length && results.rows.length > 0;
  const qs = `class=${cls.id}&term=${term.id}`;

  return (
    <>
      <PageHeader
        title="Report cards"
        subtitle={
          <>
            {className(cls)} · {termLabel(term)} ·{" "}
            {allPublished ? <Badge color="green">Published</Badge> : <Badge color="amber">{publishedCount}/{results.rows.length} published</Badge>}
          </>
        }
        actions={
          <>
            <LinkButton href={`/print/report/${term.id}/class/${cls.id}`} variant="secondary">
              Print all cards
            </LinkButton>
            {isAdmin && (
              <form action={setPublished.bind(null, cls.id, term.id, !allPublished)}>
                <Button variant={allPublished ? "secondary" : "primary"}>{allPublished ? "Unpublish" : "Publish to parents"}</Button>
              </form>
            )}
          </>
        }
      />
      <FilterBar>
        <input type="hidden" name="tab" value={tab} />
        <select name="class" defaultValue={cls.id} className="input w-64">
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {className(c)}
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

      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {(["broadsheet", "remarks"] as const).map((t) => (
          <Link
            key={t}
            href={`/reports?${qs}&tab=${t}`}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500"}`}
          >
            {t === "broadsheet" ? "Broadsheet" : "Remarks & conduct"}
          </Link>
        ))}
      </div>
      {sp.saved && <Alert kind="success">Saved.</Alert>}

      {tab === "broadsheet" ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  {results.subjects.map((s) => (
                    <th key={s.id} className="text-center" title={s.subject.name}>
                      {s.subject.name.length > 10 ? s.subject.name.slice(0, 9) + "…" : s.subject.name}
                    </th>
                  ))}
                  <th className="text-right">Total</th>
                  <th className="text-right">Avg</th>
                  <th className="text-center">Grade</th>
                  <th className="text-right">Pos.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...results.rows]
                  .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
                  .map((r) => (
                    <tr key={r.student.id}>
                      <td className="whitespace-nowrap">{studentName(r.student)}</td>
                      {r.scores.map((sc, i) => (
                        <td key={i} className="text-center">
                          {sc ? sc.total : <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                      <td className="text-right font-medium">{r.total}</td>
                      <td className="text-right">{r.count ? r.average.toFixed(1) : "—"}</td>
                      <td className="text-center">{r.count ? gradeFor(r.average, results.bands).grade : "—"}</td>
                      <td className="text-right font-semibold">{r.position ? ordinal(r.position) : "—"}</td>
                      <td className="text-right">
                        <Link href={`/print/report/${term.id}/${r.student.id}`} className="text-xs font-medium text-brand-700 hover:underline">
                          Card
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <form key={`${cls.id}-${term.id}`} action={saveRemarks.bind(null, cls.id, term.id)}>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class teacher&apos;s remark</th>
                    {isAdmin && <th>Principal&apos;s remark</th>}
                    <th>Conduct</th>
                    <th>Punctuality</th>
                    <th>Neatness</th>
                  </tr>
                </thead>
                <tbody>
                  {results.rows.map(({ student: s }) => {
                    const r = reportMap.get(s.id);
                    const locked = !!r?.published && !isAdmin;
                    return (
                      <tr key={s.id}>
                        <td className="whitespace-nowrap">
                          {studentName(s)} {r?.published && <Badge color="blue">Published</Badge>}
                        </td>
                        <td>
                          <input name={`${s.id}_teacherRemark`} defaultValue={r?.teacherRemark} disabled={locked} className="input w-64 py-1 text-xs" />
                        </td>
                        {isAdmin && (
                          <td>
                            <input name={`${s.id}_principalRemark`} defaultValue={r?.principalRemark} className="input w-64 py-1 text-xs" />
                          </td>
                        )}
                        <td>
                          <Rating name={`${s.id}_conduct`} value={r?.conduct} />
                        </td>
                        <td>
                          <Rating name={`${s.id}_punctuality`} value={r?.punctuality} />
                        </td>
                        <td>
                          <Rating name={`${s.id}_neatness`} value={r?.neatness} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end p-4">
              <Button>Save remarks</Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}
