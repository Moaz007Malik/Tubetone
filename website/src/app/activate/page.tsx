import { PageHero, PageShell } from "@/components/PageShell";

export const metadata = { title: "Activate" };

const steps = [
  "Install YTMP from Download.",
  "Open the app — license screen appears first.",
  "Paste your key (format YM-XXXX-XXXX-XXXX).",
  "Online check unlocks downloads and convert.",
];

export default function ActivatePage() {
  return (
    <PageShell>
      <PageHero
        kicker="Setup"
        title="Activate"
        lead="Unlock the Windows app with the key from your order email."
      />
      <ol className="step-list">
        {steps.map((step, i) => (
          <li key={step} className="step-row">
            <span className={`step-badge ${i % 2 ? "step-badge--sky" : ""}`}>0{i + 1}</span>
            <span className="text-sm text-[var(--muted)] md:text-base">{step}</span>
          </li>
        ))}
      </ol>
      <div className="prose-panel mt-10">
        If subscription is revoked or expires, jobs lock on the next online check. Renew from
        Pricing or contact Support.
      </div>
    </PageShell>
  );
}
