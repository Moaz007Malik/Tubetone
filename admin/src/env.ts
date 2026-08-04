/**
 * Admin env (env-only — no hardcoded hosts).
 * Set NEXT_PUBLIC_API_URL in .env.local / host env before build or run.
 */
export const PUBLIC_API_URL = (process.env.NEXT_PUBLIC_API_URL || "").trim();

if (process.env.NODE_ENV === "production") {
  if (!PUBLIC_API_URL) {
    console.warn("[ytmp-admin] NEXT_PUBLIC_API_URL is not set");
  } else if (PUBLIC_API_URL.includes("127.0.0.1") || PUBLIC_API_URL.includes("localhost")) {
    console.warn(
      "[ytmp-admin] NEXT_PUBLIC_API_URL looks like local host — use your production API for release builds."
    );
  }
}
