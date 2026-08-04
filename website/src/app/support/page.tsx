export const metadata = { title: "Support" };

export default function SupportPage() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@ytmp.app";
  return (
    <main className="sans mx-auto max-w-3xl px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#2dd4bf]">Support</h1>
      <p className="mt-4 text-[#7a96a8]">
        Need help with activation, payments, or downloads? Email us and include your order ID or
        license email.
      </p>
      <a
        href={`mailto:${email}`}
        className="mt-8 inline-block rounded-lg bg-[#2dd4bf] px-5 py-3 font-semibold text-[#042f2e] no-underline"
      >
        {email}
      </a>
      <ul className="mt-10 space-y-2 text-sm text-[#7a96a8]">
        <li>Activation issues → send your license key (last 4 chars only if preferred)</li>
        <li>Payment confirmation → include transfer reference + order ID</li>
        <li>Download errors → attach %LOCALAPPDATA%\YTMP\launcher.log</li>
      </ul>
    </main>
  );
}
