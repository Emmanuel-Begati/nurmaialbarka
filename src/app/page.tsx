import type { Metadata } from "next";
import Link from "next/link";
import { Amiri, Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  ChevronDown,
  Clock,
  Landmark,
  Languages,
  Mail,
  MapPin,
  Mic,
  PenTool,
  Phone,
  Quote,
  Scale,
  ScrollText,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { parseRoles } from "@/lib/auth/roles";
import { getCurrentTerm, getSettings } from "@/lib/current";
import { formatDate, TERM_NAMES } from "@/lib/format";
import { homePathFor } from "@/lib/home";
import { photoUrl } from "@/lib/photo-url";
import { PROPRIETOR_PHOTO_ID, siteText } from "@/lib/public-site";
import { Avatar } from "@/components/avatar";
import { CountUp, Reveal } from "@/components/site/reveal";
import { SiteHeader } from "@/components/site/site-header";
import { Lantern, MosqueSkyline, QuranOnStand, Rosette, StarPattern } from "@/components/site/art";
import { Logo } from "@/components/logo";

// Public school website. Safe for anyone to see: no fee amounts, no student data.
// The admin edits the wording in Settings → Public website.

const display = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const arabic = Amiri({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-amiri", display: "swap" });

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: s?.name || "Nurul Qur'an Islamiyyah School", description: siteText(s, "tagline") };
}

const NAV = [
  ["#about", "About"],
  ["#learning", "Learning"],
  ["#admissions", "Admissions"],
  ["#calendar", "Calendar"],
  ["#fees", "Fees"],
  ["#teachers", "Teachers"],
  ["#contact", "Contact"],
] as const;

function subjectIcon(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes("tajw")) return Mic;
  if (n.includes("khatt") || n.includes("writing")) return PenTool;
  if (n.includes("qur")) return BookOpen;
  if (n.includes("arab")) return Languages;
  if (n.includes("fiqh")) return Scale;
  if (n.includes("hadith")) return ScrollText;
  if (n.includes("taw")) return Sparkles;
  if (n.includes("seer") || n.includes("sira") || n.includes("history")) return Landmark;
  return BookMarked;
}

