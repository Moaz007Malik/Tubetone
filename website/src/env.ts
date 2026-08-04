/**
 * Website public env (env-only — no hardcoded product URLs).
 * Define in .env.local / host env before build or run.
 */
export const PUBLIC_API_URL = (process.env.NEXT_PUBLIC_API_URL || "").trim();
export const PUBLIC_DOWNLOAD_URL = (process.env.NEXT_PUBLIC_DOWNLOAD_URL || "").trim();
export const PUBLIC_SUPPORT_EMAIL = (process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "").trim();

if (process.env.NODE_ENV === "production") {
  if (!PUBLIC_API_URL) {
    console.warn("[ytmp-website] NEXT_PUBLIC_API_URL is not set");
  } else if (PUBLIC_API_URL.includes("127.0.0.1") || PUBLIC_API_URL.includes("localhost")) {
    console.warn(
      "[ytmp-website] NEXT_PUBLIC_API_URL looks like local host — use your production API for release builds."
    );
  }
  if (!PUBLIC_DOWNLOAD_URL) {
    console.warn("[ytmp-website] NEXT_PUBLIC_DOWNLOAD_URL is not set");
  }
}
