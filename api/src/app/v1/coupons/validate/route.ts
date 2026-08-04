import { json, options, readJson } from "@/lib/http";
import { prisma } from "@/lib/db";
import { MAX_FREE_DAYS } from "@/lib/licensing";

export async function OPTIONS(req: Request) {
  return options(req);
}

/** Base plan prices in USD (matches website pricing). */
const PLAN_PRICE: Record<string, number> = {
  trial: 0,
  monthly: 5,
  yearly: 49,
};

const PLAN_DAYS: Record<string, number> = {
  trial: 7,
  monthly: 30,
  yearly: 365,
};

function money(n: number): string {
  if (n <= 0) return "Free";
  if (Number.isInteger(n)) return `$${n}`;
  return `$${n.toFixed(2)}`;
}

export async function POST(req: Request) {
  try {
    const body = await readJson<{ code?: string; plan?: string }>(req);
    const code = (body.code || "").trim().toUpperCase();
    const plan = (body.plan || "monthly").toLowerCase().trim();
    if (!code) return json(req, { valid: false, error: "code required" }, 400);
    if (!(plan in PLAN_PRICE)) {
      return json(req, { valid: false, error: "Invalid plan" }, 400);
    }

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

    const originalPrice = PLAN_PRICE[plan] ?? 0;
    const baseDays = PLAN_DAYS[plan] ?? 30;
    let finalPrice = originalPrice;
    let discountAmount = 0;
    let freeDays = 0;
    let message = "";
    let detail = "";

    if (coupon.type === "percent") {
      const pct = Math.min(100, Math.max(0, Number(coupon.value) || 0));
      discountAmount = Math.round(originalPrice * (pct / 100) * 100) / 100;
      finalPrice = Math.max(0, Math.round((originalPrice - discountAmount) * 100) / 100);
      message = `${pct}% off your ${plan} plan`;
      detail =
        originalPrice <= 0
          ? "This plan is already free — the percent discount has no effect on price."
          : `Price drops from ${money(originalPrice)} to ${money(finalPrice)} (save ${money(discountAmount)}).`;
    } else if (coupon.type === "fixed") {
      const off = Math.max(0, Number(coupon.value) || 0);
      discountAmount = Math.min(originalPrice, Math.round(off * 100) / 100);
      finalPrice = Math.max(0, Math.round((originalPrice - discountAmount) * 100) / 100);
      message = `${money(discountAmount)} off your ${plan} plan`;
      detail =
        originalPrice <= 0
          ? "This plan is already free — the fixed discount has no effect on price."
          : `Price drops from ${money(originalPrice)} to ${money(finalPrice)}.`;
    } else if (coupon.type === "free_days") {
      const raw = Math.floor(Number(coupon.value) || 0);
      freeDays = Math.min(Math.max(0, raw), MAX_FREE_DAYS);
      finalPrice = originalPrice;
      discountAmount = 0;
      message = `${freeDays} free day${freeDays === 1 ? "" : "s"} added to your access`;
      detail = `You still pay ${money(originalPrice)} for the ${plan} plan, then get ${freeDays} extra day${
        freeDays === 1 ? "" : "s"
      } free (about ${baseDays + freeDays} days total once activated).`;
      if (freeDays >= MAX_FREE_DAYS) {
        detail += ` (Capped at ${MAX_FREE_DAYS} days for safety.)`;
      }
    } else {
      message = "Coupon applied";
      detail = `Type: ${coupon.type}, value: ${coupon.value}`;
    }

    return json(req, {
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      plan,
      originalPrice,
      finalPrice,
      discountAmount,
      freeDays,
      baseDays,
      totalDays: baseDays + freeDays,
      message,
      detail,
      priceLabel:
        originalPrice !== finalPrice
          ? { original: money(originalPrice), final: money(finalPrice) }
          : { original: money(originalPrice), final: money(finalPrice) },
    });
  } catch (e) {
    return json(req, { valid: false, error: e instanceof Error ? e.message : "Failed" }, 400);
  }
}
