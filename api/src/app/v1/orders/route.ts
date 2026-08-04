import { json, options, rateLimit, readJson } from "@/lib/http";
import { prisma } from "@/lib/db";
import { dbErrorHint, ensureDbReady, isDbConnectivityError } from "@/lib/ensure-db";

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`orders:${ip}`, 20, 60_000)) {
    return json(req, { error: "Too many attempts" }, 429);
  }

  try {
    await ensureDbReady();

    const body = await readJson<{
      email?: string;
      name?: string;
      plan?: string;
      couponCode?: string;
      note?: string;
    }>(req);

    const email = (body.email || "").toLowerCase().trim();
    const plan = (body.plan || "monthly").toLowerCase();
    if (!email || !email.includes("@")) {
      return json(req, { error: "Valid email required" }, 400);
    }
    if (!["trial", "monthly", "yearly"].includes(plan)) {
      return json(req, { error: "Invalid plan" }, 400);
    }

    let couponCode: string | null = null;
    if (body.couponCode?.trim()) {
      const code = body.couponCode.trim().toUpperCase();
      const coupon = await prisma.coupon.findUnique({ where: { code } });
      if (!coupon || !coupon.active) {
        return json(req, { error: "Invalid coupon" }, 400);
      }
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        return json(req, { error: "Coupon expired" }, 400);
      }
      if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
        return json(req, { error: "Coupon fully used" }, 400);
      }
      couponCode = code;
    }

    const order = await prisma.order.create({
      data: {
        email,
        name: body.name?.trim() || null,
        plan,
        couponCode,
        note: body.note?.trim() || null,
        status: "pending",
        updatedAt: new Date(),
      },
    });

    return json(req, {
      ok: true,
      orderId: order.id,
      status: order.status,
      message:
        "Order received. Complete manual payment, then an admin will issue your license key.",
    });
  } catch (e) {
    console.error("[orders]", e);
    if (isDbConnectivityError(e)) {
      return json(req, { error: dbErrorHint(e) }, 503);
    }
    return json(req, { error: e instanceof Error ? e.message : "Order failed" }, 400);
  }
}
