export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertJwtSecret } = await import("@/lib/http");
  try {
    assertJwtSecret();
  } catch (err) {
    // Don't crash the whole server — login returns a clear 503 instead
    console.error("[ytmp-api]", err instanceof Error ? err.message : err);
  }

  // Warm DB / seed admin (non-fatal if it fails; requests retry ensureDbReady)
  try {
    const { ensureDbReady } = await import("@/lib/ensure-db");
    await ensureDbReady();
  } catch (err) {
    console.error("[ytmp-api] DB init:", err instanceof Error ? err.message : err);
  }
}
