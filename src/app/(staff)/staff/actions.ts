"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertRole, audit } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/session";
import { deleteStaffAccount } from "@/lib/deletion";
import { applyPhotoFromForm, PhotoError } from "@/lib/photos";

/** Save the photo fields of a staff form; bad images send the admin back with a message. */
async function savePhoto(userId: number, fd: FormData) {
  try {
    await applyPhotoFromForm("staff", userId, fd);
  } catch (e) {
    if (e instanceof PhotoError) redirect("/staff?error=" + encodeURIComponent(e.message));
    throw e;
  }
}

export async function deleteStaff(userId: number) {
  const me = await assertRole("admin");
  if (userId === me.id) redirect("/staff?error=" + encodeURIComponent("You cannot delete your own account."));
  const u = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { fullName: true, title: true } });
  const result = await deleteStaffAccount(userId);
  await audit(me.id, result === "deleted" ? "staff.delete" : "staff.disable", "User", userId, u.fullName);
  const name = `${u.title} ${u.fullName}`.trim();
  redirect(
    "/staff?notice=" +
      encodeURIComponent(
        result === "deleted"
          ? `${name} was deleted.`
          : `${name} has taken registers or recorded payments, so the account was disabled (not erased) to keep those records. They can no longer log in and were removed from all classes.`,
      ),
  );
}

const STAFF_ROLES = ["admin", "bursar", "teacher"];
const rolesFrom = (fd: FormData) => STAFF_ROLES.filter((r) => fd.get(`role_${r}`) === "on");

export async function createStaff(fd: FormData) {
  const me = await assertRole("admin");
  const username = String(fd.get("username") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const roles = rolesFrom(fd);
  if (!username || password.length < 6 || roles.length === 0) {
    redirect("/staff?error=" + encodeURIComponent("Email, a password of at least 6 characters and at least one role are required."));
  }
  if (await db.user.findUnique({ where: { username } })) redirect("/staff?error=" + encodeURIComponent("That email is already in use."));
  const u = await db.user.create({
    data: {
      username,
      passwordHash: await hashPassword(password),
      fullName: String(fd.get("fullName") ?? "").trim(),
      title: String(fd.get("title") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      roles: roles.join(","),
    },
  });
  await audit(me.id, "staff.create", "User", u.id, roles.join(","));
  await savePhoto(u.id, fd);
  revalidatePath("/staff");
}

export async function updateStaff(userId: number, fd: FormData) {
  const me = await assertRole("admin");
  let roles = rolesFrom(fd);
  let active = fd.get("active") === "on";
  // never let an admin lock themselves out
  if (userId === me.id) {
    if (!roles.includes("admin")) roles = ["admin", ...roles];
    active = true;
  }
  const password = String(fd.get("password") ?? "");
  const current = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { username: true } });
  const username = String(fd.get("username") ?? "").trim().toLowerCase();
  const emailChanged = username !== "" && username !== current.username;
  if (emailChanged) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) redirect("/staff?error=" + encodeURIComponent(`"${username}" is not a valid email address.`));
    const taken = await db.user.findUnique({ where: { username }, select: { id: true } });
    if (taken && taken.id !== userId) redirect("/staff?error=" + encodeURIComponent(`${username} is already used by another account.`));
  }
  await db.user.update({
    where: { id: userId },
    data: {
      ...(emailChanged ? { username } : {}),
      fullName: String(fd.get("fullName") ?? "").trim(),
      title: String(fd.get("title") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      roles: roles.join(","),
      active,
      ...(password.length >= 6 ? { passwordHash: await hashPassword(password) } : {}),
    },
  });
  if (!active) await db.session.deleteMany({ where: { userId } });
  await audit(me.id, "staff.update", "User", userId, emailChanged ? `${roles.join(",")}; email ${current.username} -> ${username}` : roles.join(","));
  await savePhoto(userId, fd);
  const name = `${String(fd.get("title") ?? "").trim()} ${String(fd.get("fullName") ?? "").trim()}`.trim();
  redirect(
    "/staff?notice=" +
      encodeURIComponent(emailChanged ? `Saved. ${name} now logs in with ${username}.` : `Changes to ${name} saved.`),
  );
}
