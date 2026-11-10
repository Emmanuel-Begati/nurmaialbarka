"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertRole, audit } from "@/lib/auth/guards";
import { nextReceiptNo } from "@/lib/fees";
import { formatNaira } from "@/lib/format";

const paymentSchema = z.object({
  studentId: z.coerce.number().int().positive(),
  termId: z.coerce.number().int().positive(),
  amount: z.coerce.number().int().positive("Amount must be greater than zero"),
  method: z.enum(["cash", "transfer", "pos"]),
  reference: z.string().trim().default(""),
  note: z.string().trim().default(""),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type PaymentState = { error?: string };

export async function recordPayment(_prev: PaymentState, fd: FormData): Promise<PaymentState> {
  const user = await assertRole("admin", "bursar");
  const parsed = paymentSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const d = parsed.data;

  // One-time token per payment form: a repeated submit returns the receipt already recorded.
  const formToken = String(fd.get("formToken") ?? "").trim() || null;
  const findExisting = async () =>
    formToken ? db.payment.findUnique({ where: { formToken }, select: { id: true } }) : null;
  const already = await findExisting();
  if (already) redirect(`/print/receipt/${already.id}?new=1`);

  let payment;
  for (let attempt = 0; !payment; attempt++) {
    try {
      payment = await db.payment.create({
        data: { ...d, formToken, paidOn: new Date(d.paidOn), receiptNo: await nextReceiptNo(), recordedById: user.id },
      });
    } catch (e) {
      const unique = typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
      if (!unique || attempt >= 3) throw e;
      const dup = await findExisting();
      if (dup) redirect(`/print/receipt/${dup.id}?new=1`);
      // else: receipt-number race with a different payment, so retry
    }
  }
  await audit(user.id, "payment.create", "Payment", payment.id, `${payment.receiptNo} ${formatNaira(d.amount)}`);
  redirect(`/print/receipt/${payment.id}?new=1`);
}

export async function voidPayment(paymentId: number, fd: FormData) {
  const user = await assertRole("admin", "bursar");
  const reason = String(fd.get("reason") ?? "").trim();
  if (reason.length < 3) return;
  const p = await db.payment.update({
    where: { id: paymentId, voided: false },
    data: { voided: true, voidReason: reason, voidedById: user.id, voidedAt: new Date() },
  });
  await audit(user.id, "payment.void", "Payment", p.id, `${p.receiptNo}: ${reason}`);
  revalidatePath("/fees/payments");
}

export async function addFeeItem(fd: FormData) {
  const user = await assertRole("admin", "bursar");
  const data = z
    .object({
      termId: z.coerce.number().int().positive(),
      classId: z.string().transform((v) => (v ? Number(v) : null)),
      name: z.string().trim().min(1),
      amount: z.coerce.number().int().positive(),
    })
    .parse(Object.fromEntries(fd));
  const item = await db.feeItem.create({ data });
  await audit(user.id, "feeItem.create", "FeeItem", item.id, `${data.name} ${data.amount}`);
  revalidatePath("/fees/items");
}

export async function deleteFeeItem(id: number) {
  const user = await assertRole("admin", "bursar");
  await db.feeItem.delete({ where: { id } });
  await audit(user.id, "feeItem.delete", "FeeItem", id);
  revalidatePath("/fees/items");
}

/** Copy all fee items from one term to another (start of a new term). */
export async function copyFeeItems(fd: FormData) {
  await assertRole("admin", "bursar");
  const from = Number(fd.get("fromTermId"));
  const to = Number(fd.get("toTermId"));
  if (!from || !to || from === to) return;
  const items = await db.feeItem.findMany({ where: { termId: from } });
  await db.feeItem.createMany({ data: items.map(({ classId, name, amount }) => ({ termId: to, classId, name, amount })) });
  redirect(`/fees/items?term=${to}`);
}
