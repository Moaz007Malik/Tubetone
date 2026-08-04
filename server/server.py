"""
YTMP companion server — downloads YouTube audio as MP3 via yt-dlp.
Works locally and on Render (Docker).
"""

from __future__ import annotations

import json
import os
import re
import secrets
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

try:
    import yt_dlp
except ImportError:
    print("Missing yt-dlp. Install with: pip install -r requirements.txt")
    sys.exit(1)

HOST = os.environ.get("HOST", "0.0.0.0" if os.environ.get("PORT") else "127.0.0.1")
PORT = int(os.environ.get("PORT", "8765"))
API_KEY = os.environ.get("API_KEY", "").strip()
ALLOWED_BITRATES = {64, 128, 192, 256, 320}
ALLOWED_QUALITIES = {"360", "480", "720", "1080", "1440", "2160", "best"}

# Local: ~/Downloads/YTMP · Cloud: /tmp/tubetone
if os.environ.get("RENDER") or os.environ.get("DOWNLOAD_DIR"):
    DOWNLOAD_DIR = Path(os.environ.get("DOWNLOAD_DIR", "/tmp/tubetone"))
else:
    DOWNLOAD_DIR = Path.home() / "Downloads" / "YTMP"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

_download_lock = threading.Lock()


def find_ffmpeg() -> str | None:
    """Return a folder (or binary) path yt-dlp can use for ffmpeg/ffprobe."""
    env = os.environ.get("FFMPEG_LOCATION") or os.environ.get("FFMPEG_PATH")
    if env:
        p = Path(env)
        if p.is_file():
            return str(p.parent if p.name.lower().startswith("ffmpeg") else p)
        if p.is_dir():
            return str(p)

    from shutil import which

    exe = which("ffmpeg")
    if exe:
        return str(Path(exe).parent)

    candidates = [
        Path(r"C:\ffmpeg\bin"),
        Path(r"C:\Program Files\ffmpeg\bin"),
        Path(r"C:\Program Files (x86)\ffmpeg\bin"),
        Path.home() / "ffmpeg" / "bin",
        Path.home() / "AppData" / "Local" / "ffmpeg" / "bin",
        Path("/usr/bin"),
        Path("/usr/local/bin"),
        Path("/opt/homebrew/bin"),
    ]
    for folder in candidates:
        ffmpeg = folder / ("ffmpeg.exe" if os.name == "nt" else "ffmpeg")
        ffprobe = folder / ("ffprobe.exe" if os.name == "nt" else "ffprobe")
        if ffmpeg.is_file() and ffprobe.is_file():
            return str(folder)
    return None


FFMPEG_LOCATION = find_ffmpeg()
COOKIES_PATH: Path | None = None
COOKIES_FROM_BROWSER: tuple | None = None


def setup_cookies() -> None:
    """Configure yt-dlp cookies from env (needed when YouTube shows bot check)."""
    global COOKIES_PATH, COOKIES_FROM_BROWSER

    browser = os.environ.get("COOKIES_FROM_BROWSER", "").strip().lower()
    if browser:
        # Local only — Chrome/Edge/Firefox profile on the same machine
        COOKIES_FROM_BROWSER = (browser,)
        return

    cookie_file = os.environ.get("COOKIES_FILE", "").strip()
    if cookie_file and Path(cookie_file).is_file():
        COOKIES_PATH = Path(cookie_file)
        return

    # Paste full Netscape cookies.txt into Render env var YTDLP_COOKIES
    raw = os.environ.get("YTDLP_COOKIES", "").strip()
    if raw:
        path = DOWNLOAD_DIR / "cookies.txt"
        # Support literal \n from single-line env paste
        text = raw.replace("\\n", "\n")
        path.write_text(text, encoding="utf-8")
        COOKIES_PATH = path
        return

    # Local convenience: server/cookies.txt if present
    local = Path(__file__).resolve().parent / "cookies.txt"
    if local.is_file():
        COOKIES_PATH = local


setup_cookies()


