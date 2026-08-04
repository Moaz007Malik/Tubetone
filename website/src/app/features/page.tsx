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
    title: "Subtitles & thumbnails",
    body: "Optional English subtitles and cover thumbnails alongside audio.",
  },
  {
    title: "Playlists & bulk",
    body: "Paste playlist URLs or many links at once. Optional first-N playlist limit.",
  },
  {
    title: "Convert & batch",
    body: "Convert a single file or an entire folder to another format.",
  },
  {
    title: "Trim & compress",
    body: "Cut clips by start/end, or shrink videos with CRF controls.",
  },
  {
    title: "GIF & snapshots",
    body: "Turn clips into GIFs or grab a still frame as JPG.",
  },
  {
    title: "Audio polish",
    body: "Normalize loudness, change speed, adjust volume, reverse audio.",
  },
  {
    title: "Rotate & merge",
    body: "Rotate video 90/180/270°, or merge multiple audio tracks into one MP3.",
  },
  {
    title: "Media info",
    body: "Probe duration, codecs, resolution, and bitrate with ffprobe.",
  },
  {
    title: "Fade, mono, mute, remux, split",
    body: "Polish audio with fades, mono downmix, strip video audio, remux containers, or split into chunks.",
  },
  {
    title: "Play last & exports",
    body: "Play the last file, export history as CSV, or build an M3U playlist of saved tracks.",
  },
  {
    title: "Four workspace tabs",
    body: "Download · Convert · Tools · Library — same layout the website describes (YTMP 1.3+).",
  },
  {
    title: "Cancel anytime",
    body: "Stop an in-progress queue or tool job without killing the app.",
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
    <main className="sans mx-auto max-w-5xl px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#2dd4bf]">Features</h1>
      <p className="mt-3 max-w-2xl text-[#7a96a8]">
        YTMP is a local media toolkit — download from the web, then convert and edit without leaving
        the app.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <article key={f.title} className="rounded-2xl border border-[#2a4558] bg-[#12202b] p-5">
            <h2 className="text-lg font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm text-[#7a96a8]">{f.body}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
