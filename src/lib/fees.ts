import "server-only";
import { db } from "@/lib/db";

export type FeeStatus = "paid" | "partial" | "owing";
export type FeeBalance = { expected: number; paid: number; balance: number; status: FeeStatus };

/** Expected, paid, balance and status for each active student (or the given ones) in a term. */
export async function feeBalances(termId: number, studentIds?: number[]) {
  const students = await db.student.findMany({
    where: studentIds ? { id: { in: studentIds } } : { status: "active" },
    select: { id: true, classId: true },
  });
  const items = await db.feeItem.findMany({ where: { termId } });
  const paid = await db.payment.groupBy({
    by: ["studentId"],
    where: { termId, voided: false, ...(studentIds ? { studentId: { in: studentIds } } : {}) },
    _sum: { amount: true },
  });
  const paidMap = new Map(paid.map((p) => [p.studentId, p._sum.amount ?? 0]));
  const result = new Map<number, FeeBalance>();
  for (const s of students) {
    const expected = items
      .filter((i) => i.classId === null || i.classId === s.classId)
      .reduce((a, i) => a + i.amount, 0);
    const p = paidMap.get(s.id) ?? 0;
    const balance = Math.max(expected - p, 0);
    const status: FeeStatus = expected === 0 || p >= expected ? "paid" : p > 0 ? "partial" : "owing";
    result.set(s.id, { expected, paid: p, balance, status });
  }
  return result;
}

export async function nextReceiptNo() {
  const year = new Date().getFullYear();
  const last = await db.payment.findFirst({
    where: { receiptNo: { startsWith: `RCT/${year}/` } },
    orderBy: { id: "desc" },
    select: { receiptNo: true },
  });
  const n = last ? parseInt(last.receiptNo.split("/")[2], 10) + 1 : 1;
  return `RCT/${year}/${String(n).padStart(5, "0")}`;
}
