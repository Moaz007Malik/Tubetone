import { json, options, readJson } from "@/lib/http";
import { verifyLicenseToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function POST(req: Request) {
  try {
    const body = await readJson<{ token?: string; fingerprint?: string }>(req);
    if (!body.token) return json(req, { error: "token required" }, 400);
    const payload = await verifyLicenseToken(body.token);
    const fp = body.fingerprint || payload.fp;

    await prisma.device.deleteMany({
      where: { licenseId: payload.lid, fingerprint: fp },
    });

    return json(req, { ok: true });
  } catch (e) {
    return json(req, { error: e instanceof Error ? e.message : "Deactivate failed" }, 400);
  }
}
