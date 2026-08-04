import { PrismaClient } from "@prisma/client";

/**
 * Env vars come from Next.js / Vercel (do not import dotenv — breaks webpack build).
 * Use a free Postgres URL (Neon / Supabase / Vercel Postgres), e.g.:
 * postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
 */
function resolveDatabaseUrl(): string {
  const url = (process.env.DATABASE_URL || "").trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is missing. Set a Postgres connection string (Neon free tier works on Vercel)."
    );
  }
  if (url.startsWith("file:")) {
    throw new Error(
      "SQLite (file:) is not supported. Use a free Postgres URL from neon.tech or supabase.com."
    );
  }
  return url;
}

const databaseUrl = resolveDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { databaseUrl };
