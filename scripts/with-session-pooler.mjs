// Runs a command with SUPABASE_DIRECT_URL pointed at Supabase's *session* pooler.
//
//   node --env-file=.env scripts/with-session-pooler.mjs npx prisma migrate deploy
//
// Supabase's "direct connection" host (db.<ref>.supabase.co) is IPv6-only, which many
// home and VPS networks can't reach. The session pooler is the same host as the
// transaction pooler in SUPABASE_DATABASE_URL, on port 5432, and works over IPv4.
// Nothing is printed: the connection string stays inside this process.
import { spawnSync } from "node:child_process";

const pooled = process.env.SUPABASE_DATABASE_URL;
if (!pooled) {
  console.error("SUPABASE_DATABASE_URL is not set.");
  process.exit(1);
}
const url = new URL(pooled);
if (!url.hostname.includes("pooler.supabase.com")) {
  console.error("SUPABASE_DATABASE_URL is not a Supabase pooler address; leaving SUPABASE_DIRECT_URL unchanged.");
} else {
  url.port = "5432";
  url.searchParams.delete("pgbouncer");
  process.env.SUPABASE_DIRECT_URL = url.toString();
}

// Optional: point both connections at a separate Postgres schema (e.g. a throwaway test copy).
if (process.env.NQ_SCHEMA) {
  for (const key of ["SUPABASE_DATABASE_URL", "SUPABASE_DIRECT_URL"]) {
    const u = new URL(process.env[key]);
    u.searchParams.set("schema", process.env.NQ_SCHEMA);
    process.env[key] = u.toString();
  }
}

// Transaction-pooler connections need Prisma's PgBouncer mode.
{
  const u = new URL(process.env.SUPABASE_DATABASE_URL);
  if (u.port === "6543" && !u.searchParams.has("pgbouncer")) u.searchParams.set("pgbouncer", "true");
  process.env.SUPABASE_DATABASE_URL = u.toString();
}

const [cmd, ...args] = process.argv.slice(2);
const r = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32", env: process.env });
process.exit(r.status ?? 1);
