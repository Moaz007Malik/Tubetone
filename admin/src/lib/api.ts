/** API base — set NEXT_PUBLIC_API_URL in env (e.g. .env.local). No hardcoded host. */
export const API = (process.env.NEXT_PUBLIC_API_URL || "").trim();

export async function api<T = unknown>(
  path: string,
  opts: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  if (!API) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }
  const headers = new Headers(opts.headers || {});
  if (!(opts.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API}${path}`, {
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
