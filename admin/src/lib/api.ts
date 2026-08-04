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

export async function api<T = unknown>(
  path: string,
  opts: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const headers = new Headers(opts.headers || {});
  if (!(opts.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(apiUrl(path), {
    ...opts,
    headers,
    credentials: "include", // httpOnly admin cookie
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText);
  }
  return data as T;
}

export async function checkSession(): Promise<boolean> {
  try {
    await api("/v1/admin/me");
    return true;
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  try {
    await api("/v1/admin/logout", { method: "POST" });
  } catch {
    /* ignore */
  }
}
