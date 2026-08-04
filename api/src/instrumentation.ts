export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertJwtSecret } = await import("@/lib/http");
  try {
    assertJwtSecret();
  } catch (err) {
    // Fail fast in production so weak secrets never ship
    console.error("[ytmp-api]", err instanceof Error ? err.message : err);
    if (process.env.NODE_ENV === "production") {
      throw err;
    }
  }
}
