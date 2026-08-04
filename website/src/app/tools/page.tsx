import Link from "next/link";

export const metadata = { title: "Toolkit" };

const tools = [
  {
    name: "Download",
    items: [
      "YouTube, SoundCloud, Vimeo, and more sites",
      "MP3 / M4A / WAV / FLAC / Opus / MP4",
      "Playlists, bulk paste, import .txt",
      "Optional EN subtitles + thumbnails",
      "Cancel queue, open last, play last",
    ],
  },
  {
    name: "Convert",
    items: [
      "Any local audio/video → new format",
      "Bitrate picker for lossy codecs",
      "Batch convert an entire folder",
    ],
  },
  {
    name: "Tools",
    items: [
      "Trim by start / end",
      "Extract audio from video",
      "Compress video (CRF)",
      "Make GIF from a clip",
      "Normalize loudness",
      "Change playback speed",
      "Volume ±dB",
      "Fade in / out",
      "Convert to mono",
      "Mute / strip video audio",
      "Rotate 90 / 180 / 270",
      "Reverse audio or video",
      "Snapshot frame → JPG",
      "Remux container (copy codecs)",
      "Split into fixed-length chunks",
      "Merge multiple audio files",
      "Media info (ffprobe)",
    ],
  },
  {
    name: "Library",
    items: [
      "Search history",
      "Open in Explorer",
      "Clear history",
      "Export CSV history",
      "Export M3U playlist",
    ],
  },
];

export default function ToolsPage() {
  return (
    <main className="sans mx-auto max-w-5xl px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#2dd4bf]">Toolkit</h1>
      <p className="mt-3 max-w-2xl text-[#7a96a8]">
        Same four tabs as the Windows app (YTMP 1.3+): Download, Convert, Tools, Library. Everything
        runs on your PC with ffmpeg — no cloud upload for convert or edit jobs.
      </p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {tools.map((t) => (
          <section key={t.name} className="rounded-2xl border border-[#2a4558] bg-[#12202b] p-6">
            <h2 className="text-xl font-semibold text-[#2dd4bf]">{t.name}</h2>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[#7a96a8]">
              {t.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-10 text-sm text-[#7a96a8]">
        Ready? <Link href="/download">Download the app</Link> or{" "}
        <Link href="/pricing">get a license</Link>.
      </p>
    </main>
  );
}
