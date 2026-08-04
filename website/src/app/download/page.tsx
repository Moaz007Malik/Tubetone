import Link from "next/link";
import { PageHero, PageShell } from "@/components/PageShell";

export const metadata = { title: "Download" };

export default function DownloadPage() {
  const url = process.env.NEXT_PUBLIC_DOWNLOAD_URL || "";
  return (
    <PageShell narrow>
      <PageHero
        kicker="Installer"
        title="Download YTMP"
        lead="Windows setup includes the app and ffmpeg. Activate after install with your license key."
      />
      {url ? (
        <a href={url} className="btn-primary">
          Download YTMP-Setup.exe
        </a>
      ) : (
        <div className="prose-panel">
          Installer URL not configured. Build from{" "}
          <code className="font-mono text-[var(--violet)]">release/YTMP-Setup.exe</code> or set{" "}
          <code className="font-mono text-[var(--violet)]">NEXT_PUBLIC_DOWNLOAD_URL</code>.
        </div>
      )}
      <p className="mt-8 text-sm text-[var(--muted)]">
        Next:{" "}
        <Link href="/activate" className="link-accent">
          Activate your license
        </Link>
      </p>
    </PageShell>
  );
}
