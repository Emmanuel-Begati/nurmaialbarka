import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canSeeFees, isStaff } from "@/lib/auth/roles";
import { portalStudentIds } from "@/lib/auth/guards";
import { feeBalances } from "@/lib/fees";
import { className, formatDate, formatNaira, studentName, termLabel } from "@/lib/format";
import { PrintBar } from "@/components/print-button";

export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  const isNew = (await searchParams).new;
  const p = await db.payment.findUnique({
    where: { id },
    include: { student: { include: { class: { include: { classTeacher: true } } } }, term: { include: { session: true } }, recordedBy: true },
  });
  if (!p) notFound();

  // Fees are private: admin/bursar, or the student's own parent/student login.
  const allowed = canSeeFees(user.roles) || (!isStaff(user.roles) && (await portalStudentIds(user)).includes(p.studentId));
  if (!allowed) redirect("/forbidden");

  const [settings, balance] = await Promise.all([db.schoolSettings.findUnique({ where: { id: 1 } }), feeBalances(p.termId, [p.studentId])]);
  const b = balance.get(p.studentId);

  return (
    <>
      <PrintBar backHref={isNew ? "/fees" : undefined} />
      {isNew && <div className="no-print mx-auto mt-4 max-w-xl rounded-md bg-green-50 px-4 py-2 text-sm text-green-800">Payment recorded.</div>}
      <div className="print-sheet mx-3 my-4 max-w-xl rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:mx-auto sm:my-6 sm:p-8">
        <div className="border-b-2 border-brand-700 pb-4 text-center">
          <h1 className="text-xl font-bold text-brand-800 uppercase">{settings?.name}</h1>
          <p className="text-xs text-gray-600">{settings?.address}</p>
          <p className="text-xs text-gray-600">{settings?.phone}</p>
          <p className="mt-3 text-sm font-semibold tracking-widest">OFFICIAL RECEIPT</p>
        </div>
        {p.voided && (
          <div className="mt-4 rounded border-2 border-red-600 py-2 text-center text-lg font-bold text-red-600">VOID: {p.voidReason}</div>
        )}
        <dl className="mt-6 grid grid-cols-3 gap-y-2 text-sm">
          <dt className="text-gray-500">Receipt No.</dt>
          <dd className="col-span-2 font-mono font-semibold">{p.receiptNo}</dd>
          <dt className="text-gray-500">Date</dt>
          <dd className="col-span-2">{formatDate(p.paidOn)}</dd>
          <dt className="text-gray-500">Received from</dt>
          <dd className="col-span-2 font-medium">
            {studentName(p.student)} ({p.student.admissionNo})
          </dd>
          <dt className="text-gray-500">Class</dt>
          <dd className="col-span-2">{p.student.class ? className(p.student.class) : "—"}</dd>
          <dt className="text-gray-500">Being payment for</dt>
          <dd className="col-span-2">School fees, {termLabel(p.term)}</dd>
          <dt className="text-gray-500">Method</dt>
          <dd className="col-span-2 capitalize">
            {p.method === "pos" ? "POS" : p.method}
            {p.reference && ` · Ref: ${p.reference}`}
          </dd>
          {p.note && (
            <>
              <dt className="text-gray-500">Note</dt>
              <dd className="col-span-2">{p.note}</dd>
            </>
          )}
        </dl>
        <div className="mt-6 rounded-md bg-brand-50 p-4 text-center">
          <div className="text-xs text-gray-600 uppercase">Amount paid</div>
          <div className="text-3xl font-bold text-brand-800">{formatNaira(p.amount)}</div>
        </div>
        {b && (
          <dl className="mt-4 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-gray-500">Total fees for term</dt>
            <dd className="text-right">{formatNaira(b.expected)}</dd>
            <dt className="text-gray-500">Total paid to date</dt>
            <dd className="text-right">{formatNaira(b.paid)}</dd>
            <dt className="font-medium">Balance outstanding</dt>
            <dd className="text-right font-semibold">{formatNaira(b.balance)}</dd>
          </dl>
        )}
        <div className="mt-12 flex justify-between text-xs text-gray-600">
          <div>
            <div className="mb-1 w-40 border-t border-gray-400" />
            Received by: {p.recordedBy.title} {p.recordedBy.fullName}
          </div>
          <div className="text-right">
            <div className="mb-1 ml-auto w-32 border-t border-gray-400" />
            Bursar&apos;s stamp
          </div>
        </div>
      </div>
    </>
  );
}
