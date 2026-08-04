import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const globalReady = globalThis as unknown as { __ytmpDbReady?: Promise<void> };

/**
 * Seed default admin + app config if missing.
 * Schema is applied at build/deploy via `prisma db push`.
 */
export function ensureDbReady(): Promise<void> {
  if (!globalReady.__ytmpDbReady) {
    globalReady.__ytmpDbReady = initDb().catch((err) => {
      globalReady.__ytmpDbReady = undefined;
      throw err;
    });
  }
  return globalReady.__ytmpDbReady;
}

async function initDb() {
  await seedAdminIfNeeded();
  await seedAppConfigIfNeeded();
}

async function seedAdminIfNeeded() {
  const count = await prisma.admin.count();
  if (count > 0) return;

  const email = (process.env.ADMIN_EMAIL || "admin@ytmp.app").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "admin123!";
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.admin.create({
    data: {
      email,
      passwordHash,
    },
  });
  console.info("[ytmp-api] Seeded admin user:", email);
}

async function seedAppConfigIfNeeded() {
  const existing = await prisma.appConfig.findUnique({ where: { id: "default" } });
  if (existing) return;
  await prisma.appConfig.create({
    data: {
      id: "default",
      value: JSON.stringify({
        plans: {
          trial: { label: "Trial", priceDisplay: "Free", days: 7 },
          monthly: { label: "Monthly", priceDisplay: "$5/mo", days: 30 },
          yearly: { label: "Yearly", priceDisplay: "$49/yr", days: 365 },
        },
        downloadUrl: process.env.DOWNLOAD_URL || "",
        supportEmail: process.env.SUPPORT_EMAIL || "",
      }),
    },
  });
}

export function isDbConnectivityError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /Unable to open|does not exist|P1001|P1017|P2021|no such table|ECONNREFUSED|connect ECONNREFUSED|Can't reach database|protocol `file:`|DATABASE_URL/i.test(
    msg
  );
}

export function dbErrorHint(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (process.env.VERCEL) {
    return (
      "Database error. On Vercel set DATABASE_URL to a free Postgres URL " +
      "(Neon: https://neon.tech — copy the pooled connection string with sslmode=require). " +
      "Also set JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD. Redeploy so `prisma db push` can create tables. Detail: " +
      msg
    );
  }
  return msg;
}
