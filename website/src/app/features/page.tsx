import { PageHero, PageShell } from "@/components/PageShell";

export const metadata = { title: "Features" };

const features = [
  {
    title: "Multi-site download",
    body: "Paste URLs from YouTube and many other sites yt-dlp supports — not YouTube-only.",
  },
  {
    title: "Audio formats",
    body: "Export MP3, M4A, WAV, FLAC, or Opus with bitrate control.",
  },
  {
    title: "Video downloads",
    body: "Save MP4 at the quality you choose, with local ffmpeg merge.",
  },
  {
    title: "Playlists & bulk",
    body: "Full playlists or first-N, plus paste lists and import .txt files.",
  },
  {
    title: "Convert & batch",
    body: "Convert a single file or an entire folder to another format.",
  },
  {
    title: "Cancel anytime",
    body: "Stop an in-progress queue without killing the app.",
  },
  {
    title: "Online license",
    body: "Activate with a key. Admin can revoke; the app checks subscription status.",
  },
  {
    title: "Local & private",
    body: "Files stay on your PC. ffmpeg ships with the installer.",
  },
];

export default function FeaturesPage() {
  return (
    <PageShell>
      <PageHero
        kicker="Capabilities"
        title="Built for glossy offline craft"
        lead="YTMP is a local media toolkit — download from the web, convert without uploads."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((f, i) => (
          <article key={f.title} className="feature-tile">
            <div
              className="h-1.5 w-12 rounded-full"
              style={{
                background: [
                  "linear-gradient(90deg,#7c3aed,#e11d8c)",
                  "linear-gradient(90deg,#e11d8c,#38bdf8)",
                  "linear-gradient(90deg,#38bdf8,#34d399)",
                  "linear-gradient(90deg,#fbbf24,#e11d8c)",
                ][i % 4],
              }}
            />
            <h2 className="display-title mt-4 text-lg">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{f.body}</p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
