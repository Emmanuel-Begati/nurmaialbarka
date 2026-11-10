// One-off: copy every record from the old SQLite database into the new PostgreSQL (Supabase) database.
//
//   node --env-file=.env scripts/copy-sqlite-to-postgres.mjs [path/to/old.db] [--reset]
//
// - Reads the SQLite file read-only (default prisma/dev.db). It is never modified.
// - Writes through SUPABASE_DIRECT_URL (falls back to SUPABASE_DATABASE_URL).
// - Refuses to run if the target already has data, unless --reset is given, which empties the target tables first.
// - Login sessions are not copied: everyone simply logs in again.
import { DatabaseSync } from "node:sqlite";
import { Prisma, PrismaClient } from "@prisma/client";

const args = process.argv.slice(2);
const reset = args.includes("--reset");
const sqlitePath = args.find((a) => !a.startsWith("--")) ?? "prisma/dev.db";

// Parents first, so foreign keys always point at rows that already exist.
const ORDER = [
  "AcademicSession", "Term", "SchoolSettings", "User", "Class", "Subject", "ClassSubject",
  "Student", "Guardian", "StudentGuardian", "Enrollment", "Attendance", "FeeItem", "Payment",
  "AssessmentComponent", "GradeBand", "Score", "QuranProgress", "TermReport", "AuditLog", "Photo",
];
const SKIP = new Set(["Session"]);

const src = new DatabaseSync(sqlitePath, { readOnly: true });
const dst = new PrismaClient({ datasourceUrl: process.env.SUPABASE_DIRECT_URL || process.env.SUPABASE_DATABASE_URL });
console.log(`Target schema: ${new URL(process.env.SUPABASE_DIRECT_URL || process.env.SUPABASE_DATABASE_URL).searchParams.get("schema") || "public"}`);
const models = Object.fromEntries(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]));

const missing = Object.keys(models).filter((m) => !ORDER.includes(m) && !SKIP.has(m));
if (missing.length) throw new Error(`Copy order is missing models: ${missing.join(", ")}`);

// raw SQL below must name the schema explicitly (the pooler may share connections between schemas)
const targetUrl = process.env.SUPABASE_DIRECT_URL || process.env.SUPABASE_DATABASE_URL;
const SCHEMA = new URL(targetUrl).searchParams.get("schema") || "public";
if (!/^[a-z_][a-z0-9_]*$/i.test(SCHEMA)) throw new Error("Unexpected schema name");
const qt = (t) => `"${SCHEMA}"."${t}"`;

const delegate = (name) => dst[name[0].toLowerCase() + name.slice(1)];

function convert(field, v) {
  if (v === null || v === undefined) return null;
  switch (field.type) {
    case "Boolean": return v === 1 || v === true || v === "1" || v === "true";
    case "DateTime": return new Date(typeof v === "string" && /^\d+$/.test(v) ? Number(v) : v);
    case "Bytes": return Buffer.from(v);
    case "Int": return Number(v);
    case "Float": return Number(v);
    default: return v;
  }
}

async function main() {
  // safety: never mix into a database that already has school data
  const existing = await delegate("User").count();
  if (existing > 0 && !reset) {
    console.error(`Target database already has ${existing} users. Re-run with --reset to empty it and copy again.`);
    process.exit(1);
  }
  if (reset) {
    const list = [...ORDER, ...SKIP].map(qt).join(", ");
    await dst.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
    console.log("Target tables emptied.");
  }

  const report = [];
  for (const name of ORDER) {
    const scalars = models[name].fields.filter((f) => f.kind === "scalar" || f.kind === "enum");
    const rows = src.prepare(`SELECT * FROM "${name}"`).all();
    const data = rows.map((r) => Object.fromEntries(scalars.map((f) => [f.name, convert(f, r[f.name])])));
    const chunk = name === "Photo" ? 20 : 500;
    for (let i = 0; i < data.length; i += chunk) await delegate(name).createMany({ data: data.slice(i, i + chunk) });

    // move the auto-increment counter past the copied ids so new records don't collide
    const idField = scalars.find((f) => f.isId && f.type === "Int" && f.hasDefaultValue);
    if (idField) {
      await dst.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('${qt(name)}', '${idField.name}'), COALESCE((SELECT MAX("${idField.name}") FROM ${qt(name)}), 0) + 1, false)`,
      );
    }
    const copied = await delegate(name).count();
    report.push({ table: name, sqlite: rows.length, postgres: copied, ok: rows.length === copied ? "yes" : "NO" });
  }
  console.table(report);
  if (report.some((r) => r.ok !== "yes")) process.exit(1);
  console.log("All records copied.");
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  })
  .finally(() => dst.$disconnect());
