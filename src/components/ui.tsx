import type { ReactNode } from "react";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, title, actions }: { children: ReactNode; className?: string; title?: string; actions?: ReactNode }) {
  return (
    <section className={cn("min-w-0 rounded-lg border border-gray-200 bg-white shadow-sm", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          {title && <h2 className="text-sm font-semibold text-gray-800">{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

// Buttons live in a client component so submit buttons can lock while saving.
export { Button, LinkButton } from "./button";
import { Button } from "./button";

const badgeColors = {
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  amber: "bg-amber-100 text-amber-800",
  blue: "bg-sky-100 text-sky-800",
  gray: "bg-gray-100 text-gray-700",
};
export function Badge({ color = "gray", children }: { color?: keyof typeof badgeColors; children: ReactNode }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", badgeColors[color])}>{children}</span>;
}

export function FeeStatusBadge({ status }: { status: "paid" | "partial" | "owing" }) {
  const map = { paid: ["green", "Paid"], partial: ["amber", "Partial"], owing: ["red", "Owing"] } as const;
  return <Badge color={map[status][0]}>{map[status][1]}</Badge>;
}

export function AttendanceBadge({ status }: { status: string }) {
  const map: Record<string, [keyof typeof badgeColors, string]> = {
    present: ["green", "Present"],
    absent: ["red", "Absent"],
    late: ["amber", "Late"],
    excused: ["blue", "Excused"],
  };
  const [c, l] = map[status] ?? ["gray", status];
  return <Badge color={c}>{l}</Badge>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-gray-500">{children}</div>;
}

export function Alert({ kind = "info", children }: { kind?: "info" | "error" | "success"; children: ReactNode }) {
  const c = {
    info: "bg-sky-50 text-sky-800 border-sky-200",
    error: "bg-red-50 text-red-800 border-red-200",
    success: "bg-green-50 text-green-800 border-green-200",
  }[kind];
  return <div className={cn("mb-4 rounded-md border px-4 py-3 text-sm", c)}>{children}</div>;
}

/** A GET form of selects that updates search params (no client JS needed). */
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <form method="get" className="no-print mb-4 flex flex-wrap items-end gap-3 max-sm:*:w-full!">
      {children}
      <Button type="submit" variant="secondary">
        Apply
      </Button>
    </form>
  );
}
