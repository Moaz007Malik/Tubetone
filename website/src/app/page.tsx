import Link from "next/link";
import { GlossyIllustration } from "@/components/GlossyIllustration";

export default function HomePage() {
  return (
    <main className="px-4 md:px-6">
      {/* Landing frame — glossy browser-style card */}
      <section className="mx-auto mt-4 max-w-6xl overflow-hidden glossy-card md:mt-6">
        <div className="grid items-center gap-8 px-6 py-12 md:grid-cols-[1.05fr_0.95fr] md:gap-4 md:px-12 md:py-16 lg:py-20">
          <div className="relative z-10">
            <p className="label rise">Windows media app</p>
            <h1 className="hero-brand rise rise-delay-1 mt-3">YTMP</h1>
            <p className="hero-line rise rise-delay-2 mt-5 max-w-md">
              Download · convert · play — locally on your PC
            </p>
            <p className="rise rise-delay-2 mt-4 max-w-md text-[0.95rem] leading-relaxed text-[var(--muted)]">
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
            <div className="rise rise-delay-3 mt-8 flex flex-wrap gap-3">
              <span className="pill-tag">No cloud upload</span>
              <span className="pill-tag">ffmpeg included</span>
              <span className="pill-tag">License key</span>
            </div>
          </div>
          <div className="rise rise-delay-2">
            <GlossyIllustration />
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-6xl md:mt-14">
        <div className="mb-8 text-center">
          <p className="label">How it works</p>
          <h2 className="display-title mt-2 text-3xl md:text-4xl">Three luminous steps</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["01", "Subscribe", "Pick a plan, request access, receive your key.", "linear-gradient(135deg,#8b5cf6,#e11d8c)"],
            ["02", "Install", "Windows installer with YTMP + ffmpeg onboard.", "linear-gradient(135deg,#e11d8c,#fb7185)"],
            ["03", "Create", "Download, Convert, Library — all offline.", "linear-gradient(135deg,#38bdf8,#8b5cf6)"],
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

      <section className="mx-auto mt-14 max-w-6xl md:mt-20">
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
                g: "from-[#f472b6] to-[#fb7185]",
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

      <section className="mx-auto my-14 max-w-6xl md:my-20">
        <div className="cta-band">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">Next step</p>
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
