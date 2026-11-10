import "server-only";
import { db } from "@/lib/db";
import { studentManagerClassIds } from "@/lib/auth/guards";
import type { CurrentUser } from "@/lib/auth/session";

/** Classes the user may put students into (admin: every active class; class teacher: their own). */
export async function placeableClasses(user: CurrentUser) {
  const allowed = await studentManagerClassIds(user);
  return db.class.findMany({
    where: allowed === "all" ? { active: true } : { id: { in: allowed } },
    include: { classTeacher: true },
    orderBy: { id: "asc" },
  });
}
