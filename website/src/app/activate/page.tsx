export const metadata = { title: "Activate" };

export default function ActivatePage() {
  return (
    <main className="sans mx-auto max-w-3xl px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#2dd4bf]">Activate</h1>
      <ol className="mt-6 list-decimal space-y-3 pl-5 text-[#7a96a8]">
        <li>Install YTMP from the Download page.</li>
        <li>Open the app — you will see the license screen.</li>
        <li>Paste your key (format YM-XXXX-XXXX-XXXX).</li>
        <li>The app validates online and unlocks downloads.</li>
      </ol>
      <p className="mt-8 rounded-xl border border-[#2a4558] bg-[#12202b] p-4 text-sm">
        If your subscription is revoked or expires, downloads lock on the next online check. Contact
        support or renew from Pricing.
      </p>
    </main>
  );
}
