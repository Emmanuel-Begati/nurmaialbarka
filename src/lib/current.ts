import "server-only";
import { db } from "@/lib/db";

export async function getSettings() {
  return db.schoolSettings.findUnique({
    where: { id: 1 },
    include: { currentTerm: { include: { session: true } } },
  });
}

export async function getCurrentTerm() {
  const s = await getSettings();
  if (s?.currentTerm) return s.currentTerm;
  return db.term.findFirst({ orderBy: { startDate: "desc" }, include: { session: true } });
}

export async function allTerms() {
  return db.term.findMany({ include: { session: true }, orderBy: [{ startDate: "desc" }] });
}

/** Resolve ?term= search param, falling back to the current term. */
export async function resolveTerm(termParam?: string) {
  if (termParam) {
    const t = await db.term.findUnique({ where: { id: Number(termParam) }, include: { session: true } });
    if (t) return t;
  }
  return getCurrentTerm();
}
