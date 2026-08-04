"""Download latest yt-dlp into LocalAppData and prefer it on import."""

from __future__ import annotations

import os
import shutil
import sys
import urllib.request
import zipfile
from pathlib import Path

DATA_DIR = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "YTMP"
YTDLP_DIR = DATA_DIR / "yt_dlp_update"
# Official PyPI source wheel / sdist is awkward; use GitHub zip of release tag tip via PyPI simple zip
YTDLP_ZIP = "https://github.com/yt-dlp/yt-dlp/archive/refs/heads/master.zip"


def prefer_updated_ytdlp() -> None:
    """If a local update exists, put it first on sys.path."""
    pkg = YTDLP_DIR / "yt_dlp"
    if pkg.is_dir() or (YTDLP_DIR / "yt_dlp.py").is_file():
        path = str(YTDLP_DIR)
        if path not in sys.path:
            sys.path.insert(0, path)


def update_ytdlp(progress_cb=None) -> str:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = DATA_DIR / "yt_dlp_src.zip"
    extract_to = DATA_DIR / "yt_dlp_extract"

    def report(msg: str) -> None:
        if progress_cb:
            progress_cb(msg)

    report("Downloading yt-dlp update…")
    req = urllib.request.Request(
        YTDLP_ZIP,
        headers={"User-Agent": "YTMP/1.1"},
    )
    with urllib.request.urlopen(req, timeout=300) as resp, zip_path.open("wb") as out:
        while True:
            chunk = resp.read(256 * 1024)
            if not chunk:
                break
            out.write(chunk)

    report("Extracting yt-dlp…")
    if extract_to.exists():
        shutil.rmtree(extract_to, ignore_errors=True)
    extract_to.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_to)

    # Find folder containing yt_dlp package
    found = next(extract_to.rglob("yt_dlp"), None)
    if not found or not found.is_dir():
        raise RuntimeError("yt_dlp package not found in archive")

    if YTDLP_DIR.exists():
        shutil.rmtree(YTDLP_DIR, ignore_errors=True)
    YTDLP_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copytree(found, YTDLP_DIR / "yt_dlp")
    zip_path.unlink(missing_ok=True)
    shutil.rmtree(extract_to, ignore_errors=True)
    prefer_updated_ytdlp()
    report("yt-dlp updated.")
    return str(YTDLP_DIR)
