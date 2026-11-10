import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasRole, isStaff, ROLE_LABELS } from "@/lib/auth/roles";
import { getSettings } from "@/lib/current";
import { termLabel } from "@/lib/format";
import { logout } from "@/app/login/actions";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { MobileNav } from "@/components/mobile-nav";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!isStaff(user.roles)) redirect("/portal");
  const settings = await getSettings();
  const r = user.roles;

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/students", label: "Students", icon: "students" },
  ];
  if (hasRole(r, "admin")) items.push({ href: "/classes", label: "Classes", icon: "classes" });
  if (hasRole(r, "admin", "teacher")) items.push({ href: "/attendance", label: "Attendance", icon: "attendance" });
  if (hasRole(r, "admin", "bursar")) items.push({ href: "/fees", label: "School Fees", icon: "fees" });
  if (hasRole(r, "admin", "teacher")) {
    items.push({ href: "/results", label: "Score Entry", icon: "results" });
    items.push({ href: "/quran", label: "Qur'an Progress", icon: "quran" });
    items.push({ href: "/reports", label: "Report Cards", icon: "reports" });
  }
  if (hasRole(r, "admin")) {
    items.push({ href: "/staff", label: "Staff & Users", icon: "staff" });
    items.push({ href: "/settings", label: "Settings", icon: "settings" });
  }

  const schoolName = settings?.name ?? "School Admin";
  const termText = settings?.currentTerm ? termLabel(settings.currentTerm) : "No term set";

  const userBox = (
    <div className="border-t border-brand-800 px-4 py-3">
      <div className="truncate text-sm font-medium text-white">
        {user.title} {user.fullName}
      </div>
      <div className="truncate text-xs text-brand-100/80">{user.roles.map((x) => ROLE_LABELS[x]).join(", ")}</div>
      <form action={logout} className="mt-2">
        <button className="flex items-center gap-1.5 py-1 text-sm text-brand-100 hover:text-white lg:text-xs">
          <LogOut size={14} /> Sign out
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* phones & tablets: top bar + slide-out menu */}
      <MobileNav title={schoolName} subtitle={termText}>
        <div className="flex-1 pb-3">
          <NavLinks items={items} />
        </div>
        {userBox}
      </MobileNav>

      {/* desktop: fixed sidebar */}
      <aside className="no-print hidden bg-brand-900 lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 font-bold text-white">ن</div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{schoolName}</div>
            <div className="truncate text-xs text-brand-100/80">{termText}</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pb-3">
          <NavLinks items={items} />
        </div>
        {userBox}
      </aside>

      <div className="min-w-0 flex-1 lg:pl-60">
        <main className="mx-auto max-w-7xl px-4 py-5 sm:py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
