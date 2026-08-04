"""Download ffmpeg essentials into launcher/installer/ffmpeg_payload/bin for the installer."""

from __future__ import annotations

import shutil
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PAYLOAD = ROOT / "installer" / "ffmpeg_payload"
BIN = PAYLOAD / "bin"
URLS = (
    "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip",
    "https://github.com/GyanD/codexffmpeg/releases/latest/download/ffmpeg-release-essentials.zip",
)


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "YTMP/1.0 (installer staging)"},
    )
    with urllib.request.urlopen(req, timeout=300) as resp, dest.open("wb") as out:
        while True:
            chunk = resp.read(1024 * 256)
            if not chunk:
                break
            out.write(chunk)


def main() -> int:
    if (BIN / "ffmpeg.exe").is_file() and (BIN / "ffprobe.exe").is_file():
        print(f"ffmpeg already staged: {BIN}")
        return 0

    PAYLOAD.mkdir(parents=True, exist_ok=True)
    zip_path = PAYLOAD / "ffmpeg.zip"
    extract_to = PAYLOAD / "_extract"

    last_err: Exception | None = None
    for url in URLS:
        try:
            print(f"Downloading {url} …")
            download(url, zip_path)
            last_err = None
            break
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            print(f"  failed: {exc}")
            zip_path.unlink(missing_ok=True)

    if last_err is not None:
        print(f"ERROR: could not download ffmpeg: {last_err}", file=sys.stderr)
        return 1

    if extract_to.exists():
        shutil.rmtree(extract_to, ignore_errors=True)
    extract_to.mkdir(parents=True, exist_ok=True)
    print("Extracting…")
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_to)

    found = next(extract_to.rglob("ffmpeg.exe"), None)
    if not found:
        print("ERROR: ffmpeg.exe missing from archive", file=sys.stderr)
        return 1

    if BIN.exists():
        shutil.rmtree(BIN, ignore_errors=True)
    shutil.copytree(found.parent, BIN)
    zip_path.unlink(missing_ok=True)
    shutil.rmtree(extract_to, ignore_errors=True)

    # Keep marker for uninstall ownership
    (PAYLOAD / "OWNER.txt").write_text(
        "Installed by YTMP Setup. Safe to delete when uninstalling YTMP.\n",
        encoding="utf-8",
    )
    print(f"Staged: {BIN}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
