import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  corsHeaders,
  json,
  options,
} from "@/lib/http";
import { requireAdmin } from "@/lib/admin";
import { audit } from "@/lib/licensing";

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (admin) {
    await audit(admin.id, "admin.logout", { email: admin.email });
  }
  const res = NextResponse.json({ ok: true }, { status: 200, headers: corsHeaders(req) });
  res.cookies.set(ADMIN_COOKIE, "", adminCookieOptions({ maxAge: 0 }));
  return res;
}
