import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  assertJwtSecret,
  corsHeaders,
  json,
  options,
  rateLimit,
  readJson,
} from "@/lib/http";
import { signAdminToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/licensing";
import { dbErrorHint, ensureDbReady, isDbConnectivityError } from "@/lib/ensure-db";

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function POST(req: Request) {
  try {
    assertJwtSecret();
  } catch (e) {
    return json(
      req,
      { error: e instanceof Error ? e.message : "Server misconfigured (JWT_SECRET)" },
      503
    );
  }

  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`admin-login:${ip}`, 10, 60_000)) {
    return json(req, { error: "Too many attempts" }, 429);
  }

  try {
    await ensureDbReady();

    const body = await readJson<{ email?: string; password?: string }>(req);
    const email = (body.email || "").toLowerCase().trim();
    const password = body.password || "";
    if (!email || !password) {
      return json(req, { error: "Email and password required" }, 400);
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return json(req, { error: "Invalid credentials" }, 401);
    }

    const token = await signAdminToken({ aid: admin.id, email: admin.email });
    await audit(admin.id, "admin.login", { email, ip });

    const res = NextResponse.json(
      { ok: true, admin: { id: admin.id, email: admin.email } },
      { status: 200, headers: corsHeaders(req) }
    );
    res.cookies.set(ADMIN_COOKIE, token, adminCookieOptions());
    return res;
  } catch (e) {
    console.error("[admin/login]", e);
    if (isDbConnectivityError(e)) {
      return json(req, { error: dbErrorHint(e) }, 503);
    }
    return json(req, { error: e instanceof Error ? e.message : "Login failed" }, 400);
  }
}
