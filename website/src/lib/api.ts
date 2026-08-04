/** API base — set NEXT_PUBLIC_API_URL in env (e.g. .env.local). No hardcoded host. */
export const API = (process.env.NEXT_PUBLIC_API_URL || "").trim();

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  if (!API) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }
  const headers = new Headers(opts.headers || {});
  headers.set("Content-Type", "application/json");
  const res = await fetch(`${API}${path}`, { ...opts, headers, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText);
  return data as T;
}
