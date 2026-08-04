import { json, options, requireAdmin } from "@/lib/admin";

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return json(req, { error: "Unauthorized" }, 401);
  return json(req, { id: admin.id, email: admin.email });
}
