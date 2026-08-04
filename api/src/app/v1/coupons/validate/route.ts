import { json, options, readJson } from "@/lib/http";
import { prisma } from "@/lib/db";

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function POST(req: Request) {
  try {
    const body = await readJson<{ code?: string }>(req);
    const code = (body.code || "").trim().toUpperCase();
    if (!code) return json(req, { valid: false, error: "code required" }, 400);

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.active) {
      return json(req, { valid: false, error: "Invalid coupon" });
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return json(req, { valid: false, error: "Coupon expired" });
    }
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return json(req, { valid: false, error: "Coupon fully used" });
    }

    return json(req, {
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
    });
  } catch (e) {
    return json(req, { valid: false, error: e instanceof Error ? e.message : "Failed" }, 400);
  }
}
