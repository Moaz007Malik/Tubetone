import { json, options } from "@/lib/http";
import { prisma } from "@/lib/db";

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function GET(req: Request) {
  const cfg = await prisma.appConfig.findUnique({ where: { id: "default" } });
  let downloadUrl = process.env.DOWNLOAD_URL || "";
  let version = process.env.APP_VERSION || "1.1.0";
  try {
    if (cfg?.value) {
      const parsed = JSON.parse(cfg.value) as {
        downloadUrl?: string;
        appVersion?: string;
      };
      downloadUrl = parsed.downloadUrl || downloadUrl;
      version = parsed.appVersion || version;
    }
  } catch {
    /* ignore */
  }
  return json(req, {
    version,
    downloadUrl,
    notes: "Update available check for YTMP desktop",
  });
}