def ydl_base_opts(cookiefile: str | None = None, player_clients: list[str] | None = None) -> dict:
    clients = player_clients or ["web_embedded", "android", "web", "web_safari"]
    opts: dict = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "remote_components": {"ejs:github"},
        "js_runtimes": {"node": {}},
        # Keep RAM low on Render free (512MB)
        "concurrent_fragment_downloads": 1,
        "buffersize": 16 * 1024,
        "http_chunk_size": 1_048_576,
        "extractor_args": {
            "youtube": {
                "player_client": clients,
            },
            "youtubepot-bgutilhttp": {
                "base_url": [os.environ.get("POT_BASE_URL", "http://127.0.0.1:4416")],
            },
        },
        "postprocessor_args": {
            "ffmpeg": ["-threads", "1"],
        },
    }
    if FFMPEG_LOCATION:
        opts["ffmpeg_location"] = FFMPEG_LOCATION
    if cookiefile:
        opts["cookiefile"] = cookiefile
    elif COOKIES_PATH:
        opts["cookiefile"] = str(COOKIES_PATH)
    if COOKIES_FROM_BROWSER and not cookiefile:
        opts["cookiesfrombrowser"] = COOKIES_FROM_BROWSER
    return opts


def write_request_cookies(cookies_text: str | None) -> Path | None:
    """Write Netscape cookies from the extension into a temp file."""
    if not cookies_text or not str(cookies_text).strip():
        return None
    text = str(cookies_text).replace("\\n", "\n").strip()
    if "\t" not in text:
        return None
    fd, name = tempfile.mkstemp(prefix="cookies_", suffix=".txt", dir=str(DOWNLOAD_DIR))
    os.close(fd)
    path = Path(name)
    if not text.lstrip().startswith("#"):
        text = "# Netscape HTTP Cookie File\n" + text
    path.write_text(text, encoding="utf-8")
    return path


def cors_headers(handler: BaseHTTPRequestHandler) -> None:
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-API-Key",
    )
    handler.send_header("Access-Control-Expose-Headers", "Content-Disposition, X-Filename")


def send_json(handler: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    body = json.dumps(payload).encode("utf-8")
    try:
        handler.send_response(status)
        handler.send_header("Content-Type", "application/json; charset=utf-8")
        handler.send_header("Content-Length", str(len(body)))
        cors_headers(handler)
        handler.end_headers()
        handler.wfile.write(body)
    except (BrokenPipeError, ConnectionResetError):
        pass


def read_json(handler: BaseHTTPRequestHandler) -> dict:
    length = int(handler.headers.get("Content-Length", "0"))
    raw = handler.rfile.read(length) if length else b"{}"
    return json.loads(raw.decode("utf-8") or "{}")


def sanitize_filename(name: str) -> str:
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name).strip(" .")
    return (name or "audio")[:180]


def extract_api_key(handler: BaseHTTPRequestHandler) -> str:
    header = handler.headers.get("X-API-Key") or ""
    if header:
        return header.strip()
    auth = handler.headers.get("Authorization") or ""
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return ""


def require_api_key(handler: BaseHTTPRequestHandler) -> bool:
    """Return False and send 401 if API_KEY is set and request is unauthorized."""
    if not API_KEY:
        return True
    provided = extract_api_key(handler)
    if provided and secrets.compare_digest(provided, API_KEY):
        return True
    send_json(handler, 401, {"error": "Unauthorized — set the correct API key in the extension"})
    return False


