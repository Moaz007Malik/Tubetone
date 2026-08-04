import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureDbReady } from "@/lib/ensure-db";
import { options } from "@/lib/http";

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function GET() {
  try {
    await ensureDbReady();
    const admins = await prisma.admin.count();
    return NextResponse.json({
      ok: true,
      db: "up",
      admins,
      vercel: Boolean(process.env.VERCEL),
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        db: "down",
        error: e instanceof Error ? e.message : "db error",
      },
      { status: 503 }
    );
  }
}
