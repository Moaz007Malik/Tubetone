import { json, options, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { addMs, audit, issueLicense, planDurationMs } from "@/lib/licensing";
import { readJson } from "@/lib/http";

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return json(req, { error: "Unauthorized" }, 401);
  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase();
  const licenses = await prisma.license.findMany({
    where: q
      ? {
          OR: [
            { key: { contains: q.toUpperCase() } },
            { subscription: { user: { email: { contains: q } } } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      devices: true,
      subscription: { include: { user: true } },
    },
  });
  return json(req, { licenses });
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return json(req, { error: "Unauthorized" }, 401);
  try {
    const body = await readJson<{
      email?: string;
      name?: string;
      plan?: string;
      days?: number;
      maxDevices?: number;
    }>(req);
    if (!body.email) return json(req, { error: "email required" }, 400);
    const license = await issueLicense({
      email: body.email,
      name: body.name,
      plan: body.plan || "monthly",
      days: body.days,
      maxDevices: body.maxDevices,
      adminId: admin.id,
    });
    return json(req, { ok: true, license, licenseKey: license.key });
  } catch (e) {
    return json(req, { error: e instanceof Error ? e.message : "Failed" }, 400);
  }
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return json(req, { error: "Unauthorized" }, 401);
  try {
    const body = await readJson<{
      id?: string;
      action?: string;
      days?: number;
      plan?: string;
    }>(req);
    if (!body.id || !body.action) {
      return json(req, { error: "id and action required" }, 400);
    }

    const license = await prisma.license.findUnique({
      where: { id: body.id },
      include: { subscription: true },
    });
    if (!license) return json(req, { error: "Not found" }, 404);

    if (body.action === "revoke") {
      await prisma.$transaction([
        prisma.license.update({
          where: { id: license.id },
          data: { status: "revoked" },
        }),
        prisma.subscription.update({
          where: { id: license.subscriptionId },
          data: { status: "revoked" },
        }),
      ]);
      await audit(admin.id, "license.revoke", { licenseId: license.id, key: license.key });
      return json(req, { ok: true });
    }

    if (body.action === "reinstate") {
      const endsAt =
        license.subscription.endsAt.getTime() < Date.now()
          ? addMs(new Date(), planDurationMs(license.subscription.plan))
          : license.subscription.endsAt;
      await prisma.$transaction([
        prisma.license.update({
          where: { id: license.id },
          data: { status: "active" },
        }),
        prisma.subscription.update({
          where: { id: license.subscriptionId },
          data: { status: "active", endsAt },
        }),
      ]);
      await audit(admin.id, "license.reinstate", { licenseId: license.id });
      return json(req, { ok: true });
    }

    if (body.action === "extend") {
      const days = body.days ?? 30;
      const base =
        license.subscription.endsAt.getTime() > Date.now()
          ? license.subscription.endsAt
          : new Date();
      await prisma.subscription.update({
        where: { id: license.subscriptionId },
        data: {
          status: "active",
          endsAt: addMs(base, days * 24 * 60 * 60 * 1000),
          ...(body.plan ? { plan: body.plan } : {}),
        },
      });
      await prisma.license.update({
        where: { id: license.id },
        data: { status: "active" },
      });
      await audit(admin.id, "license.extend", { licenseId: license.id, days });
      return json(req, { ok: true });
    }

    return json(req, { error: "Unknown action" }, 400);
  } catch (e) {
    return json(req, { error: e instanceof Error ? e.message : "Failed" }, 400);
  }
}
