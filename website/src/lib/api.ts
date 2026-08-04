/** API base — set NEXT_PUBLIC_API_URL in env. Trailing slashes are stripped. */
export const API = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/+$/, "");

/** Join base + path without producing `//v1/...` (breaks Vercel CORS preflight via 308). */
export function apiUrl(path: string): string {
  if (!API) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API}${p}`;
}

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = new Headers(opts.headers || {});
  headers.set("Content-Type", "application/json");
  const res = await fetch(apiUrl(path), { ...opts, headers, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText);
  return data as T;
}
