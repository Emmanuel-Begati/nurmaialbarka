import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { className, termLabel, toISODate, TERM_NAMES } from "@/lib/format";
import { Alert, Badge, Button, Card, Field, PageHeader } from "@/components/ui";
import { createSession, promoteClass, saveGrading, savePublicSite, saveSchool, setCurrentTerm, updateTerm } from "./actions";
import { SITE_DEFAULTS } from "@/lib/public-site";
import Link from "next/link";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireRole("admin");
  const sp = await searchParams;
  const [settings, sessions, components, bands, classes, logs] = await Promise.all([
    db.schoolSettings.findUnique({ where: { id: 1 } }),
    db.academicSession.findMany({ include: { terms: { orderBy: { number: "asc" } } }, orderBy: { name: "desc" } }),
    db.assessmentComponent.findMany({ orderBy: { order: "asc" } }),
    db.gradeBand.findMany({ orderBy: { min: "desc" } }),
    db.class.findMany({ include: { classTeacher: true, session: true }, where: { active: true } }),
    db.auditLog.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 40 }),
  ]);
  const allTerms = sessions.flatMap((s) => s.terms.map((t) => ({ ...t, session: s })));

  return (
    <>
      <PageHeader title="Settings" />
      {sp.saved && <Alert kind="success">{sp.saved}</Alert>}
      {sp.error && <Alert kind="error">{sp.error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="School details">
          <form action={saveSchool} className="grid gap-3 p-4">
            <Field label="School name">
              <input name="name" required defaultValue={settings?.name} className="input" />
            </Field>
            <Field label="Address">
              <input name="address" defaultValue={settings?.address} className="input" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone">
                <input name="phone" defaultValue={settings?.phone} className="input" />
              </Field>
              <Field label="Principal / Proprietor">
                <input name="principalName" defaultValue={settings?.principalName} className="input" />
              </Field>
            </div>
            <Field label="Motto">
              <input name="motto" defaultValue={settings?.motto} className="input" />
            </Field>
            <div>
              <Button>Save</Button>
            </div>
          </form>
        </Card>

        <Card
          title="Public website"
          className="lg:col-span-2"
          actions={
            <Link href="/" target="_blank" className="text-sm font-medium text-brand-700 hover:underline">
              View site ↗
            </Link>
          }
        >
          <form action={savePublicSite} className="grid gap-4 p-4 md:grid-cols-2">
            <p className="text-sm text-gray-500 md:col-span-2">
              This text appears on the school&apos;s public home page. Leave a box empty to use the suggested wording shown in grey. Leave a blank
              line between paragraphs. School name, motto, address, phone and principal come from &ldquo;School details&rdquo;; term dates come
              from &ldquo;Sessions &amp; term dates&rdquo;. Fee amounts are never shown publicly.
            </p>
            <div className="md:col-span-2">
              <Field label="Short introduction (under the school name)">
                <textarea name="tagline" rows={2} defaultValue={settings?.tagline} placeholder={SITE_DEFAULTS.tagline} className="input" />
              </Field>
            </div>
            {(
              [
                ["aboutText", "About the school"],
                ["principalMessage", "Principal's message"],
                ["programmeText", "What we teach"],
                ["admissionsText", "Admissions"],
                ["feesText", "School fees (no amounts needed)"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <textarea name={key} rows={7} defaultValue={settings?.[key]} placeholder={SITE_DEFAULTS[key]} className="input" />
              </Field>
            ))}
            <div className="space-y-4">
              <Field label="School email (optional)">
                <input name="email" type="email" defaultValue={settings?.email} className="input" />
              </Field>
              <Field label="Office hours">
                <textarea name="officeHours" rows={3} defaultValue={settings?.officeHours} placeholder={SITE_DEFAULTS.officeHours} className="input" />
              </Field>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="showStaffPublicly" defaultChecked={settings?.showStaffPublicly ?? true} className="mt-0.5 h-4 w-4 accent-brand-600" />
                <span>
                  Show teachers&apos; names and photos on the website
                  <span className="block text-xs text-gray-500">Turn off to keep the staff list private.</span>
                </span>
              </label>
            </div>
            <div className="md:col-span-2">
              <Button>Save website</Button>
            </div>
          </form>
        </Card>

        <Card title="Current term">
          <form action={setCurrentTerm} className="flex gap-2 p-4">
            <select name="termId" defaultValue={settings?.currentTermId ?? ""} className="input">
              {allTerms.map((t) => (
                <option key={t.id} value={t.id}>
                  {termLabel(t)}
                </option>
              ))}
            </select>
            <Button className="shrink-0">Set current</Button>
          </form>
          <p className="px-4 pb-4 text-xs text-gray-500">The current term is used by default for attendance, fees, scores and reports.</p>
          <form action={createSession} className="flex gap-2 border-t border-gray-100 p-4">
            <input name="name" placeholder="New session e.g. 2027/2028" required className="input" />
            <Button variant="secondary" className="shrink-0">
              Create session
            </Button>
          </form>
        </Card>

        <Card title="Sessions & term dates" className="lg:col-span-2">
          {sessions.map((s) => (
            <div key={s.id} className="border-b border-gray-100 p-4 last:border-0">
              <div className="mb-2 font-medium">{s.name}</div>
              <div className="grid gap-3 md:grid-cols-3">
                {s.terms.map((t) => (
                  <form key={t.id} action={updateTerm.bind(null, t.id)} className="space-y-2 rounded-md bg-gray-50 p-3">
                    <div className="flex items-center justify-between text-sm font-medium">
                      {TERM_NAMES[t.number]} {settings?.currentTermId === t.id && <Badge color="green">Current</Badge>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Starts">
                        <input type="date" name="startDate" defaultValue={toISODate(t.startDate)} className="input py-1" />
                      </Field>
                      <Field label="Ends">
                        <input type="date" name="endDate" defaultValue={toISODate(t.endDate)} className="input py-1" />
                      </Field>
                    </div>
                    <Field label="Next term begins">
                      <input type="date" name="nextTermBegins" defaultValue={t.nextTermBegins ? toISODate(t.nextTermBegins) : ""} className="input py-1" />
                    </Field>
                    <Button variant="secondary" className="py-1 text-xs">
                      Save dates
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          ))}
        </Card>

        <Card title="Assessment & grading">
          <form action={saveGrading} className="space-y-4 p-4">
            <div>
              <div className="label">Assessment components (must total 100)</div>
              <div className="space-y-2">
                {components.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <input name={`c_label_${c.id}`} defaultValue={c.label} className="input" />
                    <input name={`c_max_${c.id}`} type="number" min={0} max={100} defaultValue={c.maxScore} className="input w-24" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="label">Grade bands</div>
              <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Grade</th>
                    <th>Min</th>
                    <th>Max</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {bands.map((b) => (
                    <tr key={b.id}>
                      <td className="font-semibold">{b.grade}</td>
                      <td>
                        <input name={`b_min_${b.id}`} type="number" defaultValue={b.min} className="input w-20 py-1" />
                      </td>
                      <td>
                        <input name={`b_max_${b.id}`} type="number" defaultValue={b.max} className="input w-20 py-1" />
                      </td>
                      <td>
                        <input name={`b_remark_${b.id}`} defaultValue={b.remark} className="input py-1" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
            <Button>Save grading</Button>
          </form>
        </Card>

        <Card title="Promote / graduate students">
          <form action={promoteClass} className="space-y-3 p-4">
            <p className="text-sm text-gray-600">
              At the end of a session, move every active student in one class to another class, or mark them as graduated (e.g. after
              completing the Qur&apos;an). Create the new session&apos;s classes first.
            </p>
            <Field label="From class">
              <select name="fromClassId" className="input">
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {className(c)} ({c.session.name})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="To">
              <select name="toClassId" className="input">
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {className(c)} ({c.session.name})
                  </option>
                ))}
                <option value="graduate">Mark as graduated</option>
              </select>
            </Field>
            <Button variant="secondary">Move students</Button>
          </form>
        </Card>

        <Card title="Activity log (latest 40)" className="lg:col-span-2">
          <div className="max-h-96 overflow-y-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap text-xs text-gray-500">{l.createdAt.toLocaleString("en-GB")}</td>
                    <td>{l.user?.fullName ?? "—"}</td>
                    <td className="font-mono text-xs">{l.action}</td>
                    <td className="text-xs text-gray-600">
                      {l.entity} #{l.entityId} {l.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
