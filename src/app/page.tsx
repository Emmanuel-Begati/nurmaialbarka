import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";

export default async function Home() {
  const user = await requireUser();
  redirect(isStaff(user.roles) ? "/dashboard" : "/portal");
}
