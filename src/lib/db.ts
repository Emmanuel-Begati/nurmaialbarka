import { PrismaClient } from "@prisma/client";

/**
 * Supabase's transaction pooler (port 6543) can't keep prepared statements between
 * queries, so Prisma must be told it's talking to PgBouncer. Add the flag if the
 * connection string in .env doesn't already have it.
 */
function databaseUrl() {
  const raw = process.env.SUPABASE_DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.port === "6543" && !url.searchParams.has("pgbouncer")) url.searchParams.set("pgbouncer", "true");
    return url.toString();
  } catch {
    return raw;
  }
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: databaseUrl() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
