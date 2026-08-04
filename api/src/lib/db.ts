import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/**
 * Resolve DATABASE_URL for the runtime.
 * On Vercel, only /tmp is writable — file:./data/* fails and causes login 400s.
 */
function resolveDatabaseUrl(): string {
  let url = (process.env.DATABASE_URL || "file:./data/tubetone.db").trim();
  if (process.env.VERCEL && url.startsWith("file:")) {
    url = "file:/tmp/ytmp.db";
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
