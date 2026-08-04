import Link from "next/link";
import { PageHero, PageShell } from "@/components/PageShell";

export const metadata = { title: "Toolkit" };

const tools = [
  {
    name: "Download",
    items: [
      "YouTube, SoundCloud, Vimeo, and more",
      "MP3 / M4A / WAV / FLAC / Opus / MP4",
      "Playlists, bulk paste, import .txt",
      "Optional EN subtitles + thumbnails",
    ],
  },
  {
    name: "Convert",
    items: [
      "Local audio/video → new format",
      "Bitrate picker for lossy codecs",
      "Batch convert an entire folder",
    ],
  },
  {
    name: "Library",
    items: ["Search history", "Open in Explorer", "Export CSV / M3U"],
  },
];

export default function ToolsPage() {
  return (
    <PageShell>
      <PageHero
        kicker="Windows app"
        title="The toolkit"
        lead="Same workspaces as the installer: Download, Convert, Library."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {tools.map((t, idx) => (
          <section key={t.name} className="feature-tile">
            <div
              className="feature-icon text-xs"
              style={{
                background: [
                  "linear-gradient(135deg,#7c3aed,#e11d8c)",
                  "linear-gradient(135deg,#e11d8c,#fb7185)",
                  "linear-gradient(135deg,#38bdf8,#7c3aed)",
                ][idx % 3],
              }}
            >
              0{idx + 1}
            </div>
            <h2 className="display-title mt-4 text-xl">{t.name}</h2>
            <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              {t.items.map((i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-[var(--magenta)] to-[var(--sky)]" />
                  {i}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-10 text-sm text-[var(--muted)]">
        Ready?{" "}
        <Link href="/download" className="link-accent">
          Download the app
        </Link>{" "}
        or{" "}
        <Link href="/pricing" className="link-accent">
          get a license
        </Link>
        .
      </p>
    </PageShell>
  );
}
