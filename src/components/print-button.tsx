"use client";

import { Printer } from "lucide-react";

export function PrintBar({ backHref }: { backHref?: string }) {
  return (
    <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
      <button onClick={() => (backHref ? (window.location.href = backHref) : history.back())} className="text-sm text-gray-600 hover:text-gray-900">
        ← Back
      </button>
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
      >
        <Printer size={15} /> Print / Save as PDF
      </button>
    </div>
  );
}
