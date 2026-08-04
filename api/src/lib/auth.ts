import { SignJWT, jwtVerify } from "jose";

function secretKey() {
  const s = process.env.JWT_SECRET || "dev-change-me-tubetone-jwt-secret-32chars";
  return new TextEncoder().encode(s);
}

export type LicenseTokenPayload = {
  typ: "license";
  lid: string; // license id
  sid: string; // subscription id
  fp: string; // fingerprint
};

export type AdminTokenPayload = {
  typ: "admin";
  aid: string;
  email: string;
};

export async function signLicenseToken(
  payload: Omit<LicenseTokenPayload, "typ">,
  ttlHours = Number(process.env.LICENSE_TOKEN_TTL_HOURS || 24)
) {
  return new SignJWT({ ...payload, typ: "license" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlHours}h`)
    .sign(secretKey());
}

export async function verifyLicenseToken(token: string): Promise<LicenseTokenPayload> {
  const { payload } = await jwtVerify(token, secretKey());
  if (payload.typ !== "license") throw new Error("Invalid token type");
  return payload as unknown as LicenseTokenPayload;
}

export async function signAdminToken(payload: Omit<AdminTokenPayload, "typ">) {
  return new SignJWT({ ...payload, typ: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());
}

export async function verifyAdminToken(token: string): Promise<AdminTokenPayload> {
  const { payload } = await jwtVerify(token, secretKey());
  if (payload.typ !== "admin") throw new Error("Invalid token type");
  return payload as unknown as AdminTokenPayload;
}
