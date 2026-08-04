import Link from "next/link";
import { Scene3D } from "@/components/Scene3D";

export default function HomePage() {
  return (
    <main className="px-4 md:px-6">
      {/* Hero — Helixa SaaS layout */}
      <section className="mx-auto mt-6 max-w-6xl md:mt-10">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
          <div className="relative z-10">
            <div className="hero-kicker rise">
              <span className="hero-kicker__dot" />
              Windows media app
            </div>
            <h1 className="hero-brand rise rise-delay-1 mt-5">YTMP</h1>
            <p className="hero-line rise rise-delay-2 mt-5 max-w-lg">
              Download · convert · play — locally on your PC
            </p>
            <p className="rise rise-delay-2 mt-4 max-w-md text-[0.98rem] leading-relaxed text-[var(--muted)]">
              Colorful productivity for links and files. Playlists, MP3/MP4, convert folder batches —
              your machine does the work.
            </p>
            <div className="rise rise-delay-3 mt-8 flex flex-wrap gap-3">
              <Link href="/pricing" className="btn-primary">
                Get a license
              </Link>
              <Link href="/download" className="btn-ghost">
                Download free trial path
              </Link>
            </div>
            <div className="rise rise-delay-4 mt-8 flex flex-wrap gap-2.5">
              <span className="pill-tag">No cloud upload</span>
              <span className="pill-tag">ffmpeg included</span>
              <span className="pill-tag">License key</span>
            </div>
          </div>

          <div className="rise rise-delay-2">
            <Scene3D />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto mt-20 max-w-6xl md:mt-28">
        <div className="section-head">
          <p className="label">How it works</p>
          <h2 className="display-title">Three luminous steps</h2>
          <p>From plan to local exports — subscribe, install, create.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
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
          ].map(([n, title, body, grad]) => (
            <article key={n} className="feature-tile">
              <div className="feature-icon text-sm" style={{ background: grad }}>
                {n}
              </div>
              <h3 className="display-title mt-5 text-xl">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Product workspaces */}
      <section className="mx-auto mt-20 max-w-6xl md:mt-28">
        <div className="glossy-card overflow-hidden px-6 py-12 md:px-12 md:py-16">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="label">Product</p>
              <h2 className="display-title mt-2 max-w-lg text-3xl md:text-4xl">
                Workspaces made for media flow
              </h2>
            </div>
            <Link href="/tools" className="btn-ghost shrink-0">
              Full toolkit
            </Link>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
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
              <div key={item.t} className="workspace-tile">
                <div className={`h-1.5 w-12 rounded-full bg-gradient-to-r ${item.g}`} />
                <h3 className="display-title mt-4 text-xl text-[var(--ink)]">{item.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature bento */}
      <section className="mx-auto mt-20 max-w-6xl md:mt-28">
        <div className="section-head">
          <p className="label">Capabilities</p>
          <h2 className="display-title">Everything for offline media craft</h2>
          <p>Local-first toolkit — the cloud never sees your files.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Multi-site", "YouTube and sites yt-dlp supports"],
            ["Playlists", "Full list or first-N limit"],
            ["Formats", "MP3, M4A, WAV, FLAC, Opus, MP4"],
            ["Batch convert", "Folders of local media"],
            ["History", "Search, reopen, CSV / M3U"],
            ["License check", "Online keys with offline grace"],
            ["Cancel queue", "Stop jobs without kill apps"],
            ["ffmpeg pack", "Installer ships the tools"],
          ].map(([t, d]) => (
            <div key={t} className="feature-tile">
              <h3 className="display-title text-lg">{t}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto my-20 max-w-6xl md:my-28">
        <div className="cta-band">
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="absolute -bottom-16 left-10 h-52 w-52 rounded-full bg-fuchsia-400/15 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                Next step
              </p>
              <p className="cta-band__title">Ready to shine offline?</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/pricing" className="cta-btn-light">
                View pricing
              </Link>
              <Link href="/docs" className="cta-btn-ghost">
                Read docs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