def fetch_info(url: str, cookiefile: str | None = None) -> dict:
    opts = ydl_base_opts(cookiefile)
    opts.update(
        {
            "skip_download": True,
            "ignore_no_formats_error": True,
            "quiet": True,
            "no_warnings": True,
        }
    )
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False) or {}

    duration = info.get("duration")
    mins = int(duration // 60) if isinstance(duration, (int, float)) else None
    secs = int(duration % 60) if isinstance(duration, (int, float)) else None
    duration_label = f"{mins}:{secs:02d}" if mins is not None else None

    return {
        "title": info.get("title") or "YouTube media",
        "thumbnail": info.get("thumbnail"),
        "duration": duration,
        "duration_label": duration_label,
        "id": info.get("id"),
        "uploader": info.get("uploader") or info.get("channel"),
        "view_count": info.get("view_count"),
        "webpage_url": info.get("webpage_url") or url,
        "is_playlist": info.get("_type") == "playlist" or bool(info.get("entries")),
        "playlist_count": len(list(info.get("entries") or []))
        if (info.get("_type") == "playlist" or info.get("entries"))
        else None,
    }


def expand_playlist(
    url: str,
    limit: int = 0,
    cookiefile: str | None = None,
) -> list[str]:
    """Return video URLs. Single videos return [url]. Playlists return entry URLs."""
    opts = ydl_base_opts(cookiefile)
    # ydl_base sets noplaylist=True (single-video default); force playlist expand here
    opts["noplaylist"] = False
    opts.update(
        {
            "skip_download": True,
            "extract_flat": "in_playlist",
            "quiet": True,
            "no_warnings": True,
            "ignoreerrors": True,
        }
    )
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False) or {}

    if info.get("_type") == "playlist" or info.get("entries"):
        urls: list[str] = []
        for entry in info.get("entries") or []:
            if not entry:
                continue
            vid = entry.get("id") or entry.get("url")
            if not vid:
                continue
            if isinstance(vid, str) and vid.startswith("http"):
                urls.append(vid)
            else:
                urls.append(f"https://www.youtube.com/watch?v={vid}")
            if limit and len(urls) >= limit:
                break
        return urls or [single_video_safe(url)]
    return [url]


def single_video_safe(url: str) -> str:
    try:
        from urllib.parse import parse_qs, urlparse

        u = urlparse(url)
        if "v=" in (u.query or ""):
            vid = (parse_qs(u.query).get("v") or [None])[0]
            if vid:
                return f"https://www.youtube.com/watch?v={vid}"
    except Exception:
        pass
    return url


class DownloadCancelled(Exception):
    """Raised when the user cancels an in-progress download."""


def _run_download(
    url: str,
    bitrate: int,
    work: Path,
    cookiefile: str | None,
    clients: list[str],
    progress_hooks: list | None = None,
    filename_template: str | None = None,
    preferredcodec: str = "mp3",
    write_subs: bool = False,
    write_thumbnail: bool = False,
) -> dict:
    codec = (preferredcodec or "mp3").lower().strip()
    if codec not in {"mp3", "m4a", "wav", "flac", "opus", "aac"}:
        codec = "mp3"
    ext_map = {"m4a": "m4a", "aac": "m4a", "wav": "wav", "flac": "flac", "opus": "opus", "mp3": "mp3"}
    ext = ext_map[codec]
    tmpl = (filename_template or "%(title)s [%(id)s]").strip() or "%(title)s [%(id)s]"
    outtmpl = str(work / f"{tmpl}.%(ext)s")
    opts = ydl_base_opts(cookiefile, clients)
    postprocessors: list[dict] = [
        {
            "key": "FFmpegExtractAudio",
            "preferredcodec": codec if codec != "aac" else "m4a",
            "preferredquality": str(bitrate),
        }
    ]
    if write_thumbnail:
        postprocessors.append({"key": "FFmpegThumbnailsConvertor", "format": "jpg"})
    opts.update(
        {
            "format": "bestaudio[ext=m4a]/bestaudio/140/251/250/249/18/bestaudio*/best*",
            "outtmpl": outtmpl,
            "keepvideo": False,
            "writesubtitles": write_subs,
            "writeautomaticsub": write_subs,
            "subtitleslangs": ["en", "en-US", "en-GB"] if write_subs else [],
            "writethumbnail": write_thumbnail,
            "postprocessors": postprocessors,
        }
    )
    if progress_hooks:
        opts["progress_hooks"] = progress_hooks
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        title = info.get("title") or "audio"
        video_id = info.get("id") or "unknown"
        filename = f"{sanitize_filename(title)} [{video_id}].{ext}"

        requested = Path(ydl.prepare_filename(info)).with_suffix(f".{ext}")
        matches = list(work.glob(f"*.{ext}"))
        if requested.exists():
            path = requested
        elif matches:
            path = max(matches, key=lambda p: p.stat().st_mtime)
        else:
            # fallback any audio
            any_audio = (
                list(work.glob("*.mp3"))
                + list(work.glob("*.m4a"))
                + list(work.glob("*.wav"))
                + list(work.glob("*.opus"))
                + list(work.glob("*.flac"))
            )
            if not any_audio:
                raise RuntimeError("Audio file was not created (ffmpeg conversion failed)")
            path = max(any_audio, key=lambda p: p.stat().st_mtime)
        filename = path.name

    return {
        "ok": True,
        "filename": filename,
        "path": str(path),
        "workdir": str(work),
        "bitrate": bitrate,
        "title": title,
    }


