import Link from "next/link";
import { PageHero, PageShell } from "@/components/PageShell";
import { DOWNLOAD_LABEL, DOWNLOAD_URL, hasDownloadUrl } from "@/lib/download";

export const metadata = { title: "Download" };

export default function DownloadPage() {
  const canDownload = hasDownloadUrl();

  return (
    <PageShell narrow>
      <PageHero
        kicker="Installer"
        title="Download YTMP"
        lead="Windows setup includes the app and ffmpeg. Download from YouTube, Spotify, SoundCloud, and more — activate with your license key after install."
      />

      {canDownload ? (
        <>
          <div className="btn-row">
            <a
              href={DOWNLOAD_URL}
              className="btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              {DOWNLOAD_LABEL}
            </a>
            <Link href="/pricing" className="btn-ghost">
              Get a license
            </Link>
          </div>
          <p className="mt-4 text-sm text-[var(--muted)]">
            File: <span className="font-mono text-[var(--ink-soft)]">YTMP-Setup.exe</span> · Windows
          </p>
          <ul className="hero-pills mt-5">
            <li>YouTube</li>
            <li>Spotify</li>
            <li>SoundCloud</li>
            <li>Local convert</li>
          </ul>
        </>
      ) : (
        <div className="prose-panel">
          Set{" "}
          <code className="font-mono text-[var(--violet)]">NEXT_PUBLIC_DOWNLOAD_URL</code> in{" "}
          <code className="font-mono text-[var(--violet)]">website/.env.local</code> (or your
          host env) to the installer link, then restart the site.
        </div>
      )}

      <ul className="step-list mt-10">
        <li className="step-row">
          <span className="step-badge">01</span>
          <span className="text-sm text-[var(--muted)] md:text-base">
            Download and run the installer (admin rights for Program Files + ffmpeg)
          </span>
        </li>
        <li className="step-row">
          <span className="step-badge step-badge--sky">02</span>
          <span className="text-sm text-[var(--muted)] md:text-base">
            Open YTMP and activate with your license key
          </span>
        </li>
        <li className="step-row">
          <span className="step-badge step-badge--mint">03</span>
          <span className="text-sm text-[var(--muted)] md:text-base">
            Paste YouTube, Spotify, SoundCloud, or other links — or convert local files offline
          </span>
        </li>
      </ul>

      <p className="mt-8 text-sm text-[var(--muted)]">
        Need a key?{" "}
        <Link href="/pricing" className="link-accent">
          View pricing
        </Link>
        {" · "}
        <Link href="/activate" className="link-accent">
          Activate
        </Link>
      </p>
    </PageShell>
  );
}
