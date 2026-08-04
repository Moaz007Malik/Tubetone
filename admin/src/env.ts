/**
 * Production env validation for the admin app.
 * NEXT_PUBLIC_API_URL is baked at build time — set before npm run build.
 */
const api = process.env.NEXT_PUBLIC_API_URL || "";

if (process.env.NODE_ENV === "production") {
  if (!api || api.includes("127.0.0.1") || api.includes("localhost")) {
    console.warn(
      "[ytmp-admin] NEXT_PUBLIC_API_URL looks like local host. " +
        "Set production API URL before building (see .env.production.example)."
    );
  }
}

export {};
