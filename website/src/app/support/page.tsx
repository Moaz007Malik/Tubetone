import Link from "next/link";
import { PageHero, PageShell } from "@/components/PageShell";

export const metadata = {
  title: "Support",
  description:
    "Get help with YTMP activation, payments, downloads, and technical issues. Contact support with your order ID or license email.",
};

const topics = [
  {
    title: "Activation & license keys",
    body: "Key not accepted, wrong plan showing, or lock after revoke/expiry. Include the email used at purchase and the last 4 characters of your key — do not send the full key in public forums.",
    href: "/activate",
    linkLabel: "Activate guide",
  },
  {
    title: "Orders & payments",
    body: "Order stuck pending, payment proof missing, or coupon questions. Include order ID, payment reference, plan, and date of transfer.",
    href: "/status",
    linkLabel: "Check order status",
  },
  {
    title: "Download & convert errors",
    body: "Failures on YouTube, Spotify, SoundCloud, or local convert. Attach %LOCALAPPDATA%\\YTMP\\launcher.log and the URL or file type (not your media files).",
    href: "/docs#troubleshoot",
    linkLabel: "Troubleshooting docs",
  },
  {
    title: "Installer & Windows",
    body: "Setup crashes, missing ffmpeg, antivirus false positives, or Program Files permission issues. Note Windows version and whether you ran the installer as admin.",
    href: "/download",
    linkLabel: "Download page",
  },
];

const includeChecklist = [
  "Your account email (same as the order)",
  "Order ID if you have one",
  "Plan (trial / monthly / yearly) and purchase date if known",
  "YTMP version if shown in the app or installer name",
  "Clear description of steps to reproduce",
  "Screenshot of the error dialog (optional)",
  "launcher.log for crashes or download failures",
];

export default function SupportPage() {
  const email = (process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "").trim();

  return (
    <PageShell>
      <PageHero
        kicker="Help center"
        title="Support"
        lead="Activation, payments, downloads, or the Windows app — we help licensed users get unblocked. Include your order ID or license email so we can find your account quickly."
      />

      {email ? (
        <div className="btn-row flex-wrap">
          <a href={`mailto:${email}?subject=YTMP%20support`} className="btn-primary">
            Email {email}
          </a>
          <Link href="/faq" className="btn-ghost">
            Browse FAQ
          </Link>
          <Link href="/docs" className="btn-ghost">
            Read docs
          </Link>
        </div>
      ) : (
        <div className="prose-panel">
          <p>
            Use the guides below while support email is configured. Operators: set{" "}
            <code>NEXT_PUBLIC_SUPPORT_EMAIL</code> in the website env to show a mailto contact.
          </p>
          <div className="btn-row mt-4">
            <Link href="/faq" className="btn-ghost">
              Browse FAQ
            </Link>
            <Link href="/docs" className="btn-ghost">
              Read docs
            </Link>
          </div>
        </div>
      )}

      <p className="label mt-12 mb-3">What we can help with</p>
      <div className="support-grid">
        {topics.map((t) => (
          <article key={t.title} className="support-card">
            <h3>{t.title}</h3>
            <p>{t.body}</p>
            <p className="mt-3">
              <Link href={t.href}>{t.linkLabel} →</Link>
            </p>
          </article>
        ))}
      </div>

      <section className="doc-block mt-10">
        <h2>Before you write</h2>
        <p>Self-serve options often solve it in minutes:</p>
        <ul>
          <li>
            <Link href="/status" className="link-accent">
              Order status
            </Link>{" "}
            — payment pending vs paid, order ID lookup
          </li>
          <li>
            <Link href="/activate" className="link-accent">
              Activate
            </Link>{" "}
            — key format and first-run steps
          </li>
          <li>
            <Link href="/docs" className="link-accent">
              Docs
            </Link>{" "}
            — sources, playlists, convert, paths
          </li>
          <li>
            <Link href="/faq" className="link-accent">
              FAQ
            </Link>{" "}
            — YouTube / Spotify / SoundCloud and billing short answers
          </li>
        </ul>
      </section>

      <section className="doc-block mt-4">
        <h2>What to include in a ticket</h2>
        <p>Faster replies when your email has:</p>
        <ul>
          {includeChecklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>
          Do not attach full song libraries or private credentials. Redact payment screenshots if
          they show full card numbers or bank secrets.
        </p>
      </section>

      <section className="mt-10">
        <p className="label mb-3">Response expectations</p>
        <ul className="step-list">
          <li className="step-row">
            <span className="step-badge">01</span>
            <span className="text-sm text-[var(--muted)] md:text-base">
              Licensed customers and paid orders are prioritized in the same inbox as general product
              questions.
            </span>
          </li>
          <li className="step-row">
            <span className="step-badge step-badge--sky">02</span>
            <span className="text-sm text-[var(--muted)] md:text-base">
              Typical reply target is within 1–2 business days. Peak periods or incomplete tickets
              may take longer.
            </span>
          </li>
          <li className="step-row">
            <span className="step-badge step-badge--mint">03</span>
            <span className="text-sm text-[var(--muted)] md:text-base">
              Refunds and charge disputes follow the plan and payment terms on your order — ask
              support with the order ID rather than opening a new subscription.
            </span>
          </li>
        </ul>
      </section>

      <section className="doc-block mt-10">
        <h2>Safety & misuse</h2>
        <p>
          We cannot help circumvent platform DRM beyond the product’s published behavior, crack
          licenses, or share keys. Report account takeover or key leakage immediately from the email
          on the original order.
        </p>
        <p>
          Legal policies:{" "}
          <Link href="/legal/terms" className="link-accent">
            Terms of use
          </Link>
          {" · "}
          <Link href="/legal/privacy" className="link-accent">
            Privacy policy
          </Link>
        </p>
      </section>
    </PageShell>
  );
}
