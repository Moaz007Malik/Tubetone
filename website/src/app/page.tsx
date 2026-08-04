import Link from "next/link";
import { Scene3D } from "@/components/Scene3D";
import { Tilt3D } from "@/components/Tilt3D";
import { DOWNLOAD_LABEL, DOWNLOAD_URL, hasDownloadUrl } from "@/lib/download";

export default function HomePage() {
  const canDownload = hasDownloadUrl();

  return (
    <main className="stage-3d px-3 sm:px-4 md:px-6">
      <section className="hero layer-3d mx-auto mt-4 max-w-6xl sm:mt-5 md:mt-8">
        <div className="hero__grid grid items-center gap-8 sm:gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8">
          <div className="hero__copy relative z-10 text-lift-3d">
            <div className="hero-kicker rise">
              <span className="hero-kicker__dot" />
              Built for Windows
            </div>
            <h1 className="hero-brand rise rise-delay-1 mt-3 sm:mt-4">YTMP</h1>
            <p className="hero-line rise rise-delay-2 mt-3 sm:mt-4 max-w-xl">
              Local media toolkit for download & convert
            </p>
            <p className="hero-sub rise rise-delay-2 mt-3 sm:mt-4 max-w-md">
              Paste links or open local files. Save audio and video, convert folders, and keep
              everything private on your PC — no cloud upload.
            </p>
            <div className="btn-row rise rise-delay-3 mt-6 sm:mt-8">
              {canDownload ? (
                <a
                  href={DOWNLOAD_URL}
                  className="btn-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {DOWNLOAD_LABEL}
                </a>
              ) : (
                <Link href="/download" className="btn-primary">
                  {DOWNLOAD_LABEL}
                </Link>
              )}
              <Link href="/pricing" className="btn-ghost">
                Get a license
              </Link>
            </div>
            <ul className="hero-pills rise rise-delay-4 mt-2">
              <li>Runs offline</li>
              <li>ffmpeg included</li>
              <li>Simple license key</li>
            </ul>
          </div>

          <div className="rise rise-delay-2 layer-3d hero__visual">
            <Scene3D />
          </div>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-6xl sm:mt-20 md:mt-28">
        <div className="section-head">
          <p className="label">How it works</p>
          <h2 className="display-title">Start in three steps</h2>
          <p>Subscribe, install, and create offline exports on your machine.</p>
        </div>
        <div className="grid-3d grid gap-4 sm:gap-5 sm:grid-cols-2 md:grid-cols-3">
          {[
            [
              "01",
              "Subscribe",
              "Pick a plan, request access, receive your key.",
              "linear-gradient(135deg,#7c3aed,#6366f1)",
            ],
            [
              "02",
              "Install",
              "Windows installer with YTMP + ffmpeg onboard.",
              "linear-gradient(135deg,#6366f1,#d946ef)",
            ],
            [
              "03",
              "Create",
              "Download, Convert, Library — all offline.",
              "linear-gradient(135deg,#38bdf8,#6366f1)",
            ],
          ].map(([n, title, body, grad], i) => (
            <Tilt3D key={n} className="feature-tile card-3d" max={8} lift={22} style={{ ["--i" as string]: i }}>
              <div className="feature-icon text-sm" style={{ background: grad }}>
                {n}
              </div>
              <h3 className="display-title mt-5 text-xl">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
            </Tilt3D>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-6xl sm:mt-20 md:mt-28">
        <Tilt3D className="glossy-card card-3d overflow-hidden px-4 py-8 sm:px-6 sm:py-12 md:px-12 md:py-16" max={4} lift={14}>
          <div className="flex flex-col gap-6 sm:gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="label">Product</p>
              <h2 className="display-title mt-2 max-w-lg text-2xl sm:text-3xl md:text-4xl">
                Workspaces made for media flow
              </h2>
            </div>
            <Link href="/tools" className="btn-ghost shrink-0 w-full sm:w-auto">
              Full toolkit
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 md:grid-cols-3">
            {[
              {
                t: "Download",
                d: "Playlists & bulk links. Music MP3 or Video MP4 — your quality.",
                g: "from-[#a78bfa] to-[#38bdf8]",
              },
              {
                t: "Convert",
                d: "Local files to MP3, WAV, FLAC, M4A, Opus, MP4. Batch folders.",
                g: "from-[#d946ef] to-[#fb7185]",
              },
              {
                t: "Library",
                d: "Search history, open last export, CSV & M3U playlists.",
                g: "from-[#22d3ee] to-[#34d399]",
              },
            ].map((item) => (
              <Tilt3D key={item.t} className="workspace-tile card-3d" max={9} lift={20}>
                <div className={`h-1.5 w-12 rounded-full bg-gradient-to-r ${item.g}`} />
                <h3 className="display-title mt-4 text-xl text-[var(--ink)]">{item.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.d}</p>
              </Tilt3D>
            ))}
          </div>
        </Tilt3D>
      </section>

      <section className="mx-auto mt-14 max-w-6xl sm:mt-20 md:mt-28">
        <div className="section-head">
          <p className="label">Capabilities</p>
          <h2 className="display-title">Everything for offline media craft</h2>
          <p>Local-first toolkit — the cloud never sees your files.</p>
        </div>
        <div className="grid-3d grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Multi-site", "YouTube and sites yt-dlp supports"],
            ["Playlists", "Full list or first-N limit"],
            ["Formats", "MP3, M4A, WAV, FLAC, Opus, MP4"],
            ["Batch convert", "Folders of local media"],
            ["History", "Search, reopen, CSV / M3U"],
            ["License check", "Online keys with offline grace"],
            ["Cancel queue", "Stop jobs without kill apps"],
            ["ffmpeg pack", "Installer ships the tools"],
          ].map(([t, d], i) => (
            <Tilt3D key={t} className="feature-tile card-3d" max={8} lift={16} style={{ ["--i" as string]: i }}>
              <h3 className="display-title text-lg">{t}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{d}</p>
            </Tilt3D>
          ))}
        </div>
      </section>

      <section className="mx-auto my-14 max-w-6xl sm:my-20 md:my-28">
        <Tilt3D className="cta-band card-3d" max={3} lift={10}>
          <div className="pointer-events-none absolute -right-16 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-indigo-400/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-fuchsia-400/18 blur-3xl" />
          <div className="cta-band__inner">
            <div className="cta-band__copy">
              <p className="cta-band__kicker">Get started</p>
              <h2 className="cta-band__title">Install once. Create offline, anytime.</h2>
              <p className="cta-band__sub">
                Get a license, run the Windows installer, and export media locally — no cloud
                upload.
              </p>
            </div>
            <div className="cta-band__actions">
              {canDownload ? (
                <a
                  href={DOWNLOAD_URL}
                  className="cta-btn-light"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {DOWNLOAD_LABEL}
                </a>
              ) : (
                <Link href="/download" className="cta-btn-light">
                  {DOWNLOAD_LABEL}
                </Link>
              )}
              <Link href="/pricing" className="cta-btn-ghost">
                Get a license
              </Link>
            </div>
          </div>
        </Tilt3D>
      </section>
    </main>
  );
}
