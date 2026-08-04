import { PageHero, PageShell } from "@/components/PageShell";

export const metadata = { title: "FAQ" };

const faqs = [
  {
    q: "Is YTMP only for YouTube MP3?",
    a: "No. Download from many sites yt-dlp supports, export audio or MP4, and convert local files.",
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
    a: "Downloads need network access to the source. Convert runs locally. License checks allow a short offline grace period.",
  },
  {
    q: "Playlists?",
    a: "Paste a playlist URL with “Download full playlists” on. Limit 0 = all videos.",
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
    <PageShell narrow>
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