def download_mp3(
    url: str,
    bitrate: int,
    cookiefile: str | None = None,
    progress_hooks: list | None = None,
    filename_template: str | None = None,
    preferredcodec: str = "mp3",
    write_subs: bool = False,
    write_thumbnail: bool = False,
) -> dict:
    if bitrate not in ALLOWED_BITRATES:
        raise ValueError(f"Bitrate must be one of {sorted(ALLOWED_BITRATES)}")
    if not FFMPEG_LOCATION:
        raise RuntimeError(
            "ffmpeg/ffprobe not found. Install ffmpeg or set FFMPEG_LOCATION."
        )

    work = Path(tempfile.mkdtemp(prefix="tubetone_", dir=str(DOWNLOAD_DIR)))
    env_cookies = str(COOKIES_PATH) if COOKIES_PATH else None
    primary = cookiefile or env_cookies

    # Try logged-in clients first (needed on Render), then guest fallbacks
    attempts: list[tuple[list[str], str | None]] = [
        (["mweb", "web"], primary),
        (["web_embedded", "android"], primary),
        (["web_embedded", "android"], None),
    ]

    errors: list[str] = []
    with _download_lock:
        for clients, cookies in attempts:
            try:
                return _run_download(
                    url,
                    bitrate,
                    work,
                    cookies,
                    clients,
                    progress_hooks,
                    filename_template,
                    preferredcodec,
                    write_subs,
                    write_thumbnail,
                )
            except DownloadCancelled:
                raise
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{'+'.join(clients)}: {exc}")
                for f in work.glob("*"):
                    if f.is_file() and f.suffix != ".txt":
                        f.unlink(missing_ok=True)

    detail = " | ".join(errors[-3:])
    raise RuntimeError(
        "Download failed after client fallbacks. "
        f"Details: {detail}"
    )


def video_format_string(quality: str) -> str:
    """Prefer MP4 video + M4A audio up to the chosen height, with fallbacks."""
    if quality == "best":
        return (
            "bestvideo[ext=mp4]+bestaudio[ext=m4a]/"
            "bestvideo+bestaudio/best"
        )
    height = int(quality)
    return (
        f"bestvideo[height<={height}][ext=mp4]+bestaudio[ext=m4a]/"
        f"bestvideo[height<={height}]+bestaudio/"
        f"best[height<={height}]/best"
    )


