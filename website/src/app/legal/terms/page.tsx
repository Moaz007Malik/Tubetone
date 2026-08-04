import { PageHero, PageShell } from "@/components/PageShell";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <PageShell narrow>
      <PageHero kicker="Legal" title="Terms" />
      <div className="prose-panel">
        YTMP is licensed per subscription. You may use the software only while your subscription is
        active. You are responsible for complying with source-site terms and copyright law. We may
        revoke licenses for abuse or non-payment.
      </div>
    </PageShell>
  );
}
