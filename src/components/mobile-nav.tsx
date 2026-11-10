"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

/** Phone/tablet top bar with a slide-out drawer holding the sidebar content. Hidden on large screens. */
export function MobileNav({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // close the drawer after navigating
  useEffect(() => setOpen(false), [pathname]);
  // stop the page scrolling behind the open drawer
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="no-print lg:hidden">
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-brand-900 px-4 py-3 text-white shadow">
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="-ml-1 rounded-md p-1.5 hover:bg-brand-800">
          <Menu size={22} />
        </button>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{title}</div>
          <div className="truncate text-xs text-brand-100/80">{subtitle}</div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col overflow-y-auto bg-brand-900 shadow-xl">
            <div className="flex justify-end p-2">
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-md p-1.5 text-brand-100 hover:bg-brand-800">
                <X size={22} />
              </button>
            </div>
            {children}
          </aside>
        </div>
      )}
    </div>
  );
}
