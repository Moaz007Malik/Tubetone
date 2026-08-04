import { PageHero, PageShell } from "@/components/PageShell";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <PageShell narrow>
      <PageHero kicker="Legal" title="Privacy" />
      <div className="prose-panel">
        We store email, license, and device fingerprint data to enforce subscriptions. Downloads
        stay on your machine. We do not sell personal data.
      </div>
    </PageShell>
  );
}
