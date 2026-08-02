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


def download_one(url: str, bitrate: int, out_dir: Path, progress_hooks=None) -> Path:
    assert _tubetone is not None
    out_dir.mkdir(parents=True, exist_ok=True)
    result = _tubetone.download_mp3(
        url, bitrate, cookiefile=None, progress_hooks=progress_hooks or []
    )
    src = Path(result["path"])
    dest = out_dir / result["filename"]
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

COLORS = {
    "bg": "#0e1016",
    "panel": "#171a24",
    "panel2": "#1e2330",
    "border": "#2c3345",
    "text": "#f3efe6",
    "muted": "#9aa3b5",
    "accent": "#e8a23a",
    "accent2": "#c47f18",
    "ok": "#3dcf8e",
    "danger": "#e86a6a",
}


def run_gui() -> None:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk

    root = tk.Tk()
    root.title("TubeTone")
    root.geometry("720x640")
    root.minsize(640, 560)
    root.configure(bg=COLORS["bg"])

    style = ttk.Style()
    try:
        style.theme_use("clam")
    except tk.TclError:
        pass

    style.configure(".", background=COLORS["bg"], foreground=COLORS["text"], font=("Segoe UI", 10))
    style.configure("TFrame", background=COLORS["bg"])
    style.configure("Card.TFrame", background=COLORS["panel"])
    style.configure("TLabel", background=COLORS["bg"], foreground=COLORS["text"])
    style.configure("Card.TLabel", background=COLORS["panel"], foreground=COLORS["text"])
    style.configure("Muted.TLabel", background=COLORS["panel"], foreground=COLORS["muted"], font=("Segoe UI", 9))
    style.configure("Title.TLabel", background=COLORS["bg"], foreground=COLORS["accent"], font=("Segoe UI Semibold", 22))
    style.configure("Sub.TLabel", background=COLORS["bg"], foreground=COLORS["muted"], font=("Segoe UI", 10))
    style.configure("Status.TLabel", background=COLORS["bg"], foreground=COLORS["ok"], font=("Segoe UI", 10))
    style.configure("Pct.TLabel", background=COLORS["panel"], foreground=COLORS["accent"], font=("Segoe UI Semibold", 11))
    style.configure(
        "Accent.TButton",
        background=COLORS["accent"],
        foreground="#1a1208",
        font=("Segoe UI Semibold", 11),
        padding=(16, 10),
        borderwidth=0,
    )
    style.map(
        "Accent.TButton",
        background=[("active", COLORS["accent2"]), ("disabled", "#5a4a30")],
        foreground=[("disabled", "#2a2218")],
    )
    style.configure(
        "Ghost.TButton",
        background=COLORS["panel2"],
        foreground=COLORS["text"],
        font=("Segoe UI", 10),
        padding=(12, 8),
        borderwidth=0,
    )
    style.map("Ghost.TButton", background=[("active", COLORS["border"])])
    style.configure(
        "TCombobox",
        fieldbackground=COLORS["panel2"],
        background=COLORS["panel2"],
        foreground=COLORS["text"],
        arrowcolor=COLORS["accent"],
        padding=6,
    )
    style.configure(
        "TEntry",
        fieldbackground=COLORS["panel2"],
        foreground=COLORS["text"],
        insertcolor=COLORS["text"],
        padding=6,
    )
    style.configure(
        "Amber.Horizontal.TProgressbar",
        troughcolor=COLORS["panel2"],
        background=COLORS["accent"],
        lightcolor=COLORS["accent"],
        darkcolor=COLORS["accent2"],
        bordercolor=COLORS["panel2"],
        thickness=14,
    )

    # Outer layout
    shell = ttk.Frame(root, padding=22)
    shell.pack(fill="both", expand=True)

    # Header
    header = ttk.Frame(shell)
    header.pack(fill="x")
    brand = ttk.Frame(header)
    brand.pack(side="left")
    ttk.Label(brand, text="TubeTone", style="Title.TLabel").pack(anchor="w")
    ttk.Label(brand, text="YouTube → MP3, locally on your PC", style="Sub.TLabel").pack(anchor="w")
    status_var = tk.StringVar(value="Starting…")
    ttk.Label(header, textvariable=status_var, style="Status.TLabel").pack(side="right", anchor="e")

    # Accent rule
    rule = tk.Frame(shell, bg=COLORS["accent"], height=2)
    rule.pack(fill="x", pady=(14, 16))

    # Card: URLs
    card = tk.Frame(shell, bg=COLORS["panel"], highlightthickness=1, highlightbackground=COLORS["border"])
    card.pack(fill="both", expand=True)
    card_inner = ttk.Frame(card, style="Card.TFrame", padding=16)
    card_inner.pack(fill="both", expand=True)

    ttk.Label(card_inner, text="LINKS", style="Muted.TLabel").pack(anchor="w")
    ttk.Label(
        card_inner,
        text="Paste one or more YouTube URLs (one per line)",
        style="Card.TLabel",
    ).pack(anchor="w", pady=(2, 8))

    url_wrap = tk.Frame(card_inner, bg=COLORS["panel2"], highlightthickness=1, highlightbackground=COLORS["border"])
    url_wrap.pack(fill="both", expand=True)
    url_text = tk.Text(
        url_wrap,
        height=9,
        wrap="word",
        bg=COLORS["panel2"],
        fg=COLORS["text"],
        insertbackground=COLORS["accent"],
        selectbackground="#3a2e1c",
        selectforeground=COLORS["text"],
        relief="flat",
        borderwidth=0,
        font=("Cascadia Mono", 10) if sys.platform == "win32" else ("Consolas", 10),
        padx=12,
        pady=10,
    )
    url_scroll = ttk.Scrollbar(url_wrap, command=url_text.yview)
    url_text.configure(yscrollcommand=url_scroll.set)
    url_text.pack(side="left", fill="both", expand=True)
    url_scroll.pack(side="right", fill="y")

    # Options row
    opts_card = tk.Frame(shell, bg=COLORS["panel"], highlightthickness=1, highlightbackground=COLORS["border"])
    opts_card.pack(fill="x", pady=(12, 0))
    opts = ttk.Frame(opts_card, style="Card.TFrame", padding=14)
    opts.pack(fill="x")

    ttk.Label(opts, text="BITRATE", style="Muted.TLabel").grid(row=0, column=0, sticky="w")
    bitrate_var = tk.StringVar(value="128")
    bitrate_box = ttk.Combobox(
        opts,
        textvariable=bitrate_var,
        values=["64", "128", "192", "256", "320"],
        width=8,
        state="readonly",
    )
    bitrate_box.grid(row=1, column=0, sticky="w", pady=(4, 0))

    ttk.Label(opts, text="SAVE FOLDER", style="Muted.TLabel").grid(
        row=0, column=1, sticky="w", padx=(20, 0)
    )
    out_var = tk.StringVar(value=str(DEFAULT_OUT))
    out_entry = ttk.Entry(opts, textvariable=out_var, width=42)
    out_entry.grid(row=1, column=1, sticky="we", padx=(20, 8), pady=(4, 0))
    opts.columnconfigure(1, weight=1)

    def pick_folder() -> None:
        path = filedialog.askdirectory(initialdir=out_var.get() or str(DEFAULT_OUT))
        if path:
            out_var.set(path)

    ttk.Button(opts, text="Browse", style="Ghost.TButton", command=pick_folder).grid(
        row=1, column=2, sticky="e", pady=(4, 0)
    )

    # Progress card
    prog_card = tk.Frame(shell, bg=COLORS["panel"], highlightthickness=1, highlightbackground=COLORS["border"])
    prog_card.pack(fill="x", pady=(12, 0))
    prog = ttk.Frame(prog_card, style="Card.TFrame", padding=14)
    prog.pack(fill="x")

    prog_top = ttk.Frame(prog, style="Card.TFrame")
    prog_top.pack(fill="x")
    detail_var = tk.StringVar(value="Waiting for a download…")
    pct_var = tk.StringVar(value="0%")
    ttk.Label(prog_top, textvariable=detail_var, style="Muted.TLabel").pack(side="left")
    ttk.Label(prog_top, textvariable=pct_var, style="Pct.TLabel").pack(side="right")

    progress = ttk.Progressbar(
        prog,
        style="Amber.Horizontal.TProgressbar",
        mode="determinate",
        maximum=100,
        value=0,
    )
    progress.pack(fill="x", pady=(10, 0))

    song_var = tk.StringVar(value="")
    ttk.Label(prog, textvariable=song_var, style="Card.TLabel").pack(anchor="w", pady=(8, 0))

    # Actions
    btns = ttk.Frame(shell)
    btns.pack(fill="x", pady=(16, 0))

    busy = {"on": False}

    def set_progress(pct: float, detail: str, song: str = "") -> None:
        pct = max(0.0, min(100.0, pct))

        def apply() -> None:
            progress["value"] = pct
            pct_var.set(f"{pct:.0f}%")
            detail_var.set(detail)
            if song:
                song_var.set(song)

        root.after(0, apply)

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

    def make_hook(index: int, total: int, url: str):
        def hook(d: dict) -> None:
            status = d.get("status")
            if status == "downloading":
                total_bytes = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
                downloaded = d.get("downloaded_bytes") or 0
                if total_bytes:
                    file_pct = downloaded / total_bytes * 100
                else:
                    file_pct = 0
                overall = ((index - 1) + file_pct / 100) / total * 100
                speed = d.get("speed") or 0
                eta = d.get("eta")
                speed_s = f"{speed/1024/1024:.1f} MB/s" if speed else "…"
                eta_s = f" · ETA {eta}s" if eta is not None else ""
                set_progress(
                    overall,
                    f"Song {index}/{total} · {file_pct:.0f}% · {speed_s}{eta_s}",
                    url,
                )
            elif status == "finished":
                overall = index / total * 100
                set_progress(overall, f"Song {index}/{total} · converting to MP3…", url)

        return hook

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
                set_progress(0, "Preparing…")
                for i, url in enumerate(urls, 1):
                    set_progress((i - 1) / len(urls) * 100, f"Song {i}/{len(urls)} · starting…", url)
                    try:
                        dest = download_one(
                            url,
                            bitrate,
                            out_dir,
                            progress_hooks=[make_hook(i, len(urls), url)],
                        )
                        ok += 1
                        set_progress(i / len(urls) * 100, f"Saved {dest.name}", dest.name)
                    except Exception as exc:
                        write_log(traceback.format_exc())
                        set_progress(
                            i / len(urls) * 100,
                            f"Failed ({i}/{len(urls)}): {exc}",
                            url,
                        )
                final_pct = 100.0 if ok else (ok / max(len(urls), 1) * 100)
                set_progress(final_pct, f"Done — {ok}/{len(urls)} saved")
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
        set_progress(0, "Waiting for a download…")
        song_var.set("")

    download_btn = ttk.Button(btns, text="Download MP3", style="Accent.TButton", command=do_download)
    download_btn.pack(side="left", padx=(0, 8))
    clear_btn = ttk.Button(btns, text="Clear", style="Ghost.TButton", command=clear_urls)
    clear_btn.pack(side="left", padx=(0, 8))
    ttk.Button(btns, text="Open folder", style="Ghost.TButton", command=open_out).pack(side="left")

    def boot() -> None:
        try:
            set_progress(5, "Checking ffmpeg…")
            ffmpeg = ensure_ffmpeg(progress_cb=lambda m: set_progress(15, m))
            set_progress(40, "Loading engine…")
            load_engine(ffmpeg)
            set_status("● Ready")
            set_progress(0, "Ready — paste a link and hit Download")
            DEFAULT_OUT.mkdir(parents=True, exist_ok=True)
        except Exception as exc:
            write_log(traceback.format_exc())
            set_status("● Setup failed")
            set_progress(0, str(exc))
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
