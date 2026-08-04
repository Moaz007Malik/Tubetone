import { PageHero, PageShell } from "@/components/PageShell";

export const metadata = { title: "Features" };

const features = [
  {
    title: "YouTube",
    body: "Videos, Shorts, Music, and playlists — save as MP3 or MP4 at the quality you choose.",
  },
  {
    title: "Spotify",
    body: "Paste track, album, or playlist links. YTMP resolves tracks and exports them as MP3 on your PC.",
  },
  {
    title: "SoundCloud",
    body: "Download SoundCloud tracks and sets as audio — same Music workflow as YouTube.",
  },
  {
    title: "More sites",
    body: "Vimeo, X/Twitter media, and many other links yt-dlp supports — not locked to one platform.",
  },
  {
    title: "Audio formats",
    body: "Export MP3, M4A, WAV, FLAC, or Opus with bitrate control.",
  },
  {
    title: "Video downloads",
    body: "Save MP4 with local ffmpeg merge — height and quality options.",
  },
  {
    title: "Playlists & bulk",
    body: "Full playlists or first-N, multi-line paste, and import .txt lists.",
  },
  {
    title: "Convert & batch",
    body: "Convert a single local file or an entire folder — no upload.",
  },
  {
    title: "Online license",
    body: "Activate with a key. Admin can revoke; the app checks subscription status.",
  },
  {
    title: "Local & private",
    body: "Files stay on your PC. ffmpeg ships with the Windows installer.",
  },
];

export default function FeaturesPage() {
  return (
    <PageShell>
      <PageHero
        kicker="Capabilities"
        title="YouTube, Spotify, SoundCloud & more"
        lead="One Windows app to grab web media and convert local files — offline toolkits, no cloud upload."
      />
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
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
