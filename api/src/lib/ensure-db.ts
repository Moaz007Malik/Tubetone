import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const globalReady = globalThis as unknown as { __ytmpDbReady?: Promise<void> };

/**
 * Ensure SQLite tables + default admin exist (especially on Vercel /tmp).
 * Idempotent; safe to call at the start of request handlers.
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
  await createTablesIfNeeded();
  await seedAdminIfNeeded();
  await seedAppConfigIfNeeded();
}

async function isSqlite(): Promise<boolean> {
  try {
    await prisma.$queryRawUnsafe(`SELECT 1 FROM sqlite_master LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

async function tableExists(name: string): Promise<boolean> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ name: string }[]>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      name
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

async function createTablesIfNeeded() {
  if (!(await isSqlite())) return;
  if (await tableExists("Admin")) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "name" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Subscription" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "plan" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "startsAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "endsAt" DATETIME NOT NULL,
      "maxDevices" INTEGER NOT NULL DEFAULT 2,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON "Subscription"("userId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "License" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "key" TEXT NOT NULL,
      "subscriptionId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "License_key_key" ON "License"("key");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "License_subscriptionId_idx" ON "License"("subscriptionId");`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Device" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "licenseId" TEXT NOT NULL,
      "fingerprint" TEXT NOT NULL,
      "machineName" TEXT,
      "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Device_licenseId_fingerprint_key" ON "Device"("licenseId", "fingerprint");`
  );
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Device_licenseId_idx" ON "Device"("licenseId");`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Coupon" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "code" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "value" REAL NOT NULL,
      "maxUses" INTEGER NOT NULL DEFAULT 0,
      "usedCount" INTEGER NOT NULL DEFAULT 0,
      "expiresAt" DATETIME,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code");`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Order" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "name" TEXT,
      "plan" TEXT NOT NULL,
      "couponCode" TEXT,
      "note" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "userId" TEXT,
      "licenseId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_email_idx" ON "Order"("email");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Admin" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Admin_email_key" ON "Admin"("email");`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "adminId" TEXT,
      "action" TEXT NOT NULL,
      "meta" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AppConfig" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "value" TEXT NOT NULL
    );
  `);

  console.info("[ytmp-api] SQLite schema created");
}

async function seedAdminIfNeeded() {
  const count = await prisma.admin.count();
  if (count > 0) return;

  const email = (process.env.ADMIN_EMAIL || "admin@ytmp.app").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "admin123!";
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();
  await prisma.admin.create({
    data: {
      email,
      passwordHash,
      updatedAt: now,
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
  return /Unable to open|does not exist|P1001|P1017|P2021|no such table|ECONNREFUSED|SQLITE_CANTOPEN|connect ECONNREFUSED/i.test(
    msg
  );
}

export function dbErrorHint(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (process.env.VERCEL) {
    return (
      "Database error on Vercel. Set JWT_SECRET (32+ random chars), ADMIN_EMAIL, ADMIN_PASSWORD. " +
      "SQLite on serverless is ephemeral (/tmp). For durable data use Neon Postgres + prisma. Detail: " +
      msg
    );
  }
  return msg;
}
