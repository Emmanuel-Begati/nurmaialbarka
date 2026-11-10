"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";

const danger =
  "inline-flex items-center gap-1.5 rounded-md border border-transparent bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50";
const outline =
  "inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50";
const plain = "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50";

function SubmitDanger({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={danger}>
      {pending ? "Deleting…" : children}
    </button>
  );
}

/** Two-step delete button for use inside a <form action={serverAction}>. No browser pop-ups. */
export function ConfirmDelete({ label = "Delete", warning, small }: { label?: string; warning: React.ReactNode; small?: boolean }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={small ? `${outline} px-2 py-1 text-xs` : outline}>
        <Trash2 size={small ? 13 : 15} /> {label}
      </button>
    );
  }
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-left text-sm text-red-800">
      <div className="mb-2">{warning}</div>
      <div className="flex gap-2">
        <SubmitDanger>Yes, delete permanently</SubmitDanger>
        <button type="button" onClick={() => setAsking(false)} className={plain}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * Bulk-delete bar. Row checkboxes elsewhere on the page must have
 * name="ids" and form={formId}; this component owns that <form>.
 */
export function BulkDeleteBar({
  formId,
  action,
  noun,
  warning,
}: {
  formId: string;
  action: (fd: FormData) => Promise<void>;
  noun: string;
  warning: string;
}) {
  const [count, setCount] = useState(0);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    const boxes = () => Array.from(document.querySelectorAll<HTMLInputElement>(`input[name="ids"][form="${formId}"]`));
    const update = () => {
      const n = boxes().filter((b) => b.checked).length;
      setCount(n);
      if (n === 0) setAsking(false);
      const all = document.querySelector<HTMLInputElement>(`input[data-select-all="${formId}"]`);
      if (all) {
        all.checked = n > 0 && n === boxes().length;
        all.indeterminate = n > 0 && n < boxes().length;
      }
    };
    const onChange = (e: Event) => {
      const t = e.target as HTMLInputElement;
      if (t.dataset?.selectAll === formId) boxes().forEach((b) => (b.checked = t.checked));
      update();
    };
    document.addEventListener("change", onChange);
    update();
    return () => document.removeEventListener("change", onChange);
  }, [formId]);

  return (
    <form id={formId} action={action} className={count === 0 ? "hidden" : "mb-4"}>
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <span className="font-medium">
          {count} {noun}
          {count === 1 ? "" : "s"} selected
        </span>
        {!asking ? (
          <button type="button" onClick={() => setAsking(true)} className={outline}>
            <Trash2 size={15} /> Delete selected
          </button>
        ) : (
          <>
            <span>{warning}</span>
            <SubmitDanger>
              Yes, delete {count} {noun}
              {count === 1 ? "" : "s"}
            </SubmitDanger>
            <button type="button" onClick={() => setAsking(false)} className={plain}>
              Cancel
            </button>
          </>
        )}
      </div>
    </form>
  );
}

export function SelectAll({ formId }: { formId: string }) {
  return <input type="checkbox" data-select-all={formId} aria-label="Select all" className="h-4 w-4 accent-red-600" />;
}
