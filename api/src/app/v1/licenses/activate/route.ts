import { json, options, rateLimit, readJson } from "@/lib/http";
import { signLicenseToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { subscriptionValid } from "@/lib/licensing";

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`activate:${ip}`, 40, 60_000)) {
    return json(req, { error: "Too many attempts" }, 429);
  }

  try {
    const body = await readJson<{
      key?: string;
      fingerprint?: string;
      machineName?: string;
    }>(req);

    const key = (body.key || "").trim().toUpperCase();
    const fingerprint = (body.fingerprint || "").trim();
    if (!key || !fingerprint) {
      return json(req, { error: "key and fingerprint required" }, 400);
    }

    const license = await prisma.license.findUnique({
      where: { key },
      include: {
        subscription: { include: { user: true } },
        devices: true,
      },
    });
    if (!license || license.status !== "active") {
      return json(req, { error: "Invalid or revoked license key" }, 403);
    }

    const check = subscriptionValid(license.subscription);
    if (!check.valid) {
      return json(req, { error: `Subscription ${check.reason}`, reason: check.reason }, 403);
    }

    const existing = license.devices.find((d) => d.fingerprint === fingerprint);
    if (!existing) {
      if (license.devices.length >= license.subscription.maxDevices) {
        return json(
          req,
          {
            error: "Device limit reached",
            maxDevices: license.subscription.maxDevices,
            devices: license.devices.map((d) => ({
              id: d.id,
              machineName: d.machineName,
              lastSeenAt: d.lastSeenAt,
            })),
          },
          403
        );
      }
      await prisma.device.create({
        data: {
          licenseId: license.id,
          fingerprint,
          machineName: body.machineName || null,
        },
      });
    } else {
      await prisma.device.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: new Date(),
          machineName: body.machineName || existing.machineName,
        },
      });
    }

    const token = await signLicenseToken({
      lid: license.id,
      sid: license.subscriptionId,
      fp: fingerprint,
    });

    return json(req, {
      ok: true,
      token,
      licenseKey: license.key,
      plan: license.subscription.plan,
      status: license.subscription.status,
      endsAt: license.subscription.endsAt.toISOString(),
      email: license.subscription.user.email,
      maxDevices: license.subscription.maxDevices,
      offlineGraceHours: Number(process.env.OFFLINE_GRACE_HOURS || 72),
    });
  } catch (e) {
    return json(req, { error: e instanceof Error ? e.message : "Activate failed" }, 400);
  }
}
