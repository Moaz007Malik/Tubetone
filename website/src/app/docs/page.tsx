import { PageHero, PageShell } from "@/components/PageShell";

export const metadata = { title: "Docs" };

const sections = [
  {
    h: "Download",
    p: "Paste one or more http(s) links. Choose Music or Video. For audio, pick format and bitrate. Playlists expand when enabled; set limit for first-N only.",
  },
  {
    h: "Convert",
    p: "Browse a local file, pick an output format, Convert. Batch folder processes every media file into the chosen format.",
  },
  {
    h: "Library",
    p: "Search past exports, open the selected file, or clear history.",
  },
  {
    h: "License",
    p: "The app checks your subscription online. Revoked or expired licenses stop downloads until reinstated.",
  },
];

export default function DocsPage() {
  return (
    <PageShell narrow>
      <PageHero
        kicker="Reference"
        title="Docs"
        lead="How the Windows app behaves day to day."
      />
      <div className="space-y-4">
        {sections.map((s) => (
          <section key={s.h} className="doc-block">
            <h2>{s.h}</h2>
            <p>{s.p}</p>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
