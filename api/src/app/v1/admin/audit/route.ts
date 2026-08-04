import { json, options, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return json(req, { error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const take = Math.min(Number(url.searchParams.get("limit") || 100), 500);
  const action = url.searchParams.get("action") || undefined;

  const logs = await prisma.auditLog.findMany({
    where: action ? { action: { contains: action } } : undefined,
    orderBy: { createdAt: "desc" },
    take,
  });

  return json(req, {
    logs: logs.map((l) => ({
      id: l.id,
      adminId: l.adminId,
      action: l.action,
      meta: (() => {
        try {
          return l.meta ? JSON.parse(l.meta) : null;
        } catch {
          return l.meta;
        }
      })(),
      createdAt: l.createdAt.toISOString(),
    })),
  });
}
