"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, verifyPassword } from "@/lib/auth/session";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "Enter your email/admission number and password." };

  // admission numbers are stored upper-case (e.g. NQ/2026/001)
  const user = await db.user.findFirst({
    where: { OR: [{ username }, { username: username.toUpperCase() }] },
  });
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Incorrect login details." };
  }
  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
