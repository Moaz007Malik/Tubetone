export const metadata = { title: "FAQ" };

const faqs = [
  {
    q: "Is YTMP only for YouTube MP3?",
    a: "No. Download from many sites yt-dlp supports, export several audio formats or MP4, and use Convert / Tools for local files.",
  },
  {
    q: "Do I need Python or Chrome?",
    a: "No. Install YTMP on Windows, activate a license, and go.",
  },
  {
    q: "How do payments work?",
    a: "Request access on Pricing, pay manually (as instructed), then an admin marks the order paid and you receive a license key by email (when SMTP is configured).",
  },
  {
    q: "Can I use YTMP offline?",
    a: "Downloads need network access to the source site. Convert/Tools need local files + ffmpeg. License checks allow a short offline grace period.",
  },
  {
    q: "What happens if my license is revoked?",
    a: "The next heartbeat fails and downloads / tool jobs lock until the subscription is reinstated.",
  },
  {
    q: "Playlists?",
    a: "Paste a playlist URL. Use playlist limit in the app to download only the first N videos.",
  },
  {
    q: "Where are files saved?",
    a: "Default is Downloads\\YTMP. You can change the folder in the app — Convert and Tools use the same output folder.",
  },
  {
    q: "Does convert upload my files?",
    a: "No. Convert and Tools run locally with ffmpeg on your PC.",
  },
];

export default function FaqPage() {
  return (
    <main className="sans mx-auto max-w-3xl px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#2dd4bf]">FAQ</h1>
      <dl className="mt-10 space-y-6">
        {faqs.map((f) => (
          <div key={f.q} className="rounded-2xl border border-[#2a4558] bg-[#12202b] p-5">
            <dt className="font-semibold">{f.q}</dt>
            <dd className="mt-2 text-sm text-[#7a96a8]">{f.a}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
