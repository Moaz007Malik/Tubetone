import { PageHero, PageShell } from "@/components/PageShell";

export const metadata = { title: "Changelog" };

const entries = [
  {
    version: "1.3",
    items: [
      "Media workspaces: Download, Convert, Library",
      "Playlists, multi-format audio, video quality",
      "Export history CSV + M3U; scrollable glass desktop UI",
    ],
  },
  {
    version: "1.2",
    items: ["YTMP brand", "Paste / import URLs, history", "Admin audit log + license email"],
  },
  {
    version: "1.1",
    items: ["Music + Video modes", "Subscription licensing", "Windows installer with ffmpeg"],
  },
];

export default function ChangelogPage() {
  return (
    <PageShell narrow>
      <PageHero kicker="Releases" title="Changelog" lead="What changed and when." />
      <div className="space-y-4">
        {entries.map((e) => (
          <section key={e.version} className="version-card">
            <span className="version-tag">v{e.version}</span>
            <ul>
              {e.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
