import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { allTerms, resolveTerm } from "@/lib/current";
import { feeBalances } from "@/lib/fees";
import { className, formatNaira, studentName, termLabel } from "@/lib/format";
import { Card, Empty, FeeStatusBadge, FilterBar, LinkButton, PageHeader, Stat } from "@/components/ui";

export default async function FeesOverview({
  searchParams,
}: {
  searchParams: Promise<{ term?: string; class?: string; status?: string }>;
}) {
  await requireRole("admin", "bursar");
  const sp = await searchParams;
  const term = await resolveTerm(sp.term);
  if (!term) return <Empty>Create a session and term in Settings first.</Empty>;

  const [terms, classes, students, balances] = await Promise.all([
    allTerms(),
    db.class.findMany({ where: { active: true }, include: { classTeacher: true } }),
    db.student.findMany({
      where: { status: "active", ...(sp.class ? { classId: Number(sp.class) } : {}) },
      include: { class: { include: { classTeacher: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    feeBalances(term.id),
  ]);

  const rows = students
    .map((s) => ({ s, b: balances.get(s.id)! }))
    .filter((r) => r.b && (!sp.status || sp.status === "all" || r.b.status === sp.status || (sp.status === "debtors" && r.b.status !== "paid")));

  const totals = rows.reduce(
    (t, r) => ({ expected: t.expected + r.b.expected, paid: t.paid + Math.min(r.b.paid, r.b.expected), balance: t.balance + r.b.balance }),
    { expected: 0, paid: 0, balance: 0 },
  );
  const exportQs = new URLSearchParams({ term: String(term.id), ...(sp.class ? { class: sp.class } : {}), ...(sp.status ? { status: sp.status } : {}) });

  return (
    <>
      <PageHeader
        title="School fees"
        subtitle={termLabel(term)}
        actions={
          <>
            <LinkButton href={`/fees/export?${exportQs}`} prefetch={false} variant="secondary">
              Export CSV
            </LinkButton>
            <LinkButton href="/fees/record">Record payment</LinkButton>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Expected" value={formatNaira(totals.expected)} />
        <Stat label="Collected" value={formatNaira(totals.paid)} hint={totals.expected ? `${Math.round((totals.paid / totals.expected) * 100)}% collected` : undefined} />
        <Stat label="Outstanding" value={formatNaira(totals.balance)} />
      </div>
      <FilterBar>
        <select name="term" defaultValue={term.id} className="input w-56">
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {termLabel(t)}
            </option>
          ))}
        </select>
        <select name="class" defaultValue={sp.class ?? ""} className="input w-56">
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {className(c)}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={sp.status ?? "all"} className="input w-44">
          <option value="all">All statuses</option>
          <option value="debtors">Owing + Partial</option>
          <option value="owing">Owing (nothing paid)</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
      </FilterBar>
      <Card>
        {rows.length === 0 ? (
          <Empty>No students match.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th className="hidden md:table-cell">Class</th>
                  <th className="hidden text-right sm:table-cell">Expected</th>
                  <th className="hidden text-right sm:table-cell">Paid</th>
                  <th className="text-right">Balance</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ s, b }) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/students/${s.id}`} className="font-medium text-brand-700 hover:underline">
                        {studentName(s)}
                      </Link>
                      <div className="font-mono text-xs text-gray-400">{s.admissionNo}</div>
                    </td>
                    <td className="hidden md:table-cell">{s.class ? className(s.class) : "—"}</td>
                    <td className="hidden text-right sm:table-cell">{formatNaira(b.expected)}</td>
                    <td className="hidden text-right sm:table-cell">{formatNaira(b.paid)}</td>
                    <td className="text-right font-medium">{formatNaira(b.balance)}</td>
                    <td>
                      <FeeStatusBadge status={b.status} />
                    </td>
                    <td className="text-right">
                      {b.status !== "paid" && (
                        <Link href={`/fees/record?student=${s.id}&term=${term.id}`} className="text-xs font-medium text-brand-700 hover:underline">
                          Record payment
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
