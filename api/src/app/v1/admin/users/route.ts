import { json, options, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return json(req, { error: "Unauthorized" }, 401);
  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase();
  const users = await prisma.user.findMany({
    where: q ? { email: { contains: q } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { licenses: true },
      },
    },
  });
  return json(req, { users });
}
