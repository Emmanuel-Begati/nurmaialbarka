import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { portalStudentIds } from "@/lib/auth/guards";
import { canViewStudent } from "@/lib/scope";

// Serves passport photos. Student photos follow the same rules as the student's record:
// staff who can see the student, or the student's own parent/student login.
// Staff photos are visible to anyone signed in (so parents can recognise teachers).
export async function GET(_req: Request, { params }: { params: Promise<{ owner: string; id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { owner, id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || (owner !== "student" && owner !== "staff")) return new Response("Not found", { status: 404 });

  if (owner === "student") {
    const allowed = (isStaff(user.roles) && (await canViewStudent(user, id))) || (await portalStudentIds(user)).includes(id);
    if (!allowed) return new Response("Forbidden", { status: 403 });
  }

  const photo = await db.photo.findUnique({ where: { ownerType_ownerId: { ownerType: owner, ownerId: id } } });
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(photo.data, {
    headers: {
      "Content-Type": photo.mime,
      "Content-Length": String(photo.data.length),
      // URLs carry ?v=<timestamp>, so a changed photo gets a new URL
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
