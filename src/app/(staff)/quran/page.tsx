import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { allTerms, resolveTerm } from "@/lib/current";
import { className, RATING_LABELS, studentName, termLabel } from "@/lib/format";
import { Alert, Button, Card, Empty, FilterBar, PageHeader } from "@/components/ui";
import { quranClassIds } from "./access";
import { saveQuranProgress } from "./actions";

function RatingSelect({ name, value }: { name: string; value: number | null | undefined }) {
  return (
    <select name={name} defaultValue={value ?? ""} className="input w-28 py-1 text-xs">
      <option value="">—</option>
      {[5, 4, 3, 2, 1].map((n) => (
        <option key={n} value={n}>
          {n} · {RATING_LABELS[n]}
        </option>
      ))}
    </select>
  );
}

export default async function QuranPage({ searchParams }: { searchParams: Promise<{ class?: string; term?: string; saved?: string }> }) {
  const user = await requireRole("admin", "teacher");
  const sp = await searchParams;
  const term = await resolveTerm(sp.term);
  const terms = await allTerms();
  const ids = await quranClassIds(user);
  const classes = await db.class.findMany({ where: { id: { in: ids } }, include: { classTeacher: true } });

  if (!term) return <Empty>Create a term first.</Empty>;
  if (classes.length === 0)
    return (
      <>
        <PageHeader title="Qur'an progress" />
        <Alert>You are not the class teacher or Qur&apos;an teacher of any class.</Alert>
      </>
    );

  const cls = classes.find((c) => c.id === Number(sp.class)) ?? classes[0];
  const [students, progress] = await Promise.all([
    db.student.findMany({ where: { classId: cls.id, status: "active" }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    db.quranProgress.findMany({ where: { termId: term.id, student: { classId: cls.id } } }),
  ]);
  const byStudent = new Map(progress.map((p) => [p.studentId, p]));

  return (
    <>
      <PageHeader title="Qur'an progress (Hifz)" subtitle={`${className(cls)} · ${termLabel(term)}`} />
      <FilterBar>
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
      {sp.saved && <Alert kind="success">Qur&apos;an progress saved.</Alert>}
      <Card>
        {students.length === 0 ? (
          <Empty>No students.</Empty>
        ) : (
          <form key={`${cls.id}-${term.id}`} action={saveQuranProgress.bind(null, cls.id, term.id)}>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Memorised from</th>
                    <th>Memorised to</th>
                    <th>Current juz</th>
                    <th>Total juz</th>
                    <th>Hifz</th>
                    <th>Tajweed</th>
                    <th>Recitation</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const p = byStudent.get(s.id);
                    return (
                      <tr key={s.id}>
                        <td className="whitespace-nowrap font-medium">{studentName(s)}</td>
                        <td>
                          <input name={`${s.id}_from`} defaultValue={p?.memorisedFrom} placeholder="Surah…" className="input w-36 py-1 text-xs" />
                        </td>
                        <td>
                          <input name={`${s.id}_to`} defaultValue={p?.memorisedTo} placeholder="Surah…" className="input w-36 py-1 text-xs" />
                        </td>
                        <td>
                          <input name={`${s.id}_currentJuz`} type="number" min={1} max={30} defaultValue={p?.currentJuz ?? ""} className="input w-16 py-1 text-xs" />
                        </td>
                        <td>
                          <input name={`${s.id}_totalJuz`} type="number" min={0} max={30} step="0.25" defaultValue={p?.totalJuz ?? ""} className="input w-20 py-1 text-xs" />
                        </td>
                        <td>
                          <RatingSelect name={`${s.id}_hifz`} value={p?.hifzRating} />
                        </td>
                        <td>
                          <RatingSelect name={`${s.id}_tajweed`} value={p?.tajweedRating} />
                        </td>
                        <td>
                          <RatingSelect name={`${s.id}_recitation`} value={p?.recitationRating} />
                        </td>
                        <td>
                          <input name={`${s.id}_remark`} defaultValue={p?.remark} className="input w-48 py-1 text-xs" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end p-4">
              <Button>Save Qur&apos;an progress</Button>
            </div>
          </form>
        )}
      </Card>
    </>
  );
}
