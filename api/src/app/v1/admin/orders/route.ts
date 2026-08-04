import { json, options, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { fulfillOrder, audit } from "@/lib/licensing";
import { readJson } from "@/lib/http";
import { ensureDbReady, dbErrorHint, isDbConnectivityError } from "@/lib/ensure-db";

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return json(req, { error: "Unauthorized" }, 401);
  try {
    await ensureDbReady();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const orders = await prisma.order.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { license: true, user: true },
    });
    return json(req, { orders });
  } catch (e) {
    console.error("[admin/orders GET]", e);
    if (isDbConnectivityError(e)) {
      return json(req, { error: dbErrorHint(e) }, 503);
    }
    return json(req, { error: e instanceof Error ? e.message : "Failed" }, 500);
  }
}

function prismaErrorMessage(e: unknown): string {
  if (!(e instanceof Error)) return "Failed";
  // PrismaClientKnownRequestError has code/meta
  const pe = e as Error & { code?: string; meta?: unknown };
  if (pe.code) {
    return `${pe.message}${pe.meta ? ` (${JSON.stringify(pe.meta)})` : ""}`;
  }
  return pe.message;
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return json(req, { error: "Unauthorized" }, 401);
  try {
    await ensureDbReady();
    const body = await readJson<{ id?: string; action?: string }>(req);
    if (!body.id || !body.action) {
      return json(req, { error: "id and action required" }, 400);
    }
    if (body.action === "pay") {
      const license = await fulfillOrder(body.id, admin.id);
      return json(req, {
        ok: true,
        licenseKey: license?.key ?? null,
        // Keep response small — avoid serializing deep graphs that can blow up
        orderId: body.id,
      });
    }
    if (body.action === "reject") {
      await prisma.order.update({
        where: { id: body.id },
        data: { status: "rejected", updatedAt: new Date() },
      });
      await audit(admin.id, "order.reject", { orderId: body.id });
      return json(req, { ok: true });
    }
    return json(req, { error: "Unknown action" }, 400);
  } catch (e) {
    console.error("[admin/orders PATCH]", e);
    if (isDbConnectivityError(e)) {
      return json(req, { error: dbErrorHint(e) }, 503);
    }
    return json(req, { error: prismaErrorMessage(e) }, 400);
  }
}
