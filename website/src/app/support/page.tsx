import { PageHero, PageShell } from "@/components/PageShell";

export const metadata = { title: "Support" };

export default function SupportPage() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@ytmp.app";
  return (
    <PageShell narrow>
      <PageHero
        kicker="Contact"
        title="Support"
        lead="Activation, payments, or downloads — include your order ID or license email."
      />
      <a href={`mailto:${email}`} className="btn-primary">
        {email}
      </a>
      <ul className="step-list mt-10">
        <li className="step-row">
          <span className="step-badge">01</span>
          <span className="text-sm text-[var(--muted)] md:text-base">
            Activation — send license email + last characters of the key
          </span>
        </li>
        <li className="step-row">
          <span className="step-badge step-badge--sky">02</span>
          <span className="text-sm text-[var(--muted)] md:text-base">
            Payment — transfer reference + order ID
          </span>
        </li>
        <li className="step-row">
          <span className="step-badge step-badge--mint">03</span>
          <span className="text-sm text-[var(--muted)] md:text-base">
            Errors — attach %LOCALAPPDATA%\YTMP\launcher.log
          </span>
        </li>
      </ul>
    </PageShell>
  );
}
