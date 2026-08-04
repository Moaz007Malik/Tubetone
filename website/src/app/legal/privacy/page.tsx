export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main className="sans mx-auto max-w-3xl px-5 py-16 text-[#7a96a8]">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#2dd4bf]">Privacy</h1>
      <p className="mt-4">
        We store email, license, and device fingerprint data to enforce subscriptions. Downloads stay
        on your machine. We do not sell personal data.
      </p>
    </main>
  );
}
