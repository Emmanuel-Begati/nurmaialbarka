"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";

/** Transparent over the hero, turns solid once the visitor scrolls. */
export function SiteHeader({
  name,
  nav,
  loginHref,
  loginLabel,
}: {
  name: string;
  nav: readonly (readonly [string, string])[];
  loginHref: string;
  loginLabel: string;
}) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const dark = solid || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        dark ? "bg-brand-900/95 py-2 shadow-lg shadow-black/10 backdrop-blur" : "bg-transparent py-4"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5">
        <a href="#top" className="flex min-w-0 items-center gap-3 text-white">
          <Logo className={`transition-all duration-500 ${dark ? "h-10" : "h-12"}`} priority />
          <span className="truncate font-display text-lg leading-tight tracking-wide">{name}</span>
        </a>
        <nav className="hidden items-center gap-7 text-sm text-white/80 xl:flex">
          {nav.map(([href, label]) => (
            <a key={href} href={href} className="group relative py-1 transition-colors hover:text-white">
              {label}
              <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-accent-400 transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={loginHref}
            className="hidden rounded-full bg-accent-500 px-5 py-2 text-sm font-semibold text-brand-900 transition hover:bg-accent-400 hover:shadow-lg hover:shadow-accent-500/30 sm:inline-block"
          >
            {loginLabel}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 xl:hidden"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {/* phone / tablet menu */}
      <div className={`overflow-hidden transition-[max-height] duration-500 xl:hidden ${open ? "max-h-[32rem]" : "max-h-0"}`}>
        <nav className="mx-auto flex max-w-7xl flex-col px-5 pt-2 pb-5">
          {nav.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="border-b border-white/10 py-3 text-white/85 hover:text-accent-300">
              {label}
            </a>
          ))}
          <Link href={loginHref} className="mt-4 rounded-full bg-accent-500 px-5 py-2.5 text-center text-sm font-semibold text-brand-900">
            {loginLabel}
          </Link>
        </nav>
      </div>
    </header>
  );
}
