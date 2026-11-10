// Access-control smoke test. Run while the app is running:
//   node scripts/smoke-test.mjs [baseUrl]
// Creates a temporary session for each seeded user and checks which pages they can reach.
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const BASE = process.argv[2] ?? "http://localhost:3000";
const db = new PrismaClient();

async function sessionFor(username) {
  const u = await db.user.findUniqueOrThrow({ where: { username } });
  const id = "smoke_" + randomBytes(16).toString("hex");
  await db.session.create({ data: { id, userId: u.id, expiresAt: new Date(Date.now() + 600_000) } });
  return id;
}

async function get(path, sid) {
  const res = await fetch(BASE + path, { redirect: "manual", headers: sid ? { cookie: `nq_session=${sid}` } : {} });
  const loc = res.headers.get("location") ?? "";
  const body = res.status === 200 ? await res.text() : "";
  return { status: res.status, loc, body };
}

const payment = await db.payment.findFirstOrThrow({ where: { voided: false }, include: { student: true } });
const anyStudent = await db.student.findFirstOrThrow({ where: { classId: { not: null } }, orderBy: { id: "desc" } });
const term = await db.term.findFirstOrThrow({ where: { number: 1 } });
const parentGuardian = await db.guardian.findFirstOrThrow({ where: { user: { username: "parent@nurulquran.local" } }, include: { students: true } });
const parentChildId = parentGuardian.students[0].studentId;

// [user, path, expectation] — "ok" = 200, "deny" = redirect to /forbidden (or 403), "login" = redirect to /login, or "->/x" redirect target
const cases = [
  [null, "/dashboard", "login"],
  ["admin@nurulquran.local", "/dashboard", "ok"],
  ["admin@nurulquran.local", "/students", "ok"],
  ["admin@nurulquran.local", `/students/${anyStudent.id}`, "ok"],
  ["admin@nurulquran.local", "/classes", "ok"],
  ["admin@nurulquran.local", "/attendance", "ok"],
  ["admin@nurulquran.local", "/fees", "ok"],
  ["admin@nurulquran.local", "/fees/record", "ok"],
  ["admin@nurulquran.local", "/fees/payments", "ok"],
  ["admin@nurulquran.local", "/fees/items", "ok"],
  ["admin@nurulquran.local", "/results", "ok"],
  ["admin@nurulquran.local", "/quran", "ok"],
  ["admin@nurulquran.local", "/reports", "ok"],
  ["admin@nurulquran.local", "/reports?tab=remarks", "ok"],
  ["admin@nurulquran.local", "/staff", "ok"],
  ["admin@nurulquran.local", "/settings", "ok"],
  ["admin@nurulquran.local", `/print/receipt/${payment.id}`, "ok"],
  ["admin@nurulquran.local", `/print/report/${term.id}/${anyStudent.id}`, "ok"],
  ["admin@nurulquran.local", `/print/report/${term.id}/class/${anyStudent.classId}`, "ok"],
  ["admin@nurulquran.local", "/students/export", "ok"],
  ["admin@nurulquran.local", `/fees/export?term=${term.id}`, "ok"],
  ["admin@nurulquran.local", "/portal", "->/dashboard"],

  ["bursar@nurulquran.local", "/fees", "ok"],
  ["bursar@nurulquran.local", "/fees/record", "ok"],
  ["bursar@nurulquran.local", `/print/receipt/${payment.id}`, "ok"],
  ["bursar@nurulquran.local", "/students", "ok"],
  ["bursar@nurulquran.local", "/staff", "deny"],
  ["bursar@nurulquran.local", "/settings", "deny"],
  ["bursar@nurulquran.local", "/results", "deny"],
  ["bursar@nurulquran.local", "/attendance", "deny"],

  ["abdullahi@nurulquran.local", "/dashboard", "ok"],
  ["abdullahi@nurulquran.local", "/attendance", "ok"],
  ["abdullahi@nurulquran.local", "/results", "ok"],
  ["abdullahi@nurulquran.local", "/quran", "ok"],
  ["abdullahi@nurulquran.local", "/reports", "ok"],
  ["abdullahi@nurulquran.local", "/fees", "deny"],
  ["abdullahi@nurulquran.local", "/fees/payments", "deny"],
  ["abdullahi@nurulquran.local", `/print/receipt/${payment.id}`, "deny"],
  ["abdullahi@nurulquran.local", `/fees/export?term=${term.id}`, "deny"],
  ["abdullahi@nurulquran.local", "/staff", "deny"],
  ["abdullahi@nurulquran.local", "/classes", "deny"],
  ["abdullahi@nurulquran.local", `/students/${anyStudent.id}`, "deny"], // last student is in another class

  ["arabic@nurulquran.local", "/results", "ok"],
  ["arabic@nurulquran.local", "/fees", "deny"],

  ["parent@nurulquran.local", "/portal", "ok"],
  ["parent@nurulquran.local", "/dashboard", "->/portal"],
  ["parent@nurulquran.local", "/fees", "->/portal"],
  ["parent@nurulquran.local", `/print/receipt/${payment.id}`, payment.studentId === parentChildId ? "ok" : "deny"],
  ["parent@nurulquran.local", `/print/report/${term.id}/${anyStudent.id}`, "deny"],
  [
    "parent@nurulquran.local",
    `/print/report/${term.id}/${parentChildId}`,
    (await db.termReport.findUnique({ where: { studentId_termId: { studentId: parentChildId, termId: term.id } } }))?.published
      ? "ok"
      : "->/portal?notice=unpublished",
  ],

  ["NQ/2026/001", "/portal", "ok"],
  ["NQ/2026/001", "/students", "->/portal"],
];

const sessions = {};
let pass = 0;
let fail = 0;
for (const [user, path, expect] of cases) {
  const sid = user ? (sessions[user] ??= await sessionFor(user)) : undefined;
  const r = await get(path, sid);
  const redirectTo = r.loc.replace(BASE, "");
  let ok;
  if (expect === "ok") ok = r.status === 200;
  else if (expect === "deny") ok = (r.status >= 300 && r.status < 400 && redirectTo.startsWith("/forbidden")) || r.status === 403;
  else if (expect === "login") ok = r.status >= 300 && r.status < 400 && redirectTo.startsWith("/login");
  else ok = r.status >= 300 && r.status < 400 && redirectTo === expect.slice(2);

  // fee figures must never leak into a teacher's dashboard
  if (ok && user?.startsWith("abdullahi") && path === "/dashboard" && /Fees collected|₦/.test(r.body)) ok = false;

  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${(user ?? "anonymous").padEnd(28)} ${path.padEnd(42)} expected ${expect.padEnd(10)} got ${r.status} ${redirectTo}`);
}

await db.session.deleteMany({ where: { id: { startsWith: "smoke_" } } });
await db.$disconnect();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
