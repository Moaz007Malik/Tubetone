import { PageHero, PageShell } from "@/components/PageShell";

export const metadata = { title: "FAQ" };

const faqs = [
  {
    q: "Is YTMP only for YouTube?",
    a: "No. Download from YouTube, Spotify, SoundCloud, Vimeo, and many other sites — export audio (MP3 and more) or MP4, and convert local files.",
  },
  {
    q: "How does Spotify work?",
    a: "Paste a Spotify track, album, or playlist link. YTMP resolves the tracks and saves MP3 matches on your PC (Music mode). Playlists expand when “Download full playlists” is on.",
  },
  {
    q: "Does SoundCloud work the same way?",
    a: "Yes. Paste a SoundCloud track or set URL and download as audio with the same quality and bitrate options.",
  },
  {
    q: "Do I need Python or Chrome?",
    a: "No. Install YTMP on Windows, activate a license, and go.",
  },
  {
    q: "How do payments work?",
    a: "Request access on Pricing, pay as instructed, then an admin marks the order paid and you receive a key.",
  },
  {
    q: "Can I use YTMP offline?",
    a: "Downloads need network access to the source. Convert runs fully offline. License checks allow a short offline grace period.",
  },
  {
    q: "Playlists?",
    a: "YouTube and Spotify playlists/albums expand when “Download full playlists” is on. Limit 0 = all items.",
  },
  {
    q: "Where are files saved?",
    a: "Default is Downloads\\YTMP. Change it in the app.",
  },
  {
    q: "Does convert upload my files?",
    a: "No. Convert runs with ffmpeg on your PC.",
  },
];

export default function FaqPage() {
  return (
    <PageShell>
      <PageHero kicker="Help" title="FAQ" lead="Short answers to the questions we hear most." />
      <div className="faq-list">
        {faqs.map((f) => (
          <article key={f.q} className="faq-item">
            <h2 className="faq-q">{f.q}</h2>
            <p className="faq-a">{f.a}</p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
