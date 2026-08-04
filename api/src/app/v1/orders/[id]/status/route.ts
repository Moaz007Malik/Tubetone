import { json, options } from "@/lib/http";
import { prisma } from "@/lib/db";

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { license: true },
  });
  if (!order) return json(req, { error: "Not found" }, 404);

  return json(req, {
    id: order.id,
    status: order.status,
    plan: order.plan,
    email: order.email,
    // Only reveal key once paid (customer polling after admin fulfillment)
    licenseKey: order.status === "paid" ? order.license?.key ?? null : null,
    updatedAt: order.updatedAt.toISOString(),
  });
}
