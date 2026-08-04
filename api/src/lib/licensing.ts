import { randomBytes } from "crypto";
import { prisma } from "./db";
import { sendLicenseEmail } from "./mail";

export function generateLicenseKey(): string {
  const raw = randomBytes(8).toString("hex").toUpperCase();
  // YM-XXXX-XXXX-XXXX
  return `YM-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

export function planDurationMs(plan: string, extraDays = 0): number {
  const day = 24 * 60 * 60 * 1000;
  const base =
    plan === "yearly"
      ? 365 * day
      : plan === "trial"
        ? 7 * day
        : 30 * day; // monthly default
  return base + extraDays * day;
}

export function addMs(from: Date, ms: number): Date {
  return new Date(from.getTime() + ms);
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

export async function fulfillOrder(orderId: string, adminId: string | null) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");
  if (order.status === "paid" && order.licenseId) {
    return prisma.license.findUnique({
      where: { id: order.licenseId },
      include: { subscription: { include: { user: true } } },
    });
  }

  let extraDays = 0;
  if (order.couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: order.couponCode.toUpperCase() },
    });
    if (coupon && coupon.active) {
      if (!coupon.expiresAt || coupon.expiresAt > new Date()) {
        if (coupon.maxUses === 0 || coupon.usedCount < coupon.maxUses) {
          if (coupon.type === "free_days") extraDays = Math.floor(coupon.value);
          await prisma.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        }
      }
    }
  }

  const email = order.email.toLowerCase().trim();
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, name: order.name || null },
    });
  }

  const now = new Date();
  const sub = await prisma.subscription.create({
    data: {
      userId: user.id,
      plan: order.plan,
      status: "active",
      startsAt: now,
      endsAt: addMs(now, planDurationMs(order.plan, extraDays)),
      maxDevices: 2,
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
    },
    include: { subscription: { include: { user: true } } },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "paid",
      userId: user.id,
      licenseId: license.id,
    },
  });

  await audit(adminId, "order.paid", { orderId, licenseKey: key, userId: user.id });
  const mail = await sendLicenseEmail({
    to: email,
    licenseKey: key,
    plan: order.plan,
    endsAt: license.subscription.endsAt,
  });
  await audit(adminId, "email.license", {
    to: email,
    sent: mail.sent,
    skipped: mail.skipped || false,
    error: mail.error || null,
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
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, name: opts.name || null },
    });
  }

  const now = new Date();
  const ms =
    opts.days != null
      ? opts.days * 24 * 60 * 60 * 1000
      : planDurationMs(opts.plan);

  const sub = await prisma.subscription.create({
    data: {
      userId: user.id,
      plan: opts.plan,
      status: "active",
      startsAt: now,
      endsAt: addMs(now, ms),
      maxDevices: opts.maxDevices ?? 2,
    },
  });

  let key = generateLicenseKey();
  while (await prisma.license.findUnique({ where: { key } })) {
    key = generateLicenseKey();
  }

  const license = await prisma.license.create({
    data: { key, subscriptionId: sub.id, status: "active" },
    include: { subscription: { include: { user: true } }, devices: true },
  });

  await audit(opts.adminId ?? null, "license.issue", {
    licenseKey: key,
    email,
    plan: opts.plan,
  });

  const mail = await sendLicenseEmail({
    to: email,
    licenseKey: key,
    plan: opts.plan,
    endsAt: license.subscription.endsAt,
  });
  await audit(opts.adminId ?? null, "email.license", {
    to: email,
    sent: mail.sent,
    skipped: mail.skipped || false,
    error: mail.error || null,
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
