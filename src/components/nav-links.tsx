"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  School,
  CalendarCheck,
  Wallet,
  ClipboardList,
  BookOpen,
  FileText,
  UserCog,
  Settings,
  Home,
} from "lucide-react";

const ICONS = {
  dashboard: LayoutDashboard,
  students: Users,
  classes: School,
  attendance: CalendarCheck,
  fees: Wallet,
  results: ClipboardList,
  quran: BookOpen,
  reports: FileText,
  staff: UserCog,
  settings: Settings,
  home: Home,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-2">
      {items.map((it) => {
        const Icon = ICONS[it.icon];
        const active = pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors lg:py-2 ${
              active ? "bg-brand-700 text-white" : "text-brand-100 hover:bg-brand-800 hover:text-white"
            }`}
          >
            <Icon size={17} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
