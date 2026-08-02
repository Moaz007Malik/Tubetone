"""
TubeTone — standalone YouTube → MP3 downloader for Windows.
No Chrome extension required.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
import threading
import traceback
import urllib.request
import zipfile
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------


def app_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


APP_DIR = app_dir()
DATA_DIR = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "TubeTone"
FFMPEG_DIR = DATA_DIR / "ffmpeg"
FFMPEG_BIN = FFMPEG_DIR / "bin"
DEFAULT_OUT = Path.home() / "Downloads" / "TubeTone"

FFMPEG_ZIP_URL = (
    "https://www.gyan.dev/ffmpeg/builds/packages/ffmpeg-8.0-essentials_build.zip"
)

YT_RE = re.compile(
    r"(https?://)?(www\.|m\.|music\.)?(youtube\.com/(watch\?v=|shorts/|embed/|live/)|youtu\.be/)[\w-]+",
    re.I,
)


def write_log(msg: str) -> None:
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with (DATA_DIR / "launcher.log").open("a", encoding="utf-8") as f:
            f.write(msg.rstrip() + "\n")
    except OSError:
        pass


# ---------------------------------------------------------------------------
# ffmpeg
# ---------------------------------------------------------------------------


def find_ffmpeg_bin() -> Path | None:
    env = os.environ.get("FFMPEG_LOCATION")
    if env:
        p = Path(env)
        if (p / "ffmpeg.exe").is_file():
            return p
        if p.name.lower() == "ffmpeg.exe" and p.is_file():
            return p.parent

    if (APP_DIR / "ffmpeg" / "bin" / "ffmpeg.exe").is_file():
        return APP_DIR / "ffmpeg" / "bin"
    if (FFMPEG_BIN / "ffmpeg.exe").is_file():
        return FFMPEG_BIN
    which = shutil.which("ffmpeg")
    if which:
        return Path(which).parent
    # Common local install
    if Path(r"C:\ffmpeg\bin\ffmpeg.exe").is_file():
        return Path(r"C:\ffmpeg\bin")
    return None


def download_ffmpeg(progress_cb=None) -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = DATA_DIR / "ffmpeg.zip"
    extract_to = DATA_DIR / "ffmpeg_extract"

    def report(msg: str) -> None:
        write_log(msg)
        if progress_cb:
            progress_cb(msg)

    report("Downloading ffmpeg (one-time, ~80 MB)…")
    urllib.request.urlretrieve(FFMPEG_ZIP_URL, zip_path)  # noqa: S310
    report("Extracting ffmpeg…")
    if extract_to.exists():
        shutil.rmtree(extract_to, ignore_errors=True)
    extract_to.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_to)
    found = next(extract_to.rglob("ffmpeg.exe"), None)
    if not found:
        raise RuntimeError("ffmpeg.exe not found in archive")
    if FFMPEG_DIR.exists():
        shutil.rmtree(FFMPEG_DIR, ignore_errors=True)
    FFMPEG_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copytree(found.parent, FFMPEG_BIN)
    zip_path.unlink(missing_ok=True)
    shutil.rmtree(extract_to, ignore_errors=True)
    report("ffmpeg ready.")
    return FFMPEG_BIN


def ensure_ffmpeg(progress_cb=None) -> Path:
    existing = find_ffmpeg_bin()
    if existing:
        return existing
    return download_ffmpeg(progress_cb)


# ---------------------------------------------------------------------------
# yt-dlp server module
# ---------------------------------------------------------------------------

_tubetone = None


def load_engine(ffmpeg_bin: Path):
    global _tubetone
    os.environ["FFMPEG_LOCATION"] = str(ffmpeg_bin)
    os.environ["HOST"] = "127.0.0.1"
    os.environ["PORT"] = "8765"
    os.environ.pop("RENDER", None)
    os.environ.pop("API_KEY", None)

    candidates = []
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        meipass = Path(sys._MEIPASS)
        candidates.extend([meipass / "server", meipass])
    candidates.extend([APP_DIR / "server", APP_DIR])

    for server_path in candidates:
        if (server_path / "server.py").is_file():
            if str(server_path) not in sys.path:
                sys.path.insert(0, str(server_path))
            break
    else:
        raise RuntimeError("server.py not found")

    import server as tubetone  # type: ignore  # noqa: WPS433

    tubetone.FFMPEG_LOCATION = str(ffmpeg_bin)
    tubetone.API_KEY = ""
    found = tubetone.find_ffmpeg()
    if found:
        tubetone.FFMPEG_LOCATION = found
    _tubetone = tubetone
    return tubetone


def normalize_url(text: str) -> str | None:
    text = text.strip()
    if not text:
        return None
    m = YT_RE.search(text)
    if not m:
        return None
    url = m.group(0)
    if not url.startswith("http"):
        url = "https://" + url
    # Canonical watch URL when possible
    try:
        from urllib.parse import parse_qs, urlparse

        u = urlparse(url)
        host = u.hostname.replace("www.", "") if u.hostname else ""
        if host == "youtu.be":
            vid = u.pathname.strip("/").split("/")[0]
            return f"https://www.youtube.com/watch?v={vid}" if vid else None
        if "youtube.com" in host:
            if u.pathname == "/watch":
                vid = parse_qs(u.query).get("v", [None])[0]
                return f"https://www.youtube.com/watch?v={vid}" if vid else None
            for prefix in ("/shorts/", "/embed/", "/live/"):
                if u.pathname.startswith(prefix):
                    vid = u.pathname[len(prefix) :].split("/")[0]
                    return f"https://www.youtube.com/watch?v={vid}" if vid else None
    except Exception:
        pass
    return url


def download_one(url: str, bitrate: int, out_dir: Path) -> Path:
    assert _tubetone is not None
    out_dir.mkdir(parents=True, exist_ok=True)
    result = _tubetone.download_mp3(url, bitrate, cookiefile=None)
    src = Path(result["path"])
    dest = out_dir / result["filename"]
    # Avoid overwrite collisions
    if dest.exists() and dest.resolve() != src.resolve():
        stem, suf = dest.stem, dest.suffix
        n = 2
        while dest.exists():
            dest = out_dir / f"{stem} ({n}){suf}"
            n += 1
    if src.resolve() != dest.resolve():
        shutil.move(str(src), str(dest))
    _tubetone.cleanup_work(result)
    return dest


# ---------------------------------------------------------------------------
# GUI
# ---------------------------------------------------------------------------


def run_gui() -> None:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk

    root = tk.Tk()
    root.title("TubeTone — YouTube MP3")
    root.geometry("640x560")
    root.minsize(560, 480)
    root.configure(bg="#12141a")

    style = ttk.Style()
    try:
        style.theme_use("clam")
    except tk.TclError:
        pass
    style.configure("TFrame", background="#12141a")
    style.configure("TLabel", background="#12141a", foreground="#f0ece4", font=("Segoe UI", 10))
    style.configure("Title.TLabel", font=("Segoe UI", 18, "bold"), foreground="#e8a23a")
    style.configure("TButton", font=("Segoe UI", 10), padding=8)
    style.configure("TCombobox", padding=4)
    style.configure("Status.TLabel", foreground="#3dcf8e")

    main = ttk.Frame(root, padding=18)
    main.pack(fill="both", expand=True)

    ttk.Label(main, text="TubeTone", style="Title.TLabel").pack(anchor="w")
    ttk.Label(main, text="Paste YouTube links → download MP3").pack(anchor="w", pady=(2, 12))

    status_var = tk.StringVar(value="Starting…")
    ttk.Label(main, textvariable=status_var, style="Status.TLabel").pack(anchor="w")

    # --- URL box ---
    ttk.Label(main, text="YouTube URL(s) — one per line for bulk").pack(anchor="w", pady=(14, 4))
    url_frame = ttk.Frame(main)
    url_frame.pack(fill="both", expand=True)
    url_text = tk.Text(
        url_frame,
        height=8,
        wrap="word",
        bg="#1a1d27",
        fg="#f0ece4",
        insertbackground="#f0ece4",
        relief="flat",
        font=("Segoe UI", 10),
        padx=8,
        pady=8,
    )
    url_scroll = ttk.Scrollbar(url_frame, command=url_text.yview)
    url_text.configure(yscrollcommand=url_scroll.set)
    url_text.pack(side="left", fill="both", expand=True)
    url_scroll.pack(side="right", fill="y")

    # --- options ---
    opts = ttk.Frame(main)
    opts.pack(fill="x", pady=(12, 0))

    ttk.Label(opts, text="Bitrate").grid(row=0, column=0, sticky="w")
    bitrate_var = tk.StringVar(value="128")
    bitrate_box = ttk.Combobox(
        opts,
        textvariable=bitrate_var,
        values=["64", "128", "192", "256", "320"],
        width=8,
        state="readonly",
    )
    bitrate_box.grid(row=0, column=1, sticky="w", padx=(8, 24))

    ttk.Label(opts, text="Save to").grid(row=0, column=2, sticky="w")
    out_var = tk.StringVar(value=str(DEFAULT_OUT))
    out_entry = ttk.Entry(opts, textvariable=out_var, width=36)
    out_entry.grid(row=0, column=3, sticky="we", padx=(8, 8))
    opts.columnconfigure(3, weight=1)

    def pick_folder() -> None:
        path = filedialog.askdirectory(initialdir=out_var.get() or str(DEFAULT_OUT))
        if path:
            out_var.set(path)

    ttk.Button(opts, text="Browse…", command=pick_folder).grid(row=0, column=4, sticky="e")

    # --- log ---
    log_var = tk.StringVar(value="")
    ttk.Label(main, textvariable=log_var, wraplength=600).pack(anchor="w", pady=(10, 0))

    busy = {"on": False}

    def ui_log(msg: str) -> None:
        write_log(msg)
        root.after(0, lambda: log_var.set(msg))

    def set_status(msg: str) -> None:
        root.after(0, lambda: status_var.set(msg))

    def set_busy(on: bool) -> None:
        busy["on"] = on
        state = "disabled" if on else "normal"
        root.after(0, lambda: download_btn.configure(state=state))
        root.after(0, lambda: clear_btn.configure(state=state))

    def parse_urls() -> list[str]:
        raw = url_text.get("1.0", "end")
        urls: list[str] = []
        seen: set[str] = set()
        for line in raw.splitlines():
            u = normalize_url(line)
            if u and u not in seen:
                seen.add(u)
                urls.append(u)
        return urls

    def do_download() -> None:
        if busy["on"]:
            return
        urls = parse_urls()
        if not urls:
            messagebox.showwarning("No URL", "Paste at least one valid YouTube link.")
            return
        try:
            bitrate = int(bitrate_var.get())
        except ValueError:
            bitrate = 128
        out_dir = Path(out_var.get().strip() or str(DEFAULT_OUT))

        def worker() -> None:
            set_busy(True)
            ok = 0
            try:
                for i, url in enumerate(urls, 1):
                    ui_log(f"[{i}/{len(urls)}] Downloading…\n{url}")
                    try:
                        dest = download_one(url, bitrate, out_dir)
                        ok += 1
                        ui_log(f"Saved: {dest.name}")
                    except Exception as exc:
                        write_log(traceback.format_exc())
                        ui_log(f"Failed: {exc}")
                ui_log(f"Done — {ok}/{len(urls)} saved to {out_dir}")
                if ok:
                    root.after(
                        0,
                        lambda: messagebox.showinfo(
                            "TubeTone",
                            f"Downloaded {ok}/{len(urls)} MP3(s)\n\n{out_dir}",
                        ),
                    )
            finally:
                set_busy(False)

        threading.Thread(target=worker, daemon=True).start()

    def open_out() -> None:
        path = Path(out_var.get().strip() or str(DEFAULT_OUT))
        path.mkdir(parents=True, exist_ok=True)
        subprocess.Popen(["explorer", str(path)])

    def clear_urls() -> None:
        url_text.delete("1.0", "end")

    btns = ttk.Frame(main)
    btns.pack(fill="x", pady=(14, 0))
    download_btn = ttk.Button(btns, text="Download MP3", command=do_download)
    download_btn.pack(side="left", padx=(0, 8))
    clear_btn = ttk.Button(btns, text="Clear", command=clear_urls)
    clear_btn.pack(side="left", padx=(0, 8))
    ttk.Button(btns, text="Open save folder", command=open_out).pack(side="left")

    def boot() -> None:
        try:
            ui_log("Checking ffmpeg…")
            ffmpeg = ensure_ffmpeg(progress_cb=ui_log)
            ui_log("Loading downloader…")
            load_engine(ffmpeg)
            set_status(f"● Ready  ·  ffmpeg: {ffmpeg}")
            ui_log("Paste a YouTube link and click Download MP3.")
            DEFAULT_OUT.mkdir(parents=True, exist_ok=True)
        except Exception as exc:
            write_log(traceback.format_exc())
            set_status("● Setup failed")
            root.after(
                0,
                lambda: messagebox.showerror(
                    "Setup failed",
                    f"{exc}\n\nLog: {DATA_DIR / 'launcher.log'}",
                ),
            )

    threading.Thread(target=boot, daemon=True).start()
    root.mainloop()


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    write_log("--- TubeTone standalone start ---")
    run_gui()


if __name__ == "__main__":
    main()
