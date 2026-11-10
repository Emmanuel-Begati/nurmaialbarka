import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { allTerms, resolveTerm } from "@/lib/current";
import { formatDate, formatNaira, studentName, termLabel } from "@/lib/format";
import { Badge, Button, Card, Empty, FilterBar, PageHeader } from "@/components/ui";
import { voidPayment } from "../actions";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ term?: string; q?: string }> }) {
  await requireRole("admin", "bursar");
  const sp = await searchParams;
  const term = await resolveTerm(sp.term);
  const terms = await allTerms();
  const q = sp.q?.trim();
  const payments = term
    ? await db.payment.findMany({
        where: {
          termId: term.id,
          ...(q
            ? { OR: [{ receiptNo: { contains: q, mode: "insensitive" } }, { student: { firstName: { contains: q, mode: "insensitive" } } }, { student: { lastName: { contains: q, mode: "insensitive" } } }, { student: { admissionNo: { contains: q, mode: "insensitive" } } }] }
            : {}),
        },
        include: { student: true, recordedBy: true, voidedBy: true },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const total = payments.filter((p) => !p.voided).reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <PageHeader title="Payment history" subtitle={term ? `${termLabel(term)} · ${payments.length} receipts · ${formatNaira(total)} collected` : ""} />
      <FilterBar>
        <select name="term" defaultValue={term?.id} className="input w-56">
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {termLabel(t)}
            </option>
          ))}
        </select>
        <input name="q" defaultValue={q} placeholder="Receipt no. or student" className="input w-56" />
      </FilterBar>
      <Card>
        {payments.length === 0 ? (
          <Empty>No payments found.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Student</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th className="text-right">Amount</th>
                  <th>Recorded by</th>
                  <th>Void</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className={p.voided ? "opacity-60" : ""}>
                    <td>
                      <Link href={`/print/receipt/${p.id}`} className="font-mono text-xs text-brand-700 hover:underline">
                        {p.receiptNo}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/students/${p.studentId}`} className="hover:text-brand-700">
                        {studentName(p.student)}
                      </Link>
                    </td>
                    <td>{formatDate(p.paidOn)}</td>
                    <td className="capitalize">
                      {p.method}
                      {p.reference && <div className="text-xs text-gray-400">{p.reference}</div>}
                    </td>
                    <td className={`text-right ${p.voided ? "line-through" : "font-medium"}`}>{formatNaira(p.amount)}</td>
                    <td className="text-gray-600">{p.recordedBy.fullName}</td>
                    <td>
                      {p.voided ? (
                        <div>
                          <Badge color="red">Voided</Badge>
                          <div className="mt-1 max-w-48 text-xs text-gray-500">
                            {p.voidReason}, by {p.voidedBy?.fullName}
                          </div>
                        </div>
                      ) : (
                        <details>
                          <summary className="cursor-pointer text-xs text-red-600">Void…</summary>
                          <form action={voidPayment.bind(null, p.id)} className="mt-2 flex gap-1">
                            <input name="reason" required minLength={3} placeholder="Reason" className="input py-1 text-xs" />
                            <Button variant="danger" className="px-2 py-1 text-xs">
                              Void
                            </Button>
                          </form>
                        </details>
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
