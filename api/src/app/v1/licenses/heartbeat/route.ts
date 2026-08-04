import { json, options, rateLimit, readJson } from "@/lib/http";
import { signLicenseToken, verifyLicenseToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { subscriptionValid } from "@/lib/licensing";

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`heartbeat:${ip}`, 120, 60_000)) {
    return json(req, { error: "Too many attempts" }, 429);
  }

  try {
    const body = await readJson<{ token?: string }>(req);
    if (!body.token) return json(req, { error: "token required" }, 400);

    let payload;
    try {
      payload = await verifyLicenseToken(body.token);
    } catch {
      return json(req, { valid: false, reason: "invalid_token" }, 401);
    }

    const license = await prisma.license.findUnique({
      where: { id: payload.lid },
      include: { subscription: { include: { user: true } } },
    });
    if (!license || license.status !== "active") {
      return json(req, { valid: false, reason: "revoked" }, 403);
    }

    const device = await prisma.device.findUnique({
      where: {
        licenseId_fingerprint: {
          licenseId: license.id,
          fingerprint: payload.fp,
        },
      },
    });
    if (!device) {
      return json(req, { valid: false, reason: "device_not_registered" }, 403);
    }

    await prisma.device.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    });

    const check = subscriptionValid(license.subscription);
    if (!check.valid) {
      return json(req, {
        valid: false,
        reason: check.reason,
        status: license.subscription.status,
        endsAt: license.subscription.endsAt.toISOString(),
      }, 403);
    }

    const token = await signLicenseToken({
      lid: license.id,
      sid: license.subscriptionId,
      fp: payload.fp,
    });

    return json(req, {
      valid: true,
      token,
      plan: license.subscription.plan,
      status: license.subscription.status,
      endsAt: license.subscription.endsAt.toISOString(),
      email: license.subscription.user.email,
      offlineGraceHours: Number(process.env.OFFLINE_GRACE_HOURS || 72),
    });
  } catch (e) {
    return json(req, { error: e instanceof Error ? e.message : "Heartbeat failed" }, 400);
  }
}
