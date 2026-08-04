import { json, options } from "@/lib/http";

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function GET(req: Request) {
  return json(req, {
    ok: true,
    service: "YTMP License API",
    version: "1.0.0",
  });
}
