const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export const formatNaira = (n: number) => naira.format(n);

export const formatDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const TERM_NAMES: Record<number, string> = { 1: "First Term", 2: "Second Term", 3: "Third Term" };

export const termLabel = (t: { number: number; session: { name: string } }) =>
  `${TERM_NAMES[t.number] ?? `Term ${t.number}`} ${t.session.name}`;

/** Classes are named after their class teacher unless an override label is set. */
export function className(c: { labelOverride: string | null; classTeacher: { title: string; fullName: string } | null }) {
  if (c.labelOverride) return c.labelOverride;
  if (!c.classTeacher) return "Unassigned class";
  const t = c.classTeacher;
  return `${t.title ? t.title + " " : ""}${t.fullName}'s Class`;
}

export const studentName = (s: { firstName: string; lastName: string; otherName?: string }) =>
  [s.lastName, s.firstName, s.otherName].filter(Boolean).join(" ");

/** Local date as YYYY-MM-DD */
export function toISODate(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export const todayISO = () => toISODate(new Date());

export const RATING_LABELS: Record<number, string> = { 5: "Excellent", 4: "Very Good", 3: "Good", 2: "Fair", 1: "Poor" };
