import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <section className="relative min-h-[78vh] overflow-hidden">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(ellipse 80% 55% at 75% 15%, rgba(45,212,191,0.22) 0%, transparent 55%), linear-gradient(165deg, #0a1219 0%, #12202b 50%, #0c1f24 100%)",
          }}
        />
        <div className="relative mx-auto flex max-w-5xl flex-col justify-center px-5 pb-20 pt-24">
          <p className="sans text-sm uppercase tracking-[0.25em] text-[#2dd4bf]">YTMP</p>
          <h1 className="mt-4 max-w-3xl text-5xl leading-tight md:text-6xl">
            Download, convert, and edit media — locally.
          </h1>
          <p className="sans mt-5 max-w-xl text-lg text-[#7a96a8]">
            Paste links from YouTube and dozens of other sites, or process files you already have:
            convert, trim, compress, GIF, normalize, and more. One Windows app.
          </p>
          <div className="sans mt-8 flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="rounded-lg bg-[#2dd4bf] px-5 py-3 font-semibold text-[#042f2e] no-underline"
            >
              Get a license
            </Link>
            <Link
              href="/tools"
              className="rounded-lg border border-[#2a4558] bg-[#12202b] px-5 py-3 text-[#e8f1f5] no-underline"
            >
              See the toolkit
            </Link>
          </div>
        </div>
      </section>

      <section className="sans mx-auto max-w-5xl px-5 py-16">
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-[#2dd4bf]">How it works</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["1", "Subscribe", "Pick a plan, request access, pay manually, get your license key by email."],
            ["2", "Install YTMP", "Run the Windows installer — ffmpeg is included."],
            ["3", "Create", "Download from the web, or open Convert / Tools for local files."],
          ].map(([n, title, body]) => (
            <li key={n} className="rounded-2xl border border-[#2a4558] bg-[#12202b] p-6 list-none">
              <p className="text-sm text-[#2dd4bf]">{n}</p>
              <h3 className="mt-2 text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-[#7a96a8]">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="sans mx-auto max-w-5xl px-5 pb-16">
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-[#2dd4bf]">
          Four workspaces
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {[
            ["Download", "YouTube, SoundCloud, Vimeo, and more → MP3, M4A, WAV, FLAC, Opus, or MP4."],
            ["Convert", "Turn any local audio/video into the format you need — including batch folders."],
            ["Tools", "Trim, compress, GIF, normalize, speed, volume, rotate, reverse, merge, probe."],
            ["Library", "Search history, open past files, keep your exports organized."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-[#2a4558] bg-[#12202b] p-6">
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-[#7a96a8]">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-[#7a96a8]">
          See <Link href="/features">all features</Link>, <Link href="/tools">toolkit</Link>,{" "}
          <Link href="/faq">FAQ</Link>, or <Link href="/status">check an order</Link>.
        </p>
      </section>
    </main>
  );
}
