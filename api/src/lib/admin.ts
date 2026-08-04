import { bearer, cookieValue, json, options, ADMIN_COOKIE } from "@/lib/http";
import { verifyAdminToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function requireAdmin(req: Request) {
  const token = cookieValue(req, ADMIN_COOKIE) || bearer(req);
  if (!token) return null;
  try {
    const payload = await verifyAdminToken(token);
    const admin = await prisma.admin.findUnique({ where: { id: payload.aid } });
    return admin;
  } catch {
    return null;
  }
}

export { json, options, ADMIN_COOKIE };
