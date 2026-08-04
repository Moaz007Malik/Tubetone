/** Public installer URL — set NEXT_PUBLIC_DOWNLOAD_URL in env (e.g. .env.local). */
export const DOWNLOAD_URL = (process.env.NEXT_PUBLIC_DOWNLOAD_URL || "").trim();

export const DOWNLOAD_LABEL = "Download for Windows";

export function hasDownloadUrl(): boolean {
  return DOWNLOAD_URL.length > 0;
}
