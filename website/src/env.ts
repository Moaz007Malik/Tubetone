/**
 * Production env validation for the public website.
 * NEXT_PUBLIC_* must be set at build time on the deploy host.
 */
const api = process.env.NEXT_PUBLIC_API_URL || "";

if (process.env.NODE_ENV === "production") {
  if (!api || api.includes("127.0.0.1") || api.includes("localhost")) {
    console.warn(
      "[ytmp-website] NEXT_PUBLIC_API_URL looks like local host. " +
        "Set production API URL before building (see .env.production.example)."
    );
  }
}

export {};
