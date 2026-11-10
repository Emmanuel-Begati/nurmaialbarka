import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { allTerms, resolveTerm } from "@/lib/current";
import { feeBalances } from "@/lib/fees";
import { className, studentName, termLabel, todayISO } from "@/lib/format";
import { Empty, PageHeader } from "@/components/ui";
import PaymentForm from "./payment-form";

export default async function RecordPaymentPage({ searchParams }: { searchParams: Promise<{ student?: string; term?: string }> }) {
  await requireRole("admin", "bursar");
  const sp = await searchParams;
  const term = await resolveTerm(sp.term);
  if (!term) return <Empty>Create a term first.</Empty>;

  const [terms, students, balances] = await Promise.all([
    allTerms(),
    db.student.findMany({
      where: { status: "active" },
      include: { class: { include: { classTeacher: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    feeBalances(term.id),
  ]);

  return (
    <>
      <PageHeader title="Record a payment" subtitle={`Payments are recorded against ${termLabel(term)} unless you choose another term.`} />
      <PaymentForm
        termId={term.id}
        terms={terms.map((t) => ({ id: t.id, label: termLabel(t) }))}
        students={students.map((s) => ({
          id: s.id,
          label: `${studentName(s)} (${s.admissionNo})${s.class ? " · " + className(s.class) : ""}`,
          balance: balances.get(s.id) ?? null,
        }))}
        defaultStudentId={sp.student ? Number(sp.student) : undefined}
        today={todayISO()}
        formToken={randomUUID()}
      />
    </>
  );
}
