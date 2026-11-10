import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { allTerms, resolveTerm } from "@/lib/current";
import { className, formatNaira, termLabel } from "@/lib/format";
import { Button, Card, Empty, Field, FilterBar, PageHeader } from "@/components/ui";
import { addFeeItem, copyFeeItems, deleteFeeItem } from "../actions";

export default async function FeeItemsPage({ searchParams }: { searchParams: Promise<{ term?: string }> }) {
  await requireRole("admin", "bursar");
  const sp = await searchParams;
  const term = await resolveTerm(sp.term);
  const terms = await allTerms();
  if (!term) return <Empty>Create a term first.</Empty>;
  const [items, classes] = await Promise.all([
    db.feeItem.findMany({ where: { termId: term.id }, include: { class: { include: { classTeacher: true } } }, orderBy: [{ classId: "asc" }, { name: "asc" }] }),
    db.class.findMany({ where: { active: true }, include: { classTeacher: true } }),
  ]);

  const perClass = classes.map((c) => ({
    c,
    total: items.filter((i) => i.classId === null || i.classId === c.id).reduce((s, i) => s + i.amount, 0),
  }));

  return (
    <>
      <PageHeader title="Fee structure" subtitle={`What each class pays for ${termLabel(term)}`} />
      <FilterBar>
        <select name="term" defaultValue={term.id} className="input w-56">
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {termLabel(t)}
            </option>
          ))}
        </select>
      </FilterBar>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Fee items" className="lg:col-span-2">
          {items.length === 0 ? (
            <Empty>No fee items for this term yet. Add one, or copy from a previous term.</Empty>
          ) : (
            <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Applies to</th>
                  <th className="text-right">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.name}</td>
                    <td>{i.class ? className(i.class) : "All classes"}</td>
                    <td className="text-right">{formatNaira(i.amount)}</td>
                    <td className="text-right">
                      <form action={deleteFeeItem.bind(null, i.id)}>
                        <Button variant="ghost" className="py-1 text-xs text-red-600">
                          Remove
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
          <div className="border-t border-gray-100 p-4">
            <div className="mb-2 text-xs font-semibold uppercase text-gray-500">Total per student</div>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {perClass.map(({ c, total }) => (
                <li key={c.id} className="flex justify-between">
                  <span>{className(c)}</span>
                  <span className="font-medium">{formatNaira(total)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
        <div className="space-y-6">
          <Card title="Add fee item">
            <form action={addFeeItem} className="space-y-3 p-4">
              <input type="hidden" name="termId" value={term.id} />
              <Field label="Item name">
                <input name="name" required placeholder="e.g. Tuition, Books, Uniform" className="input" />
              </Field>
              <Field label="Applies to">
                <select name="classId" className="input">
                  <option value="">All classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {className(c)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Amount (₦)">
                <input name="amount" type="number" min={1} required className="input" />
              </Field>
              <Button>Add item</Button>
            </form>
          </Card>
          <Card title="Copy from another term">
            <form action={copyFeeItems} className="space-y-3 p-4">
              <input type="hidden" name="toTermId" value={term.id} />
              <select name="fromTermId" className="input">
                {terms
                  .filter((t) => t.id !== term.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {termLabel(t)}
                    </option>
                  ))}
              </select>
              <Button variant="secondary">Copy items into {termLabel(term)}</Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
