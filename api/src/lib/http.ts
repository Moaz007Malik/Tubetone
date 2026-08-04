import { NextResponse } from "next/server";

const DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
];

export const ADMIN_COOKIE = "ytmp_admin";

export function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS || DEFAULT_ORIGINS.join(","))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function pickOrigin(req: Request): string {
  const origin = req.headers.get("origin") || "";
  const allowed = allowedOrigins();
  if (origin && allowed.includes(origin)) return origin;
  // Never echo arbitrary Origin when using credentials
  return allowed[0] || "http://127.0.0.1:3001";
}

export function securityHeaders(): HeadersInit {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cache-Control": "no-store",
  };
}

export function corsHeaders(req: Request): HeadersInit {
  return {
    "Access-Control-Allow-Origin": pickOrigin(req),
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
    ...securityHeaders(),
  };
}

export function json(req: Request, data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders(req) });
}

export function options(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || "";
  if (h.toLowerCase().startsWith("bearer ")) return h.slice(7).trim();
  return null;
}

export function cookieValue(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") || "";
  const parts = raw.split(";").map((p) => p.trim());
  for (const p of parts) {
    const i = p.indexOf("=");
    if (i === -1) continue;
    if (p.slice(0, i) === name) return decodeURIComponent(p.slice(i + 1));
  }
  return null;
}

export function adminCookieOptions(overrides: { maxAge?: number } = {}) {
  // Admin UI is on :3001, API on :8787 → cross-site fetch. SameSite=Lax cookies
  // are stored after login but NOT sent on later XHR to a different host/port.
  // SameSite=None requires Secure. Chromium allows Secure cookies on localhost/127.0.0.1 over HTTP.
  const sameSite =
    (process.env.ADMIN_COOKIE_SAMESITE || "none").toLowerCase() === "lax"
      ? ("lax" as const)
      : ("none" as const);
  const secure =
    process.env.COOKIE_SECURE === "true" ||
    process.env.NODE_ENV === "production" ||
    sameSite === "none";
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge: overrides.maxAge ?? 60 * 60 * 12, // 12h
  };
}

/** Very small in-memory rate limit (per process). */
const buckets = new Map<string, { n: number; t: number }>();

export function rateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.t > windowMs) {
    buckets.set(key, { n: 1, t: now });
    return true;
  }
  if (b.n >= limit) return false;
  b.n += 1;
  return true;
}

export function assertJwtSecret(): void {
  const s = process.env.JWT_SECRET || "";
  if (!s || s.includes("change-me") || s.length < 24) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be a strong secret in production");
    }
    console.warn("[security] JWT_SECRET is weak or default — set a long random value before deploy");
  }
}
