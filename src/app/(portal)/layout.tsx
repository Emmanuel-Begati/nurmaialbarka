import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasRole, isStaff } from "@/lib/auth/roles";
import { getSettings } from "@/lib/current";
import { logout } from "@/app/login/actions";
import { Logo } from "@/components/logo";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (isStaff(user.roles)) redirect("/dashboard");
  if (!hasRole(user.roles, "parent", "student")) redirect("/forbidden");
  const settings = await getSettings();
  return (
    <div className="min-h-screen">
      <header className="bg-brand-900 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo className="h-10" />
            <div>
              <div className="text-sm font-semibold">{settings?.name}</div>
              <div className="text-xs text-brand-100/80">{hasRole(user.roles, "parent") ? "Parent portal" : "Student portal"}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:inline">{user.fullName}</span>
            <form action={logout}>
              <button className="text-brand-100 hover:text-white">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
