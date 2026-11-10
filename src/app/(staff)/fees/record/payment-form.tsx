"use client";

import { useActionState, useState } from "react";
import { recordPayment, type PaymentState } from "../actions";

type Balance = { expected: number; paid: number; balance: number; status: string } | null;
const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default function PaymentForm({
  termId,
  terms,
  students,
  defaultStudentId,
  today,
  formToken,
}: {
  termId: number;
  terms: { id: number; label: string }[];
  students: { id: number; label: string; balance: Balance }[];
  defaultStudentId?: number;
  today: string;
  formToken: string;
}) {
  const [state, action, pending] = useActionState<PaymentState, FormData>(recordPayment, {});
  const [studentId, setStudentId] = useState<number | undefined>(defaultStudentId);
  const [filter, setFilter] = useState("");
  const selected = students.find((s) => s.id === studentId);
  const shown = filter ? students.filter((s) => s.label.toLowerCase().includes(filter.toLowerCase())) : students;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-3">
      <input type="hidden" name="formToken" value={formToken} />
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
        {state.error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>}
        <div>
          <span className="label">Student</span>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Type to filter by name or admission no." className="input mb-2" />
          <select
            name="studentId"
            required
            value={studentId ?? ""}
            onChange={(e) => setStudentId(Number(e.target.value) || undefined)}
            className="input"
            size={6}
          >
            {shown.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Term</span>
            <select name="termId" defaultValue={termId} className="input">
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Amount (₦)</span>
            <input name="amount" type="number" min={1} step={1} required className="input" placeholder="e.g. 20000" />
          </label>
          <label className="block">
            <span className="label">Payment method</span>
            <select name="method" className="input">
              <option value="cash">Cash</option>
              <option value="transfer">Bank transfer</option>
              <option value="pos">POS</option>
            </select>
          </label>
          <label className="block">
            <span className="label">Date paid</span>
            <input name="paidOn" type="date" defaultValue={today} max={today} required className="input" />
          </label>
          <label className="block">
            <span className="label">Reference / teller no.</span>
            <input name="reference" className="input" placeholder="optional" />
          </label>
          <label className="block">
            <span className="label">Note</span>
            <input name="note" className="input" placeholder="optional" />
          </label>
        </div>
        <button disabled={pending || !studentId} className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
          {pending ? "Saving…" : "Save & print receipt"}
        </button>
      </div>

      <div className="h-fit rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">Current term balance</h2>
        {selected?.balance ? (
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-gray-500">Expected</dt>
            <dd className="text-right">{naira.format(selected.balance.expected)}</dd>
            <dt className="text-gray-500">Paid so far</dt>
            <dd className="text-right">{naira.format(selected.balance.paid)}</dd>
            <dt className="text-gray-500">Outstanding</dt>
            <dd className="text-right text-lg font-semibold text-red-700">{naira.format(selected.balance.balance)}</dd>
          </dl>
        ) : (
          <p className="text-sm text-gray-500">Select a student to see their balance.</p>
        )}
      </div>
    </form>
  );
}
