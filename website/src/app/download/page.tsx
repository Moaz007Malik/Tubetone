import Link from "next/link";

export const metadata = { title: "Download" };

export default function DownloadPage() {
  const url = process.env.NEXT_PUBLIC_DOWNLOAD_URL || "";
  return (
    <main className="sans mx-auto max-w-3xl px-5 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#2dd4bf]">Download</h1>
      <p className="mt-3 text-[#7a96a8]">
        Windows installer includes YTMP + ffmpeg. Download from the web, convert local files, trim,
        compress, and more — then activate with your license key.
      </p>
      {url ? (
        <a
          href={url}
          className="mt-8 inline-block rounded-lg bg-[#2dd4bf] px-5 py-3 font-semibold text-[#042f2e] no-underline"
        >
          Download YTMP-Setup.exe
        </a>
      ) : (
        <p className="mt-8 rounded-xl border border-[#2a4558] bg-[#12202b] p-4 text-sm">
          Installer URL not configured yet. Build locally from{" "}
          <code className="text-[#2dd4bf]">release/YTMP-Setup.exe</code> or set{" "}
          <code>NEXT_PUBLIC_DOWNLOAD_URL</code>.
        </p>
      )}
      <p className="mt-6 text-sm">
        Next: <Link href="/activate">Activate your license</Link>
      </p>
    </main>
  );
}
