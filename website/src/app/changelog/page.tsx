export const metadata = { title: "Changelog" };

const entries = [
  {
    version: "1.3",
    items: [
      "Full media toolkit tabs: Download, Convert, Tools, Library",
      "Local tools: trim, compress, GIF, normalize, speed, volume, rotate, reverse, fade, mono, mute, remux, split, merge, probe",
      "Batch folder convert; multi-format audio (MP3/M4A/WAV/FLAC/Opus)",
      "Downloads beyond YouTube; optional EN subtitles + thumbnails",
      "Export history CSV + M3U; Play last; pinned action footer",
      "Website toolkit page matches the app 1:1",
    ],
  },
  {
    version: "1.2",
    items: [
      "Rebrand to YTMP with teal theme",
      "Paste / import URLs, preview info, history search",
      "Admin audit log, auto email, httpOnly sessions",
      "Website FAQ, features, order status, support",
    ],
  },
  {
    version: "1.1",
    items: [
      "Music + Video modes",
      "Subscription licensing",
      "Windows installer with ffmpeg",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main className="sans mx-auto max-w-3xl px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#2dd4bf]">Changelog</h1>
      <div className="mt-10 space-y-8">
        {entries.map((e) => (
          <section key={e.version}>
            <h2 className="text-xl font-semibold">v{e.version}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[#7a96a8]">
              {e.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
