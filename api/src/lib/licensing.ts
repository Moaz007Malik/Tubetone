import { randomBytes } from "crypto";
import { prisma } from "./db";
import { sendLicenseEmail } from "./mail";

export function generateLicenseKey(): string {
  const raw = randomBytes(8).toString("hex").toUpperCase();
  // YM-XXXX-XXXX-XXXX
  return `YM-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

/** free_days above this blow past Prisma/Postgres DateTime (year ~275760 JS max is worse). */
export const MAX_FREE_DAYS = 36_500; // ~100 years

/** Hard cap for subscription end — safe for Prisma DateTime. */
const MAX_ENDS_AT = new Date("9999-12-31T23:59:59.999Z");

export function planDurationMs(plan: string, extraDays = 0): number {
  const day = 24 * 60 * 60 * 1000;
  const base =
    plan === "yearly"
      ? 365 * day
      : plan === "trial"
        ? 7 * day
        : 30 * day; // monthly default
  const extra = Math.min(Math.max(0, Math.floor(Number(extraDays) || 0)), MAX_FREE_DAYS);
  return base + extra * day;
}

export function addMs(from: Date, ms: number): Date {
  const safeMs = Math.max(0, Number.isFinite(ms) ? ms : 0);
  const ends = new Date(from.getTime() + safeMs);
  if (!Number.isFinite(ends.getTime()) || ends > MAX_ENDS_AT) {
    return new Date(MAX_ENDS_AT);
  }
  // Guard absurd years (e.g. free_days=9999999 → year 29406)
  if (ends.getUTCFullYear() > 9999) {
    return new Date(MAX_ENDS_AT);
  }
  return ends;
}

export async function audit(adminId: string | null, action: string, meta?: unknown) {
  await prisma.auditLog.create({
    data: {
      adminId,
      action,
      meta: meta == null ? null : JSON.stringify(meta),
    },
  });
}

/** Email must never block / fail license issuance (SMTP often hangs on serverless). */
function queueLicenseEmail(opts: {
  adminId: string | null;
  to: string;
  licenseKey: string;
  plan: string;
  endsAt: Date;
}) {
  void (async () => {
    try {
      const mail = await sendLicenseEmail({
        to: opts.to,
        licenseKey: opts.licenseKey,
        plan: opts.plan,
        endsAt: opts.endsAt,
      });
      await audit(opts.adminId, "email.license", {
        to: opts.to,
        sent: mail.sent,
        skipped: mail.skipped || false,
        error: mail.error || null,
      });
    } catch (e) {
      console.error("[licensing] email queue failed", e);
      try {
        await audit(opts.adminId, "email.license", {
          to: opts.to,
          sent: false,
          error: e instanceof Error ? e.message : "email failed",
        });
      } catch {
        /* ignore */
      }
    }
  })();
}

export async function fulfillOrder(orderId: string, adminId: string | null) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");

  if (order.status === "paid" && order.licenseId) {
    return prisma.license.findUnique({
      where: { id: order.licenseId },
      include: { subscription: { include: { user: true } } },
    });
  }

  if (order.status === "rejected") {
    throw new Error("Order was rejected — create a new order to issue a license");
  }

  if (order.status !== "pending") {
    throw new Error(`Only pending orders can be marked paid (current: ${order.status})`);
  }

  let extraDays = 0;
  if (order.couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: order.couponCode.toUpperCase() },
    });
    if (coupon && coupon.active) {
      if (!coupon.expiresAt || coupon.expiresAt > new Date()) {
        if (coupon.maxUses === 0 || coupon.usedCount < coupon.maxUses) {
          if (coupon.type === "free_days") {
            const n = Math.floor(Number(coupon.value) || 0);
            extraDays = Math.min(Math.max(0, n), MAX_FREE_DAYS);
          }
          await prisma.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        }
      }
    }
  }

  const email = order.email.toLowerCase().trim();
  const now = new Date();

  // Sequential writes (no interactive $transaction) — Neon pooler often rejects Prisma interactive txns
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: order.name || null,
        updatedAt: now,
      },
    });
  }

  const sub = await prisma.subscription.create({
    data: {
      userId: user.id,
      plan: order.plan,
      status: "active",
      startsAt: now,
      endsAt: addMs(now, planDurationMs(order.plan, extraDays)),
      maxDevices: 2,
      updatedAt: now,
    },
  });

  let key = generateLicenseKey();
  while (await prisma.license.findUnique({ where: { key } })) {
    key = generateLicenseKey();
  }

  const license = await prisma.license.create({
    data: {
      key,
      subscriptionId: sub.id,
      status: "active",
      updatedAt: now,
    },
    include: { subscription: { include: { user: true } } },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "paid",
      userId: user.id,
      licenseId: license.id,
      updatedAt: now,
    },
  });

  await audit(adminId, "order.paid", {
    orderId,
    licenseKey: key,
    userId: user.id,
  });

  queueLicenseEmail({
    adminId,
    to: email,
    licenseKey: key,
    plan: order.plan,
    endsAt: license.subscription.endsAt,
  });

  return license;
}

export async function issueLicense(opts: {
  email: string;
  name?: string;
  plan: string;
  days?: number;
  maxDevices?: number;
  adminId?: string | null;
}) {
  const email = opts.email.toLowerCase().trim();
  const now = new Date();

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, name: opts.name || null, updatedAt: now },
    });
  }

  const ms =
    opts.days != null ? opts.days * 24 * 60 * 60 * 1000 : planDurationMs(opts.plan);

  const sub = await prisma.subscription.create({
    data: {
      userId: user.id,
      plan: opts.plan,
      status: "active",
      startsAt: now,
      endsAt: addMs(now, ms),
      maxDevices: opts.maxDevices ?? 2,
      updatedAt: now,
    },
  });

  let key = generateLicenseKey();
  while (await prisma.license.findUnique({ where: { key } })) {
    key = generateLicenseKey();
  }

  const license = await prisma.license.create({
    data: { key, subscriptionId: sub.id, status: "active", updatedAt: now },
    include: { subscription: { include: { user: true } }, devices: true },
  });

  await audit(opts.adminId ?? null, "license.issue", {
    licenseKey: key,
    email,
    plan: opts.plan,
  });

  queueLicenseEmail({
    adminId: opts.adminId ?? null,
    to: email,
    licenseKey: key,
    plan: opts.plan,
    endsAt: license.subscription.endsAt,
  });

  return license;
}

export function subscriptionValid(sub: {
  status: string;
  endsAt: Date;
}): { valid: boolean; reason?: string } {
  if (sub.status === "revoked") return { valid: false, reason: "revoked" };
  if (sub.status === "canceled") return { valid: false, reason: "canceled" };
  if (sub.endsAt.getTime() < Date.now()) return { valid: false, reason: "expired" };
  if (sub.status !== "active" && sub.status !== "past_due") {
    return { valid: false, reason: sub.status };
  }
  return { valid: true };
}
