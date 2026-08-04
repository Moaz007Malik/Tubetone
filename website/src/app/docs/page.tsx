import Link from "next/link";
import { PageHero, PageShell } from "@/components/PageShell";

export const metadata = {
  title: "Docs",
  description:
    "Complete YTMP guide: install, activate, download from YouTube Spotify SoundCloud, convert, library, and license checks.",
};

const toc = [
  { id: "install", label: "Install" },
  { id: "activate", label: "Activate" },
  { id: "download", label: "Download" },
  { id: "sources", label: "Sources" },
  { id: "quality", label: "Quality" },
  { id: "convert", label: "Convert" },
  { id: "library", label: "Library" },
  { id: "license", label: "License" },
  { id: "paths", label: "Paths & logs" },
  { id: "troubleshoot", label: "Troubleshoot" },
];

export default function DocsPage() {
  return (
    <PageShell>
      <PageHero
        kicker="Reference"
        title="Documentation"
        lead="Everything you need to install YTMP on Windows, activate a license, download from major platforms, convert local files, and manage your library."
      />

      <ul className="doc-toc" aria-label="On this page">
        {toc.map((t) => (
          <li key={t.id}>
            <a href={`#${t.id}`}>{t.label}</a>
          </li>
        ))}
      </ul>

      <div className="space-y-4">
        <section id="install" className="doc-block scroll-mt-28">
          <h2>Install on Windows</h2>
          <p>
            Download <code>YTMP-Setup.exe</code> from the{" "}
            <Link href="/download" className="link-accent">
              Download
            </Link>{" "}
            page. Run the installer with administrator rights so the app and bundled ffmpeg can
            install under Program Files.
          </p>
          <ul>
            <li>Windows 10 or 11 (64-bit recommended)</li>
            <li>Network access for downloads and online license checks</li>
            <li>Disk space for ffmpeg plus your export folder</li>
          </ul>
          <p>
            After setup, launch <strong>YTMP</strong> from the Start menu or desktop shortcut. The
            first run opens the license screen until you activate.
          </p>
        </section>

        <section id="activate" className="doc-block scroll-mt-28">
          <h2>Activate a license</h2>
          <p>
            Purchase or request a plan on{" "}
            <Link href="/pricing" className="link-accent">
              Pricing
            </Link>
            . When an admin marks your order paid, you receive a license key by email (format
            similar to <code>YM-XXXX-XXXX-XXXX</code>).
          </p>
          <ol>
            <li>Open YTMP — the license panel appears if the app is not unlocked.</li>
            <li>Paste the full key and submit.</li>
            <li>The app contacts the license API; on success, Download and Convert unlock.</li>
          </ol>
          <p>
            Keys are tied to your subscription period (trial, monthly, or yearly). Revoked or
            expired licenses lock jobs after the next successful online check. You can re-check from
            the app or paste a new key after renewing.
          </p>
          <p>
            Step-by-step also lives on{" "}
            <Link href="/activate" className="link-accent">
              Activate
            </Link>
            .
          </p>
        </section>

        <section id="download" className="doc-block scroll-mt-28">
          <h2>Download workspace</h2>
          <p>
            Open the <strong>Download</strong> tab. Paste one URL per line (or import a{" "}
            <code>.txt</code> list). Choose <strong>Music</strong> for audio exports or{" "}
            <strong>Video</strong> for MP4. Start the queue; progress and messages appear in the log
            pane.
          </p>
          <h3>Queue & playlists</h3>
          <ul>
            <li>
              Enable <strong>Download full playlists</strong> under Quality options to expand
              YouTube playlists and Spotify albums/playlists into individual items.
            </li>
            <li>
              Set playlist limit to <code>0</code> for all items, or a positive number for first-N
              only.
            </li>
            <li>With playlists off, collection links typically take the first item only.</li>
            <li>Cancel stops the current job cleanly without killing the whole app.</li>
          </ul>
          <h3>Default save location</h3>
          <p>
            Files land under <code>Downloads\YTMP</code> by default. Change the folder from the
            app settings if you want a different export path.
          </p>
        </section>

        <section id="sources" className="doc-block scroll-mt-28">
          <h2>Supported sources</h2>
          <h3>YouTube</h3>
          <p>
            Videos, Shorts, Music links, and playlists. Music mode extracts audio; Video mode merges
            streams into MP4 via local ffmpeg.
          </p>
          <h3>Spotify</h3>
          <p>
            Paste track, album, or playlist links. YTMP resolves track metadata and exports MP3
            matches on your PC (Music workflow). Collections expand when full playlists are enabled.
            Spotify does not stream official files through YTMP — matches are resolved for offline
            audio export.
          </p>
          <h3>SoundCloud</h3>
          <p>
            Tracks and sets download as audio with the same bitrate options as other Music jobs.
          </p>
          <h3>Other sites</h3>
          <p>
            Many additional http(s) sources work through the built-in yt-dlp engine (for example
            Vimeo and public media on X/Twitter). Availability depends on the source and site
            changes over time.
          </p>
          <p>
            Only download content you have rights to use. Platform terms still apply. See{" "}
            <Link href="/legal/terms" className="link-accent">
              Terms
            </Link>
            .
          </p>
        </section>

        <section id="quality" className="doc-block scroll-mt-28">
          <h2>Quality & formats</h2>
          <h3>Music mode</h3>
          <ul>
            <li>
              Formats: MP3, M4A, WAV, FLAC, Opus (depending on build options shown in the app)
            </li>
            <li>Bitrate picker for lossy codecs: e.g. 64, 128, 192, 256, 320 kbps</li>
            <li>Optional thumbnail embedding where supported</li>
          </ul>
          <h3>Video mode</h3>
          <ul>
            <li>MP4 output with local ffmpeg merge</li>
            <li>Height / quality controls when the source offers multiple streams</li>
            <li>Optional English subtitles when available</li>
          </ul>
          <p>
            Preferences are remembered between sessions in your local YTMP settings under AppData.
          </p>
        </section>

        <section id="convert" className="doc-block scroll-mt-28">
          <h2>Convert workspace</h2>
          <p>
            Convert runs entirely offline on your PC. No media is uploaded for conversion.
          </p>
          <ul>
            <li>
              <strong>Single file</strong> — browse a local audio/video file, pick output format and
              bitrate when relevant, then Convert.
            </li>
            <li>
              <strong>Batch folder</strong> — choose a folder; every recognized media file is
              processed into the selected format.
            </li>
          </ul>
          <p>
            Output shares your configured export location unless you pick a specific destination in
            the tool. ffmpeg is shipped with the Windows installer so you do not need a separate
            install for normal use.
          </p>
        </section>

        <section id="library" className="doc-block scroll-mt-28">
          <h2>Library workspace</h2>
          <p>History of successful exports stays local to your machine.</p>
          <ul>
            <li>Search past titles and paths</li>
            <li>Open the selected file or its folder in Explorer</li>
            <li>Export lists as CSV or M3U for external players</li>
            <li>Clear history when you want a clean slate (files on disk are not auto-deleted)</li>
          </ul>
        </section>

        <section id="license" className="doc-block scroll-mt-28">
          <h2>License behavior</h2>
          <p>
            While online, YTMP periodically validates your subscription. Offline use allows a short
            grace window based on the last successful check; after that, protected actions may lock
            until connectivity is restored.
          </p>
          <ul>
            <li>
              <strong>Active</strong> — Download and Convert available
            </li>
            <li>
              <strong>Expired / revoked</strong> — jobs stop; renew or contact support
            </li>
            <li>
              <strong>Device fingerprint</strong> — used only to enforce seat/subscription rules
            </li>
          </ul>
          <p>
            Check order progress on{" "}
            <Link href="/status" className="link-accent">
              Order status
            </Link>{" "}
            with your email or order ID.
          </p>
        </section>

        <section id="paths" className="doc-block scroll-mt-28">
          <h2>Paths, config & logs</h2>
          <ul>
            <li>
              Data directory: <code>%LOCALAPPDATA%\YTMP</code>
            </li>
            <li>
              App log: <code>%LOCALAPPDATA%\YTMP\launcher.log</code>
            </li>
            <li>
              Local settings / last options: under the same folder (JSON settings as written by the
              app)
            </li>
            <li>
              Default exports: <code>%USERPROFILE%\Downloads\YTMP</code> unless changed
            </li>
          </ul>
          <p>
            When contacting support about a crash or failed job, attach the latest{" "}
            <code>launcher.log</code> and note the URL or file path you used (omit private tokens).
          </p>
        </section>

        <section id="troubleshoot" className="doc-block scroll-mt-28">
          <h2>Troubleshooting</h2>
          <h3>Installer fails</h3>
          <p>
            Run as administrator, temporarily pause other installers, and ensure antivirus is not
            blocking <code>YTMP-Setup.exe</code>. Re-download if the file is incomplete.
          </p>
          <h3>Key does not activate</h3>
          <p>
            Confirm the key is copied completely (no extra spaces). Check that your order is marked
            paid and the subscription has not expired. Corporate networks may block the API —
            allow HTTPS to the license API host.
          </p>
          <h3>Download errors</h3>
          <p>
            The source page may require login, geo-restriction, or may have changed. Try another
            URL, update via a fresh installer if available, and check the log for the exact
            extractor message.
          </p>
          <h3>Convert fails</h3>
          <p>
            Confirm the input is a supported media type and that ffmpeg installed with YTMP is
            present. Long paths or locked files (open in another app) often cause failures.
          </p>
          <h3>Still stuck?</h3>
          <p>
            See the{" "}
            <Link href="/faq" className="link-accent">
              FAQ
            </Link>{" "}
            or open a ticket on{" "}
            <Link href="/support" className="link-accent">
              Support
            </Link>
            .
          </p>
        </section>
      </div>

      <p className="mt-10 text-sm text-[var(--muted)]">
        Product overview:{" "}
        <Link href="/features" className="link-accent">
          Features
        </Link>
        {" · "}
        <Link href="/tools" className="link-accent">
          Toolkit
        </Link>
        {" · "}
        <Link href="/changelog" className="link-accent">
          Changelog
        </Link>
      </p>
    </PageShell>
  );
}
