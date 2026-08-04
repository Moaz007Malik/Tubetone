import { json, options, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return json(req, { error: "Unauthorized" }, 401);

  const [activeSubs, pendingOrders, totalUsers, revokedSubs, recentOrders] =
    await Promise.all([
      prisma.subscription.count({ where: { status: "active" } }),
      prisma.order.count({ where: { status: "pending" } }),
      prisma.user.count(),
      prisma.subscription.count({ where: { status: "revoked" } }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { license: true },
      }),
    ]);

  return json(req, {
    stats: {
      activeSubs,
      pendingOrders,
      totalUsers,
      revokedSubs,
    },
    recentOrders,
  });
}
