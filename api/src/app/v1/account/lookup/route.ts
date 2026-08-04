import { json, options, readJson } from "@/lib/http";
import { prisma } from "@/lib/db";
import { subscriptionValid } from "@/lib/licensing";

export async function OPTIONS(req: Request) {
  return options(req);
}

/** Account lookup by email + license key (public, limited). */
export async function POST(req: Request) {
  try {
    const body = await readJson<{ email?: string; key?: string }>(req);
    const email = (body.email || "").toLowerCase().trim();
    const key = (body.key || "").trim().toUpperCase();
    if (!email || !key) return json(req, { error: "email and key required" }, 400);

    const license = await prisma.license.findUnique({
      where: { key },
      include: {
        subscription: { include: { user: true } },
        devices: true,
      },
    });
    if (!license || license.subscription.user.email !== email) {
      return json(req, { error: "No matching license" }, 404);
    }

    const check = subscriptionValid(license.subscription);
    return json(req, {
      email,
      licenseKey: license.key,
      plan: license.subscription.plan,
      status: license.subscription.status,
      valid: check.valid,
      reason: check.reason ?? null,
      endsAt: license.subscription.endsAt.toISOString(),
      maxDevices: license.subscription.maxDevices,
      devices: license.devices.map((d) => ({
        machineName: d.machineName,
        lastSeenAt: d.lastSeenAt.toISOString(),
      })),
    });
  } catch (e) {
    return json(req, { error: e instanceof Error ? e.message : "Lookup failed" }, 400);
  }
}
