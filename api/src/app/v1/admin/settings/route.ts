import { json, options, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/http";

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return json(req, { error: "Unauthorized" }, 401);
  const cfg = await prisma.appConfig.findUnique({ where: { id: "default" } });
  let parsed = {};
  try {
    parsed = cfg?.value ? JSON.parse(cfg.value) : {};
  } catch {
    parsed = {};
  }
  return json(req, {
    config: parsed,
    health: { ok: true, db: true },
  });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return json(req, { error: "Unauthorized" }, 401);
  try {
    const body = await readJson<Record<string, unknown>>(req);
    const cfg = await prisma.appConfig.upsert({
      where: { id: "default" },
      update: { value: JSON.stringify(body) },
      create: { id: "default", value: JSON.stringify(body) },
    });
    return json(req, { ok: true, config: JSON.parse(cfg.value) });
  } catch (e) {
    return json(req, { error: e instanceof Error ? e.message : "Failed" }, 400);
  }
}
