import { json, options, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { audit, MAX_FREE_DAYS } from "@/lib/licensing";
import { readJson } from "@/lib/http";

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return json(req, { error: "Unauthorized" }, 401);
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return json(req, { coupons });
}

function clampCouponValue(type: string, value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (type === "free_days") return Math.min(Math.floor(n), MAX_FREE_DAYS);
  if (type === "percent") return Math.min(n, 100);
  return n;
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return json(req, { error: "Unauthorized" }, 401);
  try {
    const body = await readJson<{
      code?: string;
      type?: string;
      value?: number;
      maxUses?: number;
      expiresAt?: string | null;
      active?: boolean;
    }>(req);
    const code = (body.code || "").trim().toUpperCase();
    const type = body.type || "percent";
    if (!code || body.value == null) {
      return json(req, { error: "code and value required" }, 400);
    }
    if (!["percent", "fixed", "free_days"].includes(type)) {
      return json(req, { error: "Invalid type" }, 400);
    }
    const coupon = await prisma.coupon.create({
      data: {
        code,
        type,
        value: clampCouponValue(type, body.value),
        maxUses: body.maxUses ?? 0,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        active: body.active ?? true,
      },
    });
    await audit(admin.id, "coupon.create", { code });
    return json(req, { ok: true, coupon });
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
      active?: boolean;
      maxUses?: number;
      value?: number;
      expiresAt?: string | null;
      type?: string;
    }>(req);
    if (!body.id) return json(req, { error: "id required" }, 400);

    const existing = await prisma.coupon.findUnique({ where: { id: body.id } });
    if (!existing) return json(req, { error: "Coupon not found" }, 404);

    const type = body.type || existing.type;
    const coupon = await prisma.coupon.update({
      where: { id: body.id },
      data: {
        ...(body.active != null ? { active: body.active } : {}),
        ...(body.maxUses != null ? { maxUses: body.maxUses } : {}),
        ...(body.value != null ? { value: clampCouponValue(type, body.value) } : {}),
        ...(body.expiresAt !== undefined
          ? { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }
          : {}),
      },
    });
    await audit(admin.id, "coupon.update", { id: body.id });
    return json(req, { ok: true, coupon });
  } catch (e) {
    return json(req, { error: e instanceof Error ? e.message : "Failed" }, 400);
  }
}