def _run_video_download(
    url: str,
    quality: str,
    bitrate: int,
    work: Path,
    cookiefile: str | None,
    clients: list[str],
    progress_hooks: list | None = None,
    filename_template: str | None = None,
) -> dict:
    tmpl = (filename_template or "%(title)s [%(id)s]").strip() or "%(title)s [%(id)s]"
    outtmpl = str(work / f"{tmpl}.%(ext)s")
    opts = ydl_base_opts(cookiefile, clients)
    opts.update(
        {
            "format": video_format_string(quality),
            "outtmpl": outtmpl,
            "merge_output_format": "mp4",
            "postprocessors": [
                {"key": "FFmpegVideoRemuxer", "preferedformat": "mp4"},
            ],
            # Re-encode audio to the chosen bitrate; keep video stream as-is.
            "postprocessor_args": {
                "VideoRemuxer": [
                    "-c:v",
                    "copy",
                    "-c:a",
                    "aac",
                    "-b:a",
                    f"{bitrate}k",
                ],
            },
        }
    )
    if progress_hooks:
        opts["progress_hooks"] = progress_hooks

    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        title = info.get("title") or "video"
        video_id = info.get("id") or "unknown"

        prepared = Path(ydl.prepare_filename(info))
        candidates = [
            prepared.with_suffix(".mp4"),
            prepared,
            *sorted(work.glob("*.mp4"), key=lambda p: p.stat().st_mtime, reverse=True),
            *sorted(
                work.glob("*.mkv"), key=lambda p: p.stat().st_mtime, reverse=True
            ),
            *sorted(
                work.glob("*.webm"), key=lambda p: p.stat().st_mtime, reverse=True
            ),
        ]
        path = next((p for p in candidates if p.is_file()), None)
        if path is None:
            raise RuntimeError("Video file was not created (merge/remux failed)")

        # Normalize extension in display name when remuxed to mp4
        filename = path.name
        if path.suffix.lower() != ".mp4":
            mp4_name = f"{sanitize_filename(title)} [{video_id}].mp4"
            mp4_path = work / mp4_name
            if path.resolve() != mp4_path.resolve():
                path.rename(mp4_path)
                path = mp4_path
                filename = mp4_name

    return {
        "ok": True,
        "filename": filename,
        "path": str(path),
        "workdir": str(work),
        "bitrate": bitrate,
        "quality": quality,
        "title": title,
        "kind": "video",
    }


def download_video(
    url: str,
    quality: str,
    bitrate: int,
    cookiefile: str | None = None,
    progress_hooks: list | None = None,
    filename_template: str | None = None,
) -> dict:
    quality = str(quality).lower().strip()
    if quality not in ALLOWED_QUALITIES:
        raise ValueError(f"Quality must be one of {sorted(ALLOWED_QUALITIES)}")
    if bitrate not in ALLOWED_BITRATES:
        raise ValueError(f"Bitrate must be one of {sorted(ALLOWED_BITRATES)}")
    if not FFMPEG_LOCATION:
        raise RuntimeError(
            "ffmpeg/ffprobe not found. Install ffmpeg or set FFMPEG_LOCATION."
        )

    work = Path(tempfile.mkdtemp(prefix="tubetone_vid_", dir=str(DOWNLOAD_DIR)))
    env_cookies = str(COOKIES_PATH) if COOKIES_PATH else None
    primary = cookiefile or env_cookies

    attempts: list[tuple[list[str], str | None]] = [
        (["mweb", "web"], primary),
        (["web_embedded", "android"], primary),
        (["web_embedded", "android"], None),
    ]

    errors: list[str] = []
    with _download_lock:
        for clients, cookies in attempts:
            try:
                return _run_video_download(
                    url,
                    quality,
                    bitrate,
                    work,
                    cookies,
                    clients,
                    progress_hooks,
                    filename_template,
                )
            except DownloadCancelled:
                raise
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{'+'.join(clients)}: {exc}")
                for f in work.glob("*"):
                    if f.is_file() and f.suffix != ".txt":
                        f.unlink(missing_ok=True)

    detail = " | ".join(errors[-3:])
    raise RuntimeError(
        "YouTube blocked format access on this server IP. "
        "Use the local companion server, or ensure bgutil POT is running. "
        f"Details: {detail}"
    )


