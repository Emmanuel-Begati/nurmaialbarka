import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { parseRoles, ROLE_LABELS } from "@/lib/auth/roles";
import { className } from "@/lib/format";
import { Alert, Badge, Button, Card, Field, PageHeader } from "@/components/ui";
import { ConfirmDelete } from "@/components/confirm";
import { Avatar } from "@/components/avatar";
import { PhotoInput } from "@/components/photo-input";
import { photoUrl } from "@/lib/photo-url";
import { createStaff, deleteStaff, updateStaff } from "./actions";

const STAFF_ROLES = [
  { key: "admin", hint: "Full access, manages staff and settings" },
  { key: "bursar", hint: "Can see and record school fees" },
  { key: "teacher", hint: "Attendance, scores and remarks for assigned classes" },
] as const;

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const me = await requireRole("admin");
  const { error, notice } = await searchParams;
  const staff = await db.user.findMany({
    where: { OR: [{ roles: { contains: "admin" } }, { roles: { contains: "bursar" } }, { roles: { contains: "teacher" } }] },
    include: { classesTaught: { include: { classTeacher: true } }, subjectsTaught: { include: { subject: true } } },
    orderBy: [{ active: "desc" }, { fullName: "asc" }],
  });

  return (
    <>
      <PageHeader title="Staff & users" subtitle="Only staff with the Bursar or Admin role can see school fees." />
      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Staff accounts" className="lg:col-span-2">
          <ul className="divide-y divide-gray-100">
            {staff.map((u) => {
              const roles = parseRoles(u.roles);
              return (
                <li key={u.id} className="p-4">
                  <details>
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={u.fullName} src={photoUrl("staff", u.id, u.photoAt)} />
                      <div className="min-w-0">
                        <div className="font-medium">
                          {u.title} {u.fullName} {!u.active && <Badge color="red">Disabled</Badge>}
                        </div>
                        <div className="text-xs text-gray-500">
                          {u.username}
                          {u.classesTaught.length > 0 && ` · Class teacher: ${u.classesTaught.map(className).join(", ")}`}
                          {u.subjectsTaught.length > 0 && ` · ${u.subjectsTaught.length} subject assignments`}
                        </div>
                      </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {roles.map((r) => (
                          <Badge key={r} color={r === "admin" ? "blue" : r === "bursar" ? "amber" : "gray"}>
                            {ROLE_LABELS[r]}
                          </Badge>
                        ))}
                      </div>
                    </summary>
                    <form action={updateStaff.bind(null, u.id)} className="mt-4 grid gap-3 rounded-md bg-gray-50 p-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <PhotoInput name={u.fullName} currentUrl={photoUrl("staff", u.id, u.photoAt)} />
                      </div>
                      <Field label="Title">
                        <input name="title" defaultValue={u.title} className="input" />
                      </Field>
                      <Field label="Full name">
                        <input name="fullName" defaultValue={u.fullName} required className="input" />
                      </Field>
                      <Field label="Login email" hint={u.id === me.id ? "You'll use the new email next time you log in" : "They'll use this to log in"}>
                        <input name="username" type="email" defaultValue={u.username} required autoComplete="off" className="input" />
                      </Field>
                      <Field label="Phone">
                        <input name="phone" defaultValue={u.phone} className="input" />
                      </Field>
                      <Field label="New password" hint="Leave blank to keep current">
                        <input name="password" type="password" minLength={6} className="input" />
                      </Field>
                      <div className="flex flex-wrap gap-4 sm:col-span-2">
                        {STAFF_ROLES.map((r) => (
                          <label key={r.key} className="flex items-center gap-1.5 text-sm">
                            <input type="checkbox" name={`role_${r.key}`} defaultChecked={roles.includes(r.key)} className="h-4 w-4 accent-brand-600" />
                            {ROLE_LABELS[r.key]}
                          </label>
                        ))}
                        <label className="flex items-center gap-1.5 text-sm">
                          <input type="checkbox" name="active" defaultChecked={u.active} disabled={u.id === me.id} className="h-4 w-4 accent-brand-600" />
                          Account active
                        </label>
                      </div>
                      <div>
                        <Button>Save</Button>
                      </div>
                    </form>
                    {u.id !== me.id && (
                      <form action={deleteStaff.bind(null, u.id)} className="mt-3">
                        <ConfirmDelete
                          label="Delete staff member"
                          warning={
                            <>
                              Delete <strong>{`${u.title} ${u.fullName}`.trim()}</strong>? They will be removed from every class and subject they
                              teach. If they have taken registers or recorded payments, the account is disabled instead of erased so those
                              records stay intact.
                            </>
                          }
                        />
                      </form>
                    )}
                  </details>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Add staff member">
          <form action={createStaff} className="space-y-3 p-4">
            <PhotoInput name="New staff" />
            <div className="grid grid-cols-3 gap-2">
              <Field label="Title">
                <select name="title" className="input">
                  <option>Ustadh</option>
                  <option>Ustadha</option>
                  <option>Mallam</option>
                  <option>Sheikh</option>
                  <option>Mr</option>
                  <option>Mrs</option>
                  <option>Miss</option>
                  <option value="">(none)</option>
                </select>
              </Field>
              <div className="col-span-2">
                <Field label="Full name">
                  <input name="fullName" required className="input" />
                </Field>
              </div>
            </div>
            <Field label="Email (used to log in)">
              <input name="username" type="email" required className="input" />
            </Field>
            <Field label="Phone">
              <input name="phone" className="input" />
            </Field>
            <Field label="Password">
              <input name="password" type="password" minLength={6} required className="input" />
            </Field>
            <div className="space-y-1.5">
              <span className="label">Roles</span>
              {STAFF_ROLES.map((r) => (
                <label key={r.key} className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name={`role_${r.key}`} defaultChecked={r.key === "teacher"} className="mt-0.5 h-4 w-4 accent-brand-600" />
                  <span>
                    {ROLE_LABELS[r.key]}
                    <span className="block text-xs text-gray-500">{r.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <Button>Create account</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
