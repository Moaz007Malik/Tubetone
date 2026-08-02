"""
TubeTone companion server — downloads YouTube audio as MP3 via yt-dlp.
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

# Local: ~/Downloads/TubeTone · Cloud: /tmp/tubetone
if os.environ.get("RENDER") or os.environ.get("DOWNLOAD_DIR"):
    DOWNLOAD_DIR = Path(os.environ.get("DOWNLOAD_DIR", "/tmp/tubetone"))
else:
    DOWNLOAD_DIR = Path.home() / "Downloads" / "TubeTone"
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


def ydl_base_opts() -> dict:
    opts: dict = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
    }
    if FFMPEG_LOCATION:
        opts["ffmpeg_location"] = FFMPEG_LOCATION
    return opts


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
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    cors_headers(handler)
    handler.end_headers()
    handler.wfile.write(body)


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


def fetch_info(url: str) -> dict:
    opts = ydl_base_opts()
    opts["skip_download"] = True
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)
    return {
        "title": info.get("title") or "YouTube audio",
        "thumbnail": info.get("thumbnail"),
        "duration": info.get("duration"),
        "id": info.get("id"),
    }


def download_mp3(url: str, bitrate: int) -> dict:
    if bitrate not in ALLOWED_BITRATES:
        raise ValueError(f"Bitrate must be one of {sorted(ALLOWED_BITRATES)}")
    if not FFMPEG_LOCATION:
        raise RuntimeError(
            "ffmpeg/ffprobe not found. Install ffmpeg or set FFMPEG_LOCATION."
        )

    work = Path(tempfile.mkdtemp(prefix="tubetone_", dir=str(DOWNLOAD_DIR)))
    outtmpl = str(work / "%(title)s [%(id)s].%(ext)s")
    opts = ydl_base_opts()
    opts.update(
        {
            "format": "bestaudio/best",
            "outtmpl": outtmpl,
            "keepvideo": False,
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": str(bitrate),
                }
            ],
        }
    )

    with _download_lock:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title = info.get("title") or "audio"
            video_id = info.get("id") or "unknown"
            filename = f"{sanitize_filename(title)} [{video_id}].mp3"

            requested = Path(ydl.prepare_filename(info)).with_suffix(".mp3")
            matches = list(work.glob("*.mp3"))
            if requested.exists():
                path = requested
            elif matches:
                path = max(matches, key=lambda p: p.stat().st_mtime)
            else:
                raise RuntimeError("MP3 was not created (ffmpeg conversion failed)")

            filename = path.name

    return {
        "ok": True,
        "filename": filename,
        "path": str(path),
        "workdir": str(work),
        "bitrate": bitrate,
        "title": title,
    }


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
        sys.stdout.write("[server] " + (fmt % args) + "\n")

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        cors_headers(self)
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            send_json(
                self,
                200,
                {
                    "ok": True,
                    "download_dir": str(DOWNLOAD_DIR),
                    "ffmpeg": FFMPEG_LOCATION,
                    "auth_required": bool(API_KEY),
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
        if parsed.path != "/download":
            send_json(self, 404, {"error": "Not found"})
            return
        if not require_api_key(self):
            return

        result = None
        try:
            body = read_json(self)
            url = body.get("url")
            bitrate = int(body.get("bitrate", 128))
            # json = local-style metadata; file = stream MP3 (needed on Render)
            mode = (body.get("mode") or "file").lower()
            if not url:
                send_json(self, 400, {"error": "Missing url"})
                return

            result = download_mp3(url, bitrate)
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

            data = path.read_bytes()
            ascii_name = re.sub(r"[^\w.\- ]+", "_", filename) or "audio.mp3"
            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Content-Length", str(len(data)))
            self.send_header(
                "Content-Disposition",
                f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{quote_filename(filename)}',
            )
            self.send_header("X-Filename", ascii_name)
            cors_headers(self)
            self.end_headers()
            self.wfile.write(data)
        except Exception as exc:  # noqa: BLE001
            send_json(self, 500, {"error": str(exc)})
        finally:
            if result:
                cleanup_work(result)


def quote_filename(name: str) -> str:
    from urllib.parse import quote

    return quote(name, safe="")


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("=" * 56)
    print("  TubeTone companion server")
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
    print("=" * 56)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.server_close()


if __name__ == "__main__":
    main()