export default async function PublicSite() {
  const [settings, user, term, subjects] = await Promise.all([
    getSettings(),
    getCurrentUser(),
    getCurrentTerm(),
    db.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const proprietorPhoto = await db.photo.findUnique({
    where: { ownerType_ownerId: { ownerType: "site", ownerId: PROPRIETOR_PHOTO_ID } },
    select: { updatedAt: true },
  });
  const [terms, staff] = await Promise.all([
    term ? db.term.findMany({ where: { sessionId: term.sessionId }, orderBy: { number: "asc" } }) : [],
    settings?.showStaffPublicly === false
      ? []
      : db.user.findMany({
          where: { active: true, roles: { contains: "teacher" } },
          orderBy: { fullName: "asc" },
          select: { id: true, title: true, fullName: true, roles: true, photoAt: true },
        }),
  ]);
  const teachers = staff.filter((u) => parseRoles(u.roles).includes("teacher"));
  const name = settings?.name || "Nurul Qur'an Islamiyyah School";
  const home = user ? homePathFor(user.roles) : null;
  const loginHref = home ?? "/login";
  const loginLabel = home ? (home === "/dashboard" ? "Go to dashboard" : "My portal") : "Portal login";
  const nav = NAV.filter(([href]) => href !== "#teachers" || teachers.length > 0);
  const admissions = splitSteps(siteText(settings, "admissionsText"));
  const mapSrc = settings?.address ? `https://maps.google.com/maps?q=${encodeURIComponent(settings.address)}&z=15&output=embed` : null;

  return (
    <div className={`${display.variable} ${arabic.variable} overflow-x-hidden bg-ivory text-gray-800`}>
      <SiteHeader name={name} nav={nav} loginHref={loginHref} loginLabel={loginLabel} />

      {/* ───────── Hero ───────── */}
      <section id="top" className="relative flex min-h-[min(100svh,58rem)] items-center overflow-hidden bg-brand-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,#b8292e_0%,transparent_55%),radial-gradient(ellipse_at_bottom_left,#2e0709_0%,transparent_60%)]" />
        <StarPattern id="hero-stars" className="text-accent-400 opacity-[0.07]" />
        <Rosette className="animate-spin-slow absolute -top-40 -right-40 h-[38rem] w-[38rem] text-accent-400/15 sm:-right-24 lg:hidden" />
        {/* crest framed by a slowly turning rosette (large screens) */}
        <div className="pointer-events-none absolute top-1/2 right-[4%] hidden h-[29.03rem] w-[29.03rem] -translate-y-[58%] items-center justify-center lg:flex">
          <Rosette className="animate-spin-slow absolute inset-0 h-full w-full text-accent-400/25" />
          <div className="absolute inset-[16%] rounded-full bg-white/95 shadow-[0_0_80px_rgba(242,129,28,0.4)]" />
          <div className="hero-in relative" style={{ ["--delay" as string]: "900ms" }}>
            <Logo className="animate-float h-64" priority />
          </div>
        </div>
        <Rosette className="animate-spin-slower absolute -bottom-56 -left-48 hidden h-[30rem] w-[30rem] text-white/5 md:block" />
        <div className="pointer-events-none absolute top-16 right-[7%] hidden gap-10 text-accent-400/70 md:flex lg:hidden">
          <Lantern className="animate-float h-40 w-14" />
          <Lantern className="animate-float h-28 w-10 [animation-delay:1.5s]" />
          <Lantern className="animate-float h-48 w-16 [animation-delay:.8s]" />
        </div>

        <div className="relative mx-auto w-full max-w-7xl px-5 pt-28 pb-48 sm:pb-56">
          {/* crest for phones/tablets (large screens show it framed on the right) */}
          <div className="hero-in mb-6 flex aspect-square w-[9.7rem] items-center justify-center rounded-full bg-white/95 shadow-[0_0_50px_rgba(242,129,28,0.35)] lg:hidden">
            <Logo className="h-[6rem]" priority />
          </div>
          <p className="hero-in text-left font-arabic text-2xl text-accent-300 sm:text-3xl" style={{ ["--delay" as string]: "100ms" }} dir="rtl" lang="ar">
            بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </p>
          <h1
            className="hero-in mt-6 max-w-4xl lg:max-w-[61.8%] font-display text-phi-2 font-semibold sm:text-phi-3"
            style={{ ["--delay" as string]: "250ms" }}
          >
            {name}
          </h1>
          {settings?.motto && (
            <p className="hero-in gold-text mt-5 font-display text-lg italic sm:text-phi-1" style={{ ["--delay" as string]: "400ms" }}>
              {settings.motto}
            </p>
          )}
          <p className="hero-in mt-6 max-w-2xl text-base lg:max-w-[50%] leading-relaxed text-white/80 sm:text-lg" style={{ ["--delay" as string]: "550ms" }}>
            {siteText(settings, "tagline")}
          </p>
          <div className="hero-in mt-10 flex flex-wrap gap-4" style={{ ["--delay" as string]: "700ms" }}>
            <a
              href="#admissions"
              className="group inline-flex items-center gap-2 rounded-full bg-accent-500 px-7 py-3.5 font-semibold text-brand-900 transition hover:bg-accent-400 hover:shadow-xl hover:shadow-accent-500/25"
            >
              Enrol your child <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </a>
            <a href="#about" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-7 py-3.5 font-medium text-white transition hover:border-white hover:bg-white/10">
              Discover our school
            </a>
          </div>
        </div>

        <MosqueSkyline archColor="#4f0d10" className="absolute inset-x-0 bottom-0 h-40 w-full text-ivory sm:h-56" />
        <a href="#about" aria-label="Scroll down" className="animate-bounce-soft absolute bottom-6 left-1/2 -translate-x-1/2 text-brand-800">
          <ChevronDown size={30} />
        </a>
      </section>

      {/* ───────── Highlights ───────── */}
      <section className="relative">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-10 px-5 py-14 sm:py-16 lg:grid-cols-4">
          {[
            { n: 30, s: "", label: "Juz of the Qur'an in our hifz programme" },
            { n: subjects.length, s: "", label: "Subjects taught across the Deen" },
            { n: teachers.length, s: "", label: "Dedicated teachers", hide: teachers.length === 0 },
            { n: 3, s: "", label: "Terms in every school session" },
          ]
            .filter((x) => !x.hide)
            .map((x, i) => (
              <Reveal key={x.label} delay={i * 120} className="px-4 text-center lg:border-l lg:border-accent-500/30 lg:first:border-l-0">
                <div className="font-display text-phi-2 font-semibold text-brand-800 sm:text-phi-3">
                  <CountUp to={x.n} suffix={x.s} />
                </div>
                <div className="mx-auto mt-3 max-w-[12rem] text-sm leading-snug text-gray-600">{x.label}</div>
              </Reveal>
            ))}
        </div>
      </section>

      {/* ───────── About ───────── */}
      <section id="about" className="relative scroll-mt-16 overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-[4.236rem] px-5 py-[4.236rem] sm:py-[6.854rem] lg:grid-cols-[1.618fr_1fr]">
          <Reveal variant="left">
            <Eyebrow>About us</Eyebrow>
            <h2 className="mt-3 font-display text-phi-1 font-semibold text-brand-900 sm:text-phi-2">
              Rooted in the Qur&apos;an, <span className="text-accent-600 italic">growing in character</span>
            </h2>
            <div className="mt-8">
              <Paragraphs text={siteText(settings, "aboutText")} />
            </div>
          </Reveal>
          <Reveal variant="right" className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center">
            <Rosette className="animate-spin-slow absolute inset-0 h-full w-full text-accent-500/25" />
            <div className="absolute inset-[14%] rounded-full bg-gradient-to-br from-brand-50 to-white shadow-2xl shadow-brand-900/10" />
            <QuranOnStand className="animate-float relative w-3/5 text-brand-700" />
            <span className="absolute -bottom-2 font-arabic text-3xl text-accent-600/80" dir="rtl" lang="ar">
              ٱقْرَأْ
            </span>
          </Reveal>
        </div>
      </section>

      {/* ───────── Proprietor's message ───────── */}
      <section className="relative overflow-hidden bg-brand-900 text-white">
        <StarPattern id="msg-stars" className="text-white opacity-[0.05]" size={120} />
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-arabic text-[9rem] leading-none whitespace-nowrap text-white/[0.04] sm:text-[16rem]"
          dir="rtl"
          lang="ar"
        >
          العلم نور
        </span>
        <div
          className={`relative mx-auto grid items-center gap-[4.236rem] px-5 py-[6.854rem] sm:py-[11.09rem] ${
            proprietorPhoto ? "max-w-6xl lg:grid-cols-[1fr_1.618fr]" : "max-w-4xl text-center"
          }`}
        >
          {proprietorPhoto && (
            <Reveal variant="left" className="relative mx-auto w-full max-w-[22rem]">
              {/* arched frame with an offset orange outline */}
              <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-t-full border-2 border-accent-500/70" />
              <div className="relative aspect-[1/1.618] overflow-hidden rounded-t-full bg-brand-800 shadow-2xl shadow-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element -- photo served by the app's own image route */}
                <img
                  src={photoUrl("site", PROPRIETOR_PHOTO_ID, proprietorPhoto.updatedAt)!}
                  alt={settings?.principalName ? `${settings.principalName}, Proprietor` : "The Proprietor"}
                  className="h-full w-full object-cover"
                />
              </div>
            </Reveal>
          )}
          <Reveal variant={proprietorPhoto ? "right" : "zoom"} className={proprietorPhoto ? "text-center lg:text-left" : ""}>
            <Quote className={`h-12 w-12 text-accent-400 ${proprietorPhoto ? "mx-auto lg:mx-0" : "mx-auto"}`} />
            <div className="mt-4">
              <Eyebrow light>{settings?.principalName ? "From the Proprietor" : "A word from the school"}</Eyebrow>
            </div>
            <div className="mt-8 space-y-5 font-display text-lg leading-[1.618] text-white/90 italic sm:text-phi-1">
              {paras(siteText(settings, "principalMessage")).map((p, i) => (
                <p key={i} className="whitespace-pre-line">
                  {p}
                </p>
              ))}
            </div>
            {settings?.principalName && (
              <div className="mt-10">
                <div className={`mb-4 h-px w-24 bg-accent-400 ${proprietorPhoto ? "mx-auto lg:mx-0" : "mx-auto"}`} />
                <div className="font-display text-xl text-accent-300">{settings.principalName}</div>
                <div className="mt-1 text-xs tracking-[0.25em] text-white/50 uppercase">Proprietor</div>
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* ───────── Learning ───────── */}
      <section id="learning" className="relative scroll-mt-16 overflow-hidden">
        <StarPattern id="learn-stars" className="text-brand-900 opacity-[0.035]" />
        <div className="relative mx-auto max-w-7xl px-5 py-[4.236rem] sm:py-[6.854rem]">
          <Reveal className="mx-auto max-w-3xl text-center">
            <Eyebrow>What we teach</Eyebrow>
            <h2 className="mt-3 font-display text-phi-1 font-semibold text-brand-900 sm:text-phi-2">A complete Islamic education</h2>
            <div className="mt-6 text-left sm:text-center">
              <Paragraphs text={siteText(settings, "programmeText")} />
            </div>
          </Reveal>
          {subjects.length > 0 && (
            <div className="mt-16 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-4">
              {subjects.map((s, i) => {
                const Icon = subjectIcon(s.name);
                return (
                  <Reveal key={s.id} delay={(i % 4) * 100} className="group flex items-center gap-4 border-b border-brand-900/10 py-6">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-accent-500/50 text-accent-600 transition duration-500 group-hover:rotate-[360deg] group-hover:bg-brand-800 group-hover:text-accent-300">
                      <Icon size={24} strokeWidth={1.5} />
                    </span>
                    <span className="font-display text-lg text-brand-900">{s.name}</span>
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ───────── Admissions ───────── */}
      <section id="admissions" className="relative scroll-mt-16 overflow-hidden bg-white">
        <div className="mx-auto grid max-w-7xl gap-[4.236rem] px-5 py-[4.236rem] sm:py-[6.854rem] lg:grid-cols-[1fr_1.618fr]">
          <Reveal variant="left">
            <Eyebrow>Admissions</Eyebrow>
            <h2 className="mt-3 font-display text-phi-1 font-semibold text-brand-900 sm:text-phi-2">Join our school family</h2>
            <div className="mt-6">
              <Paragraphs text={admissions.intro} />
            </div>
            {settings?.phone && (
              <a
                href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-800 px-6 py-3 font-medium text-white transition hover:bg-brand-700"
              >
                <Phone size={17} /> Call the school office
              </a>
            )}
          </Reveal>
          <ol className="relative">
            <span aria-hidden className="absolute top-2 bottom-2 left-6 w-px bg-gradient-to-b from-accent-500 via-accent-500/40 to-transparent" />
            {admissions.steps.map((step, i) => (
              <Reveal as="li" key={i} delay={i * 150} className="relative flex gap-6 pb-10 last:pb-0">
                <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-800 font-display text-lg text-accent-300 ring-8 ring-white">
                  {i + 1}
                </span>
                <p className="pt-2.5 leading-relaxed text-gray-700">{step}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────── Calendar ───────── */}
      <section id="calendar" className="relative scroll-mt-16 overflow-hidden bg-brand-50/60">
        <div className="mx-auto max-w-6xl px-5 py-[4.236rem] sm:py-[6.854rem]">
          <Reveal className="text-center">
            <Eyebrow>School calendar</Eyebrow>
            <h2 className="mt-3 font-display text-phi-1 font-semibold text-brand-900 sm:text-phi-2">
              {term ? `${term.session.name} session` : "Our school year"}
            </h2>
          </Reveal>
          {terms.length === 0 ? (
            <p className="mt-10 text-center text-gray-600">The school calendar will be published here soon.</p>
          ) : (
            <div className="relative mt-16 grid gap-12 md:grid-cols-3 md:gap-6">
              <span aria-hidden className="absolute top-7 right-[16%] left-[16%] hidden h-px bg-accent-500/50 md:block" />
              {terms.map((t, i) => {
                const current = t.id === term?.id;
                return (
                  <Reveal key={t.id} delay={i * 180} className="relative text-center">
                    <span
                      className={`relative mx-auto flex h-14 w-14 items-center justify-center rounded-full font-display text-xl ${
                        current ? "bg-accent-500 text-brand-900 shadow-lg shadow-accent-500/40" : "border border-accent-500/60 bg-ivory text-brand-800"
                      }`}
                    >
                      {current && <span className="absolute inset-0 animate-ping rounded-full bg-accent-500/40" />}
                      <span className="relative">{t.number}</span>
                    </span>
                    <h3 className="mt-5 font-display text-2xl text-brand-900">{TERM_NAMES[t.number]}</h3>
                    {current && <div className="mt-1 text-xs font-semibold tracking-[0.2em] text-accent-600 uppercase">In session</div>}
                    <p className="mt-3 text-sm text-gray-600">
                      {formatDate(t.startDate)} – {formatDate(t.endDate)}
                    </p>
                    {t.nextTermBegins && <p className="mt-1 text-xs text-gray-500">Next term begins {formatDate(t.nextTermBegins)}</p>}
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ───────── Fees ───────── */}
      <section id="fees" className="relative scroll-mt-16 overflow-hidden">
        <Rosette className="animate-spin-slower absolute top-1/2 -right-40 h-[34rem] w-[34rem] -translate-y-1/2 text-brand-900/[0.06]" />
        <div className="relative mx-auto max-w-4xl px-5 py-[4.236rem] sm:py-[6.854rem]">
          <Reveal>
            <Eyebrow>School fees</Eyebrow>
            <h2 className="mt-3 font-display text-phi-1 font-semibold text-brand-900 sm:text-phi-2">Simple, termly payments</h2>
            <div className="mt-6">
              <Paragraphs text={siteText(settings, "feesText")} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────── Teachers ───────── */}
      {teachers.length > 0 && (
        <section id="teachers" className="relative scroll-mt-16 overflow-hidden bg-white">
          <div className="mx-auto max-w-7xl px-5 py-[4.236rem] sm:py-[6.854rem]">
            <Reveal className="text-center">
              <Eyebrow>Our teachers</Eyebrow>
              <h2 className="mt-3 font-display text-phi-1 font-semibold text-brand-900 sm:text-phi-2">The people who teach your children</h2>
            </Reveal>
            <ul className="mt-16 flex flex-wrap justify-center gap-x-12 gap-y-12">
              {teachers.map((t, i) => (
                <Reveal as="li" key={t.id} delay={(i % 6) * 100} variant="zoom" className="group w-36 text-center">
                  <div className="mx-auto w-fit rounded-full p-1 ring-2 ring-accent-500/50 transition duration-500 group-hover:scale-105 group-hover:ring-accent-500">
                    <Avatar size="lg" name={t.fullName} src={photoUrl("staff", t.id, t.photoAt)} />
                  </div>
                  <div className="mt-4 font-display text-base text-brand-900">{`${t.title} ${t.fullName}`.trim()}</div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ───────── Contact ───────── */}
      <section id="contact" className="relative scroll-mt-16 overflow-hidden bg-brand-900 text-white">
        <StarPattern id="contact-stars" className="text-accent-400 opacity-[0.05]" />
        <div className="relative mx-auto grid max-w-7xl gap-[4.236rem] px-5 py-[4.236rem] sm:py-[6.854rem] lg:grid-cols-[1.618fr_1fr]">
          <Reveal variant="left">
            <Eyebrow light>Contact us</Eyebrow>
            <h2 className="mt-3 font-display text-phi-1 font-semibold sm:text-phi-2">We&apos;d love to hear from you</h2>
            <ul className="mt-10 space-y-7">
              {settings?.address && (
                <ContactRow icon={MapPin} label="Visit us">
                  {settings.address}
                </ContactRow>
              )}
              {settings?.phone && (
                <ContactRow icon={Phone} label="Call us">
                  <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} className="hover:text-accent-300">
                    {settings.phone}
                  </a>
                </ContactRow>
              )}
              {settings?.email && (
                <ContactRow icon={Mail} label="Email us">
                  <a href={`mailto:${settings.email}`} className="break-all hover:text-accent-300">
                    {settings.email}
                  </a>
                </ContactRow>
              )}
              <ContactRow icon={Clock} label="Office hours">
                <span className="whitespace-pre-line">{siteText(settings, "officeHours")}</span>
              </ContactRow>
            </ul>
          </Reveal>
          <Reveal variant="right" className="flex flex-col gap-6">
            {mapSrc && (
              <iframe
                title="School location"
                src={mapSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-72 w-full rounded-2xl border-0 opacity-90 grayscale-[30%] transition hover:opacity-100 hover:grayscale-0"
              />
            )}
            <div className="rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 p-7 text-brand-900">
              <h3 className="font-display text-2xl font-semibold">Parents, students &amp; staff</h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-900/80">
                Sign in to follow attendance, published report cards, fee balances and receipts. Parents and staff use their email; students use
                their admission number.
              </p>
              <Link
                href={loginHref}
                className="group mt-5 inline-flex items-center gap-2 rounded-full bg-brand-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                {loginLabel} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="bg-brand-950 text-white/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-5 py-8 text-center text-sm sm:flex-row sm:justify-between sm:text-left">
          <span>
            © {new Date().getFullYear()} {name}
          </span>
          <span className="font-arabic text-lg text-accent-400/80" dir="rtl" lang="ar">
            رَّبِّ زِدْنِي عِلْمًا
          </span>
          <Link href={loginHref} className="hover:text-accent-300">
            {loginLabel}
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Eyebrow({ children, light }: { children: ReactNode; light?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-3 text-xs font-semibold tracking-[0.3em] uppercase ${light ? "text-accent-300" : "text-accent-600"}`}>
      <span className={`h-px w-8 ${light ? "bg-accent-300" : "bg-accent-500"}`} />
      {children}
    </div>
  );
}

const paras = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** Plain text from Settings: blank lines start a new paragraph, single line breaks are kept. */
function Paragraphs({ text }: { text: string }) {
  return (
    <div className="space-y-[1.618em] text-base leading-[1.618] text-gray-600 sm:text-lg">
      {paras(text).map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {p}
        </p>
      ))}
    </div>
  );
}

/** Lines that start with "1." / "2)" / "-" become timeline steps; everything else is intro text. */
function splitSteps(text: string) {
  const intro: string[] = [];
  const steps: string[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*(?:\d+[.)]|[-•*])\s+(.*)$/);
    if (m) steps.push(m[1].trim());
    else intro.push(line);
  }
  return { intro: intro.join("\n").trim(), steps: steps.length ? steps : [] };
}

function ContactRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent-400/40 text-accent-300">
        <Icon size={20} strokeWidth={1.5} />
      </span>
      <div>
        <div className="text-xs tracking-[0.2em] text-white/50 uppercase">{label}</div>
        <div className="mt-1 text-lg text-white/90">{children}</div>
      </div>
    </li>
  );
}
