export const metadata = { title: "Docs" };

export default function DocsPage() {
  return (
    <main className="sans mx-auto max-w-3xl px-5 py-16 prose-invert">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#2dd4bf]">Docs</h1>

      <h2 className="mt-8 text-xl">Download</h2>
      <p className="text-[#7a96a8]">
        Paste one or more http(s) links (YouTube and many other sites). Choose Music or Video.
        For audio, pick format (MP3 / M4A / WAV / FLAC / Opus) and bitrate. Optional: EN subtitles
        and thumbnail. Playlists expand automatically; set playlist limit to download only the first
        N items.
      </p>

      <h2 className="mt-6 text-xl">Convert</h2>
      <p className="text-[#7a96a8]">
        Browse a local file, pick an output format, Convert. Use Batch convert folder to process
        every media file in a directory into the chosen format.
      </p>

      <h2 className="mt-6 text-xl">Tools</h2>
      <p className="text-[#7a96a8]">
        Open a file, set Start / End / Speed / CRF / Volume / Rotate as needed, then run Trim,
        Extract audio, Compress, GIF, Normalize, Speed, Snapshot, Volume, Rotate, Reverse, or Media
        info. Merge queues multiple audio files into one MP3.
      </p>

      <h2 className="mt-6 text-xl">Library</h2>
      <p className="text-[#7a96a8]">
        Search past downloads and tool exports, open the selected file in Explorer, or clear
        history.
      </p>

      <h2 className="mt-6 text-xl">License</h2>
      <p className="text-[#7a96a8]">
        The app checks your subscription online. Revoked or expired licenses stop downloads and
        tool jobs.
      </p>
    </main>
  );
}
