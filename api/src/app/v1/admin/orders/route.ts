import { json, options, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { fulfillOrder, audit } from "@/lib/licensing";
import { readJson } from "@/lib/http";

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return json(req, { error: "Unauthorized" }, 401);
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const orders = await prisma.order.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { license: true, user: true },
  });
  return json(req, { orders });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return json(req, { error: "Unauthorized" }, 401);
  try {
    const body = await readJson<{ id?: string; action?: string }>(req);
    if (!body.id || !body.action) {
      return json(req, { error: "id and action required" }, 400);
    }
    if (body.action === "pay") {
      const license = await fulfillOrder(body.id, admin.id);
      return json(req, {
        ok: true,
        licenseKey: license?.key,
        license,
      });
    }
    if (body.action === "reject") {
      await prisma.order.update({
        where: { id: body.id },
        data: { status: "rejected" },
      });
      await audit(admin.id, "order.reject", { orderId: body.id });
      return json(req, { ok: true });
    }
    return json(req, { error: "Unknown action" }, 400);
  } catch (e) {
    return json(req, { error: e instanceof Error ? e.message : "Failed" }, 400);
  }
}