def cleanup_work(result: dict) -> None:
    work = result.get("workdir")
    if not work:
        return
    folder = Path(work)
    try:
        for f in folder.glob("*"):
            f.unlink(missing_ok=True)
        folder.rmdir()
    except OSError:
        pass


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        # Windowed .exe has sys.stdout/stderr = None — never write blindly
        try:
            stream = sys.stdout or sys.stderr
            if stream is not None:
                stream.write("[server] " + (fmt % args) + "\n")
                stream.flush()
        except Exception:
            pass

    def log_error(self, fmt: str, *args) -> None:
        self.log_message(fmt, *args)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        cors_headers(self)
        self.end_headers()

    def do_HEAD(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path in ("/", "/health"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            cors_headers(self)
            self.end_headers()
            return
        self.send_response(404)
        cors_headers(self)
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path in ("/", "/health"):
            send_json(
                self,
                200,
                {
                    "ok": True,
                    "service": "YTMP",
                    "download_dir": str(DOWNLOAD_DIR),
                    "ffmpeg": FFMPEG_LOCATION,
                    "auth_required": bool(API_KEY),
                    "cookies": bool(COOKIES_PATH or COOKIES_FROM_BROWSER),
                },
            )
            return

        if parsed.path == "/info":
            if not require_api_key(self):
                return
            qs = parse_qs(parsed.query)
            url = (qs.get("url") or [None])[0]
            if not url:
                send_json(self, 400, {"error": "Missing url"})
                return
            try:
                send_json(self, 200, fetch_info(url))
            except Exception as exc:  # noqa: BLE001
                send_json(self, 500, {"error": str(exc)})
            return

        send_json(self, 404, {"error": "Not found"})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path not in ("/download", "/info"):
            send_json(self, 404, {"error": "Not found"})
            return
        if not require_api_key(self):
            return

        cookie_path = None
        result = None
        try:
            body = read_json(self)
            url = body.get("url")
            if not url:
                send_json(self, 400, {"error": "Missing url"})
                return

            cookie_path = write_request_cookies(body.get("cookies"))
            cookiefile = str(cookie_path) if cookie_path else None

            if parsed.path == "/info":
                send_json(self, 200, fetch_info(url, cookiefile))
                return

            bitrate = int(body.get("bitrate", 128))
            # Cap bitrate on tiny instances to reduce ffmpeg RAM
            if os.environ.get("RENDER") and bitrate > 192:
                bitrate = 192
            mode = (body.get("mode") or "file").lower()
            result = download_mp3(url, bitrate, cookiefile)
            path = Path(result["path"])
            filename = result["filename"]

            if mode == "json":
                send_json(
                    self,
                    200,
                    {
                        "ok": True,
                        "filename": filename,
                        "path": str(path),
                        "bitrate": bitrate,
                        "title": result["title"],
                    },
                )
                return

            size = path.stat().st_size
            ascii_name = re.sub(r"[^\w.\- ]+", "_", filename) or "audio.mp3"
            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Content-Length", str(size))
            self.send_header(
                "Content-Disposition",
                f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{quote_filename(filename)}',
            )
            self.send_header("X-Filename", ascii_name)
            cors_headers(self)
            self.end_headers()
            # Stream in chunks — never load the whole MP3 into RAM
            with path.open("rb") as fh:
                while True:
                    chunk = fh.read(64 * 1024)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
        except Exception as exc:  # noqa: BLE001
            send_json(self, 500, {"error": str(exc)})
        finally:
            if result:
                cleanup_work(result)
            if cookie_path:
                cookie_path.unlink(missing_ok=True)


def quote_filename(name: str) -> str:
    from urllib.parse import quote

    return quote(name, safe="")


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("=" * 56)
    print("  YTMP companion server")
    print(f"  Listening on http://{HOST}:{PORT}")
    print(f"  Temp dir: {DOWNLOAD_DIR}")
    if FFMPEG_LOCATION:
        print(f"  ffmpeg: {FFMPEG_LOCATION}")
    else:
        print("  WARNING: ffmpeg NOT found — downloads will fail.")
    if API_KEY:
        print("  API key auth: enabled")
    else:
        print("  API key auth: disabled (set API_KEY on Render)")
    if COOKIES_FROM_BROWSER:
        print(f"  cookies: from browser ({COOKIES_FROM_BROWSER[0]})")
    elif COOKIES_PATH:
        print(f"  cookies: {COOKIES_PATH}")
    else:
        print("  cookies: extension can send per-request (or set YTDLP_COOKIES)")
    print("=" * 56)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.server_close()


if __name__ == "__main__":
    main()
