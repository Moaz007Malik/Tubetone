"""
YTMP — media toolkit for Windows: download, convert, trim, compress, and more.
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
import json
from pathlib import Path

# Prefer bundled updater path when frozen / local
_LAUNCHER_DIR = Path(__file__).resolve().parent
if str(_LAUNCHER_DIR) not in sys.path:
    sys.path.insert(0, str(_LAUNCHER_DIR))

try:
    from ytdlp_updater import prefer_updated_ytdlp

    prefer_updated_ytdlp()
except Exception:
    pass

import license_client
import media_tools
import settings_store
import glass_ui
from glass_ui import (
    G,
    Atmosphere,
    GlassButton,
    GlassEntry,
    SegmentBar,
    apply_styles,
    dark_option_menu,
    make_glass_card,
    section_title,
)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------


def app_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


APP_DIR = app_dir()
DATA_DIR = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "YTMP"
FFMPEG_DIR = DATA_DIR / "ffmpeg"
FFMPEG_BIN = FFMPEG_DIR / "bin"
DEFAULT_OUT = Path.home() / "Downloads" / "YTMP"

# Stable alias always points at the latest essentials zip (versioned package URLs 404).
FFMPEG_ZIP_URLS = (
    "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip",
    "https://github.com/GyanD/codexffmpeg/releases/latest/download/ffmpeg-release-essentials.zip",
)

YT_RE = re.compile(
    r"(https?://)?(www\.|m\.|music\.)?(youtube\.com/(watch\?v=|shorts/|embed/|live/)|youtu\.be/)[\w-]+",
    re.I,
)
URL_RE = re.compile(r"https?://[^\s<>\"']+", re.I)


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


def _download_file(url: str, dest: Path) -> None:
    req = urllib.request.Request(  # noqa: S310
        url,
        headers={"User-Agent": "YTMP/1.2 (Windows; ffmpeg bootstrap)"},
    )
    with urllib.request.urlopen(req, timeout=300) as resp, dest.open("wb") as out:  # noqa: S310
        while True:
            chunk = resp.read(1024 * 256)
            if not chunk:
                break
            out.write(chunk)


def download_ffmpeg(progress_cb=None) -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = DATA_DIR / "ffmpeg.zip"
    extract_to = DATA_DIR / "ffmpeg_extract"

    def report(msg: str) -> None:
        write_log(msg)
        if progress_cb:
            progress_cb(msg)

    report("Downloading ffmpeg (one-time, ~80 MB)…")
    last_err: Exception | None = None
    for url in FFMPEG_ZIP_URLS:
        try:
            write_log(f"Trying ffmpeg URL: {url}")
            _download_file(url, zip_path)
            last_err = None
            break
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            write_log(f"ffmpeg download failed ({url}): {exc}")
            zip_path.unlink(missing_ok=True)
    if last_err is not None:
        raise RuntimeError(f"Could not download ffmpeg: {last_err}") from last_err

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
    if m:
        url = m.group(0)
        if not url.startswith("http"):
            url = "https://" + url
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
    # Any other http(s) URL — yt-dlp supports many sites (SoundCloud, Vimeo, X, etc.)
    m2 = URL_RE.search(text)
    if m2:
        return m2.group(0).rstrip(").,]}")
    if text.startswith("www."):
        return "https://" + text
    return None


def download_one(
    url: str,
    bitrate: int,
    out_dir: Path,
    progress_hooks=None,
    *,
    mode: str = "music",
    quality: str = "720",
    filename_template: str | None = None,
    audio_format: str = "mp3",
    write_subs: bool = False,
    write_thumbnail: bool = False,
) -> Path:
    assert _tubetone is not None
    out_dir.mkdir(parents=True, exist_ok=True)
    if mode == "video":
        result = _tubetone.download_video(
            url,
            quality,
            bitrate,
            cookiefile=None,
            progress_hooks=progress_hooks or [],
            filename_template=filename_template,
        )
    else:
        # Prefer codec via bitrate path; server extracts preferredcodec
        result = _tubetone.download_mp3(
            url,
            bitrate,
            cookiefile=None,
            progress_hooks=progress_hooks or [],
            filename_template=filename_template,
            preferredcodec=audio_format,
            write_subs=write_subs,
            write_thumbnail=write_thumbnail,
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
    # move sidecars (subs / thumbs)
    work = Path(result.get("workdir") or src.parent)
    for sub in work.glob(f"{src.stem}.*"):
        if (
            sub.suffix.lower() in {".vtt", ".srt", ".ass", ".jpg", ".png", ".webp"}
            and sub.resolve() != dest.resolve()
        ):
            shutil.move(str(sub), str(out_dir / sub.name))
    _tubetone.cleanup_work(result)
    return dest


# ---------------------------------------------------------------------------
# GUI
# ---------------------------------------------------------------------------

COLORS = {
    "bg": G["bg"],
    "bg2": G["bg_mid"],
    "panel": G["glass"],
    "panel2": G["glass2"],
    "panel3": G["glass3"],
    "border": G["edge_light"],
    "border2": G["glass_hi"],
    "text": G["text"],
    "muted": G["muted"],
    "faint": G["faint"],
    "accent": G["accent"],
    "accent2": G["accent2"],
    "accent_dim": G["accent_deep"],
    "ok": G["ok"],
    "warn": G["warn"],
    "danger": G["danger"],
    "on_accent": G["on_accent"],
}


def run_gui() -> None:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk

    root = tk.Tk()
    root.title("YTMP")
    try:
        sw, sh = root.winfo_screenwidth(), root.winfo_screenheight()
        w = min(1020, max(900, sw - 80))
        h = min(900, max(780, int(sh * 0.88)))
        root.geometry(f"{w}x{h}")
    except Exception:
        root.geometry("960x840")
    root.minsize(860, 720)
    root.configure(bg=G["bg_deep"])

    atmosphere = Atmosphere(root)
    atmosphere.place(x=0, y=0, relwidth=1, relheight=1)

    try:
        icon_candidates = []
        if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
            meipass = Path(sys._MEIPASS)
            icon_candidates.extend(
                [meipass / "tubetone.ico", meipass / "icon.png", APP_DIR / "tubetone.ico"]
            )
        icon_candidates.extend(
            [
                Path(__file__).resolve().parent / "tubetone.ico",
                APP_DIR / "tubetone.ico",
                Path(__file__).resolve().parent.parent / "icon.png",
                APP_DIR / "icon.png",
            ]
        )
        for icon_path in icon_candidates:
            if not icon_path.is_file():
                continue
            if icon_path.suffix.lower() == ".ico":
                root.iconbitmap(default=str(icon_path))
                break
            if icon_path.suffix.lower() == ".png":
                img = tk.PhotoImage(file=str(icon_path))
                root.iconphoto(True, img)
                root._icon_img = img
                break
    except Exception:
        pass

    style = ttk.Style()
    apply_styles(style)

    font_ui = ("Segoe UI", 10)
    font_ui_sm = ("Segoe UI", 9)
    font_ui_md = ("Segoe UI Semibold", 10)
    font_ui_lg = ("Segoe UI Semibold", 11)
    font_brand = ("Segoe UI Semibold", 28)
    font_mono = ("Cascadia Mono", 10) if sys.platform == "win32" else ("Consolas", 10)

    def make_card(parent, **pack):
        return make_glass_card(parent, padding=16, elevate=1, **pack)

    def section_label(parent, title: str, subtitle: str | None = None, step: str | None = None) -> None:
        section_title(parent, title, subtitle, step=step)

    def dark_menu(parent, variable: tk.StringVar, *values, width: int = 8):
        return dark_option_menu(parent, variable, *values, width=width)

    shell = tk.Frame(root, bg=G["bg_deep"], bd=0, highlightthickness=0)
    shell.place(relx=0, rely=0, relwidth=1, relheight=1)
    shell_inner = tk.Frame(shell, bg=G["bg_deep"], bd=0)
    shell_inner.pack(fill="both", expand=True, padx=22, pady=18)

    # glass transparent-ish shell: leave atmosphere visible at edges via deep bg
    header_panel, header = make_card(shell_inner)
    header_panel.pack(fill="x")

    brand = ttk.Frame(header, style="Glass.TFrame")
    brand.pack(side="left")
    brand_row = ttk.Frame(brand, style="Glass.TFrame")
    brand_row.pack(anchor="w")
    ttk.Label(brand_row, text="YTMP", style="Brand.TLabel").pack(side="left")
    ver_badge = tk.Label(
        brand_row,
        text=" GLASS 1.3 ",
        bg=G["accent_deep"],
        fg=G["accent2"],
        font=("Segoe UI Semibold", 9),
        padx=8,
        pady=3,
    )
    ver_badge.pack(side="left", padx=(12, 0), pady=(6, 0))
    ttk.Label(
        brand,
        text="Download · Convert · Edit — glass UI on your PC",
        style="GlassMuted.TLabel",
    ).pack(anchor="w", pady=(4, 0))

    status_var = tk.StringVar(value="Starting…")
    status_shell = tk.Frame(header, bg=G["edge_dark"], bd=0)
    status_shell.pack(side="right", anchor="e")
    status_edge = tk.Frame(status_shell, bg=G["edge_light"], bd=0)
    status_edge.pack(padx=1, pady=1)
    status_pill = tk.Frame(status_edge, bg=G["glass2"], bd=0)
    status_pill.pack(padx=1, pady=1)
    status_lbl = tk.Label(
        status_pill,
        textvariable=status_var,
        bg=G["glass2"],
        fg=G["ok"],
        font=font_ui_md,
        padx=14,
        pady=10,
    )
    status_lbl.pack()

    tip_var = tk.StringVar(value="Start on Download: paste links → pick Music or Video → Download")
    tip_lbl = tk.Label(
        shell_inner,
        textvariable=tip_var,
        bg=G["bg_deep"],
        fg=G["muted"],
        font=font_ui_sm,
        anchor="w",
    )
    tip_lbl.pack(fill="x", pady=(12, 8))

    footer = tk.Frame(shell_inner, bg=G["bg_deep"])
    footer.pack(side="bottom", fill="x")

    notebook_host = tk.Frame(shell_inner, bg=G["bg_deep"])
    notebook_host.pack(fill="both", expand=True)
    notebook = ttk.Notebook(notebook_host)
    notebook.pack(fill="both", expand=True)
    download_tab = ttk.Frame(notebook)
    convert_tab = ttk.Frame(notebook)
    tools_tab = ttk.Frame(notebook)
    library_tab = ttk.Frame(notebook)
    notebook.add(download_tab, text="  Download  ")
    notebook.add(convert_tab, text="  Convert  ")
    notebook.add(tools_tab, text="  Tools  ")
    notebook.add(library_tab, text="  Library  ")

    def on_tab_change(_event=None) -> None:
        try:
            name = notebook.tab(notebook.select(), "text").strip()
        except Exception:
            name = "Download"
        tips = {
            "Download": "Step 1 → Add links   ·   Step 2 → Choose Music or Video   ·   Step 3 → Hit Download",
            "Convert": "Browse a file or folder, pick a format, convert locally — nothing leaves your PC.",
            "Tools": "Load a file, set parameters, then pick a tool. Trim, GIF, merge, and more.",
            "Library": "Find past exports. Select a row and press Open.",
        }
        tip_var.set(tips.get(name, tips["Download"]))
        if name == "Library":
            try:
                refresh_lib()
            except NameError:
                pass

    notebook.bind("<<NotebookTabChanged>>", on_tab_change)

    # ----- Download tab -----
    dl_scroll_host = tk.Frame(download_tab, bg=G["bg_deep"])
    dl_scroll_host.pack(fill="both", expand=True, padx=2, pady=(4, 0))

    _, card_inner = make_card(dl_scroll_host, fill="both", expand=True)
    section_label(
        card_inner,
        "Add links",
        "YouTube, SoundCloud, Vimeo, and many more — one URL per line",
        step="1",
    )

    link_tools = ttk.Frame(card_inner, style="Glass.TFrame")
    link_tools.pack(fill="x", pady=(12, 8))

    url_outer = tk.Frame(card_inner, bg=G["edge_dark"], bd=0)
    url_outer.pack(fill="both", expand=True)
    url_edge = tk.Frame(url_outer, bg=G["edge_light"], bd=0)
    url_edge.pack(fill="both", expand=True, padx=1, pady=1)
    url_wrap = tk.Frame(url_edge, bg=G["input"], bd=0)
    url_wrap.pack(fill="both", expand=True, padx=1, pady=1)
    url_text = tk.Text(
        url_wrap,
        height=6,
        wrap="word",
        bg=G["input"],
        fg=G["text"],
        insertbackground=G["accent"],
        selectbackground="#1a4a4a",
        selectforeground=G["text"],
        relief="flat",
        borderwidth=0,
        font=font_mono,
        padx=14,
        pady=12,
    )
    url_scroll = ttk.Scrollbar(url_wrap, command=url_text.yview)
    url_text.configure(yscrollcommand=url_scroll.set)
    url_text.pack(side="left", fill="both", expand=True)
    url_scroll.pack(side="right", fill="y")

    info_var = tk.StringVar(value="")
    ttk.Label(card_inner, textvariable=info_var, style="GlassMuted.TLabel").pack(anchor="w", pady=(8, 0))

    def append_urls_text(text: str) -> None:
        lines = [ln.strip() for ln in text.replace("\r", "\n").split("\n") if ln.strip()]
        if not lines:
            return
        current = url_text.get("1.0", "end").strip()
        block = "\n".join(lines)
        if current:
            url_text.insert("end", "\n" + block)
        else:
            url_text.insert("1.0", block)

    def paste_clipboard() -> None:
        try:
            clip = root.clipboard_get()
        except tk.TclError:
            messagebox.showinfo("Clipboard", "Clipboard is empty.")
            return
        append_urls_text(clip)

    def import_txt() -> None:
        path = filedialog.askopenfilename(
            title="Import URL list",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")],
        )
        if not path:
            return
        try:
            content = Path(path).read_text(encoding="utf-8", errors="ignore")
        except OSError as exc:
            messagebox.showerror("Import failed", str(exc))
            return
        append_urls_text(content)
        messagebox.showinfo("Imported", f"Loaded links from {Path(path).name}")

    def dedupe_urls() -> None:
        raw = url_text.get("1.0", "end")
        seen: set[str] = set()
        out: list[str] = []
        for line in raw.splitlines():
            key = line.strip()
            if not key or key in seen:
                continue
            seen.add(key)
            out.append(line.rstrip())
        url_text.delete("1.0", "end")
        url_text.insert("1.0", "\n".join(out))

    def preview_info() -> None:
        urls = parse_urls()
        if not urls:
            messagebox.showwarning("Preview", "Add at least one YouTube link first.")
            return
        if not _tubetone:
            messagebox.showwarning("Preview", "Engine not ready yet.")
            return

        def worker() -> None:
            try:
                set_progress(5, "Fetching info…")
                info = _tubetone.fetch_info(urls[0])
                if info.get("is_playlist"):
                    msg = f"Playlist · {info.get('playlist_count') or '?'} items · {info.get('title')}"
                else:
                    dur = info.get("duration_label") or "?"
                    up = info.get("uploader") or "Unknown"
                    msg = f"{info.get('title')} · {dur} · {up}"
                root.after(0, lambda: info_var.set(msg))
                set_progress(0, "Preview ready")
            except Exception as exc:
                root.after(0, lambda: info_var.set(f"Preview failed: {exc}"))
                set_progress(0, "Preview failed")

        threading.Thread(target=worker, daemon=True).start()

    GlassButton(link_tools, text="Paste", command=paste_clipboard, soft=True).pack(side="left", padx=(0, 8))
    GlassButton(link_tools, text="Import .txt", command=import_txt, soft=True).pack(side="left", padx=(0, 8))
    GlassButton(link_tools, text="Remove duplicates", command=dedupe_urls, soft=True).pack(side="left", padx=(0, 8))
    GlassButton(link_tools, text="Preview", command=preview_info, soft=True).pack(side="left")

    # Basic drag-and-drop of text files / URL text via Windows OLE if available
    def on_drop_files(files: list[str]) -> None:
        for f in files:
            p = Path(f)
            if p.suffix.lower() == ".txt" and p.is_file():
                try:
                    append_urls_text(p.read_text(encoding="utf-8", errors="ignore"))
                except OSError:
                    pass

    try:
        import windnd  # type: ignore

        windnd.hook_dropfiles(url_text, func=on_drop_files)
    except Exception:
        pass

    # Mode + options glass card
    _, mode_row = make_card(dl_scroll_host, fill="x", pady=(12, 0))
    section_label(mode_row, "Choose mode & quality", "Music downloads audio · Video saves MP4", step="2")
    mode_var = tk.StringVar(value="music")
    mode_seg = SegmentBar(
        mode_row,
        [("music", "Music"), ("video", "Video")],
        command=lambda k: set_mode(k),
    )
    mode_seg.pack(anchor="w", pady=(10, 14))
    music_btn = mode_seg
    video_btn = mode_seg

    opts = ttk.Frame(mode_row, style="Glass.TFrame")
    opts.pack(fill="x")

    quality_label = ttk.Label(opts, text="QUALITY", style="GlassMuted.TLabel")
    quality_var = tk.StringVar(value="720")
    quality_menu = dark_menu(opts, quality_var, "360", "480", "720", "1080", "1440", "2160", "best", width=7)

    bitrate_label = ttk.Label(opts, text="AUDIO BITRATE", style="GlassMuted.TLabel")
    bitrate_var = tk.StringVar(value="128")
    bitrate_menu = dark_menu(opts, bitrate_var, "64", "128", "192", "256", "320", width=6)

    saved = settings_store.load_settings()
    folder_label = ttk.Label(opts, text="SAVE FOLDER", style="GlassMuted.TLabel")
    out_var = tk.StringVar(value=saved.get("outDir") or str(DEFAULT_OUT))
    out_entry = tk.Entry(
        opts,
        textvariable=out_var,
        width=42,
        bg=G["input"],
        fg=G["text"],
        insertbackground=G["accent"],
        relief="flat",
        highlightthickness=1,
        highlightbackground=G["input_edge"],
        highlightcolor=G["accent"],
        font=font_ui,
    )

    # Extra settings
    extra = ttk.Frame(mode_row, style="Glass.TFrame")
    extra.pack(fill="x", pady=(14, 0))
    ttk.Label(extra, text="FILENAME TEMPLATE", style="GlassMuted.TLabel").grid(row=0, column=0, sticky="w")
    tmpl_var = tk.StringVar(value=saved.get("filenameTemplate") or "%(title)s [%(id)s]")
    tmpl_entry = tk.Entry(
        extra,
        textvariable=tmpl_var,
        width=28,
        bg=G["input"],
        fg=G["text"],
        insertbackground=G["accent"],
        relief="flat",
        highlightthickness=1,
        highlightbackground=G["input_edge"],
        highlightcolor=G["accent"],
        font=font_ui,
    )
    tmpl_entry.grid(row=1, column=0, sticky="w", pady=(4, 0), ipady=5)
    ttk.Label(extra, text="PLAYLIST LIMIT (0=all)", style="GlassMuted.TLabel").grid(
        row=0, column=1, sticky="w", padx=(16, 0)
    )
    plimit_var = tk.StringVar(value=str(saved.get("playlistLimit") or "0"))
    plimit_entry = tk.Entry(
        extra,
        textvariable=plimit_var,
        width=8,
        bg=G["input"],
        fg=G["text"],
        insertbackground=G["accent"],
        relief="flat",
        highlightthickness=1,
        highlightbackground=G["input_edge"],
        highlightcolor=G["accent"],
        font=font_ui,
    )
    plimit_entry.grid(row=1, column=1, sticky="w", padx=(16, 0), pady=(4, 0), ipady=5)
    ttk.Label(extra, text="AUDIO FORMAT", style="GlassMuted.TLabel").grid(
        row=0, column=2, sticky="w", padx=(16, 0)
    )
    fmt_var = tk.StringVar(value=saved.get("audioFormat") or "mp3")
    fmt_menu = dark_menu(extra, fmt_var, "mp3", "m4a", "wav", "flac", "opus", width=6)
    fmt_menu.grid(row=1, column=2, sticky="w", padx=(16, 0), pady=(4, 0))
    subs_var = tk.BooleanVar(value=bool(saved.get("writeSubs")))
    thumb_var = tk.BooleanVar(value=bool(saved.get("writeThumbnail")))
    ttk.Checkbutton(
        extra, text="Subtitles (EN)", variable=subs_var, style="Dark.TCheckbutton"
    ).grid(row=1, column=3, sticky="w", padx=(16, 0), pady=(4, 0))
    ttk.Checkbutton(
        extra, text="Thumbnail", variable=thumb_var, style="Dark.TCheckbutton"
    ).grid(row=1, column=4, sticky="w", padx=(12, 0), pady=(4, 0))

    bitrate_var.set(saved.get("bitrate") or "128")
    quality_var.set(saved.get("quality") or "720")

    def pick_folder() -> None:
        path = filedialog.askdirectory(initialdir=out_var.get() or str(DEFAULT_OUT))
        if path:
            out_var.set(path)

    browse_btn = ttk.Button(opts, text="Browse", style="Ghost.TButton", command=pick_folder)

    def persist_settings() -> None:
        settings_store.save_settings(
            {
                "mode": mode_var.get(),
                "bitrate": bitrate_var.get(),
                "quality": quality_var.get(),
                "outDir": out_var.get(),
                "filenameTemplate": tmpl_var.get(),
                "playlistLimit": plimit_var.get(),
                "audioFormat": fmt_var.get(),
                "writeSubs": bool(subs_var.get()),
                "writeThumbnail": bool(thumb_var.get()),
            }
        )

    def layout_options() -> None:
        for child in opts.grid_slaves():
            child.grid_forget()
        is_video = mode_var.get() == "video"
        col = 0
        if is_video:
            quality_label.grid(row=0, column=col, sticky="w")
            quality_menu.grid(row=1, column=col, sticky="w", pady=(4, 0))
            col += 1
        bitrate_label.configure(text="AUDIO BITRATE" if is_video else "BITRATE")
        bitrate_label.grid(row=0, column=col, sticky="w", padx=(20 if col else 0, 0))
        bitrate_menu.grid(
            row=1, column=col, sticky="w", padx=(20 if col else 0, 0), pady=(4, 0)
        )
        col += 1
        folder_label.grid(row=0, column=col, sticky="w", padx=(20, 0))
        out_entry.grid(
            row=1, column=col, sticky="we", padx=(20, 8), pady=(4, 0), ipady=6
        )
        opts.columnconfigure(col, weight=1)
        browse_btn.grid(row=1, column=col + 1, sticky="e", pady=(4, 0))

    def set_mode(mode: str) -> None:
        mode_var.set(mode)
        try:
            if mode_seg.get() != mode:
                mode_seg.select(mode, fire=False)
        except Exception:
            pass
        layout_options()
        if mode == "video":
            download_btn.configure(text="Download Video")
        else:
            download_btn.configure(text="Download MP3")
        persist_settings()

    # Progress + primary actions (secondary live in menu bar)
    _, prog = make_card(footer, fill="x", pady=(10, 10))
    section_label(prog, "Progress", "Jobs stay on your PC")
    prog_top = ttk.Frame(prog, style="Glass.TFrame")
    prog_top.pack(fill="x", pady=(8, 0))
    detail_var = tk.StringVar(value="Ready — paste a link to begin")
    pct_var = tk.StringVar(value="0%")
    ttk.Label(prog_top, textvariable=detail_var, style="GlassMuted.TLabel").pack(side="left")
    ttk.Label(prog_top, textvariable=pct_var, style="GlassPct.TLabel").pack(side="right")

    progress = ttk.Progressbar(
        prog,
        style="Glass.Horizontal.TProgressbar",
        mode="determinate",
        maximum=100,
        value=0,
    )
    progress.pack(fill="x", pady=(10, 0))

    song_var = tk.StringVar(value="")
    song_lbl = ttk.Label(prog, textvariable=song_var, style="Glass.TLabel")
    song_lbl.pack(anchor="w", pady=(8, 0))

    # Actions
    btns = tk.Frame(footer, bg=G["bg_deep"])
    btns.pack(fill="x", pady=(4, 0))

    busy = {"on": False}
    cancel_flag = {"on": False}
    last_file = {"path": None}
    licensed = {"ok": False}

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
        def apply() -> None:
            status_var.set(msg)
            color = COLORS["ok"]
            if "required" in msg.lower() or "fail" in msg.lower():
                color = COLORS["danger"]
            elif "offline" in msg.lower():
                color = COLORS["warn"]
            status_lbl.configure(fg=color)

        root.after(0, apply)

    def set_busy(on: bool) -> None:
        busy["on"] = on
        state = "disabled" if on else "normal"
        root.after(0, lambda: download_btn.configure(state=state if licensed["ok"] else "disabled"))
        root.after(0, lambda: clear_btn.configure(state=state))
        root.after(0, lambda: music_btn.configure(state=state))
        root.after(0, lambda: video_btn.configure(state=state))
        root.after(0, lambda: cancel_btn.configure(state="normal" if on else "disabled"))

    def parse_urls() -> list[str]:
        raw = url_text.get("1.0", "end")
        urls: list[str] = []
        seen: set[str] = set()
        for line in raw.splitlines():
            u = normalize_url(line)
            if u and u not in seen:
                seen.add(u)
                urls.append(u)
            elif "list=" in line.lower() or "/playlist" in line.lower():
                text = line.strip()
                if text and not text.startswith("http"):
                    text = "https://" + text
                if text and text not in seen:
                    seen.add(text)
                    urls.append(text)
        return urls

    def make_hook(index: int, total: int, url: str, mode: str):
        label = "Video" if mode == "video" else "Song"
        converting = "merging video…" if mode == "video" else "converting to MP3…"

        def hook(d: dict) -> None:
            if cancel_flag["on"] and _tubetone is not None:
                raise _tubetone.DownloadCancelled("Cancelled by user")
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
                    f"{label} {index}/{total} · {file_pct:.0f}% · {speed_s}{eta_s}",
                    url,
                )
            elif status == "finished":
                overall = index / total * 100
                set_progress(overall, f"{label} {index}/{total} · {converting}", url)

        return hook

    def do_download() -> None:
        if busy["on"]:
            return
        if not licensed["ok"]:
            messagebox.showwarning("License required", "Activate a valid subscription first.")
            show_license_dialog()
            return
        urls = parse_urls()
        if not urls:
            messagebox.showwarning("No URL", "Paste at least one valid YouTube link or playlist.")
            return
        mode = mode_var.get()
        try:
            bitrate = int(bitrate_var.get())
        except ValueError:
            bitrate = 128
        quality = quality_var.get().strip() or "720"
        out_dir = Path(out_var.get().strip() or str(DEFAULT_OUT))
        tmpl = tmpl_var.get().strip() or "%(title)s [%(id)s]"
        audio_format = fmt_var.get().strip() or "mp3"
        write_subs = bool(subs_var.get())
        write_thumbnail = bool(thumb_var.get())
        try:
            plimit = int(plimit_var.get() or "0")
        except ValueError:
            plimit = 0
        item = "video" if mode == "video" else audio_format.upper()
        label = "Video" if mode == "video" else "Track"
        persist_settings()
        cancel_flag["on"] = False

        def worker() -> None:
            set_busy(True)
            ok = 0
            try:
                set_progress(0, "Expanding links / playlists…")
                expanded: list[str] = []
                for u in urls:
                    if cancel_flag["on"]:
                        break
                    try:
                        if _tubetone is not None and (
                            "list=" in u or "/playlist" in u
                        ):
                            expanded.extend(_tubetone.expand_playlist(u, limit=plimit))
                        else:
                            expanded.append(u)
                    except Exception:
                        expanded.append(u)
                # de-dupe
                seen: set[str] = set()
                final_urls: list[str] = []
                for u in expanded:
                    if u not in seen:
                        seen.add(u)
                        final_urls.append(u)

                set_progress(0, f"Queue: {len(final_urls)} item(s)")
                for i, url in enumerate(final_urls, 1):
                    if cancel_flag["on"]:
                        set_progress(i / max(len(final_urls), 1) * 100, "Cancelled")
                        break
                    set_progress(
                        (i - 1) / len(final_urls) * 100,
                        f"{label} {i}/{len(final_urls)} · starting…",
                        url,
                    )
                    try:
                        dest = download_one(
                            url,
                            bitrate,
                            out_dir,
                            progress_hooks=[make_hook(i, len(final_urls), url, mode)],
                            mode=mode,
                            quality=quality,
                            filename_template=tmpl,
                            audio_format=audio_format,
                            write_subs=write_subs,
                            write_thumbnail=write_thumbnail,
                        )
                        ok += 1
                        last_file["path"] = str(dest)
                        settings_store.add_history(
                            {
                                "title": dest.stem,
                                "path": str(dest),
                                "mode": mode,
                                "url": url,
                            }
                        )
                        set_progress(
                            i / len(final_urls) * 100, f"Saved {dest.name}", dest.name
                        )
                    except Exception as exc:
                        if _tubetone and isinstance(exc, _tubetone.DownloadCancelled):
                            set_progress(
                                i / len(final_urls) * 100, "Cancelled by user", url
                            )
                            break
                        write_log(traceback.format_exc())
                        set_progress(
                            i / len(final_urls) * 100,
                            f"Failed ({i}/{len(final_urls)}): {exc}",
                            url,
                        )
                final_pct = 100.0 if ok else (ok / max(len(final_urls), 1) * 100)
                set_progress(final_pct, f"Done — {ok}/{len(final_urls)} saved")
                if ok:
                    try:
                        root.bell()
                    except Exception:
                        pass
                    root.after(
                        0,
                        lambda: messagebox.showinfo(
                            "YTMP",
                            f"Downloaded {ok}/{len(final_urls)} {item}(s)\n\n{out_dir}",
                        ),
                    )
            finally:
                set_busy(False)

        threading.Thread(target=worker, daemon=True).start()

    def cancel_download() -> None:
        cancel_flag["on"] = True
        set_progress(progress["value"], "Cancelling…")

    def open_out() -> None:
        path = Path(out_var.get().strip() or str(DEFAULT_OUT))
        path.mkdir(parents=True, exist_ok=True)
        subprocess.Popen(["explorer", str(path)])

    def open_last() -> None:
        p = last_file["path"]
        if not p:
            hist = settings_store.load_history(1)
            p = hist[0]["path"] if hist else None
        if not p or not Path(p).is_file():
            messagebox.showinfo("Open file", "No downloaded file yet.")
            return
        subprocess.Popen(["explorer", "/select,", str(Path(p))])

    def play_last() -> None:
        p = last_file["path"]
        if not p:
            hist = settings_store.load_history(1)
            p = hist[0]["path"] if hist else None
        if not p or not Path(p).is_file():
            messagebox.showinfo("Play", "No media file to play yet.")
            return
        try:
            os.startfile(p)  # type: ignore[attr-defined]
        except Exception as exc:
            messagebox.showerror("Play failed", str(exc))

    def open_data_folder() -> None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        subprocess.Popen(["explorer", str(DATA_DIR)])

    def export_history_csv() -> None:
        hist = settings_store.load_history(500)
        if not hist:
            messagebox.showinfo("Export", "History is empty.")
            return
        path = filedialog.asksaveasfilename(
            title="Export history",
            defaultextension=".csv",
            filetypes=[("CSV", "*.csv")],
            initialfile="ytmp-history.csv",
        )
        if not path:
            return
        lines = ["mode,title,path,url"]
        for h in hist:
            title = str(h.get("title") or "").replace('"', "'")
            pth = str(h.get("path") or "").replace('"', "'")
            url = str(h.get("url") or "").replace('"', "'")
            lines.append(f'"{h.get("mode","")}","{title}","{pth}","{url}"')
        Path(path).write_text("\n".join(lines), encoding="utf-8")
        messagebox.showinfo("Export", f"Saved {len(hist)} rows to\n{path}")

    def export_playlist_m3u() -> None:
        hist = settings_store.load_history(200)
        files = [Path(h["path"]) for h in hist if h.get("path") and Path(h["path"]).is_file()]
        if not files:
            messagebox.showinfo("Playlist", "No existing files in history to export.")
            return
        path = filedialog.asksaveasfilename(
            title="Export M3U playlist",
            defaultextension=".m3u",
            filetypes=[("M3U playlist", "*.m3u")],
            initialfile="ytmp-playlist.m3u",
        )
        if not path:
            return
        media_tools.export_m3u(Path(path), files)
        messagebox.showinfo("Playlist", f"Saved playlist with {len(files)} tracks.")

    def show_about() -> None:
        messagebox.showinfo(
            "About YTMP",
            "YTMP — local media toolkit\n\n"
            "Download · Convert · Trim · Compress · GIF · Normalize\n"
            "Merge · Split · Remux · Fade · Mono · Mute video\n\n"
            f"Data: {DATA_DIR}\n"
            f"Default downloads: {DEFAULT_OUT}",
        )

    def show_history() -> None:
        win = tk.Toplevel(root)
        win.title("Download history")
        win.configure(bg=COLORS["bg"])
        win.geometry("560x420")
        top = ttk.Frame(win)
        top.pack(fill="x", padx=12, pady=12)
        q_var = tk.StringVar()
        ttk.Entry(top, textvariable=q_var, width=32).pack(side="left")
        lb = tk.Listbox(
            win,
            bg=G["input"],
            fg=G["text"],
            selectbackground=COLORS["accent"],
            selectforeground="#042f2e",
            font=("Segoe UI", 10),
        )
        lb.pack(fill="both", expand=True, padx=12, pady=(0, 8))
        items_box: list[dict] = []

        def refresh() -> None:
            nonlocal items_box
            items_box = settings_store.search_history(q_var.get())
            lb.delete(0, "end")
            for h in items_box:
                lb.insert("end", f"{h.get('mode','?')} · {h.get('title') or h.get('path')}")

        def reopen() -> None:
            sel = lb.curselection()
            if not sel:
                return
            path = items_box[sel[0]].get("path")
            if path and Path(path).is_file():
                subprocess.Popen(["explorer", "/select,", str(Path(path))])

        def copy_path() -> None:
            sel = lb.curselection()
            if not sel:
                return
            path = items_box[sel[0]].get("path") or ""
            if path:
                root.clipboard_clear()
                root.clipboard_append(path)
                messagebox.showinfo("Copied", path)

        def do_clear() -> None:
            if messagebox.askyesno("Clear history", "Delete all download history?"):
                settings_store.clear_history()
                refresh()

        ttk.Button(top, text="Search", style="Ghost.TButton", command=refresh).pack(
            side="left", padx=6
        )
        ttk.Button(top, text="Clear all", style="Ghost.TButton", command=do_clear).pack(side="right")
        btns_h = ttk.Frame(win)
        btns_h.pack(fill="x", padx=12, pady=(0, 12))
        ttk.Button(btns_h, text="Show in folder", style="Ghost.TButton", command=reopen).pack(
            side="left", padx=(0, 6)
        )
        ttk.Button(btns_h, text="Copy path", style="Ghost.TButton", command=copy_path).pack(
            side="left"
        )
        refresh()

    def clear_urls() -> None:
        url_text.delete("1.0", "end")
        set_progress(0, "Waiting for a download…")
        song_var.set("")

    def update_engine() -> None:
        def worker() -> None:
            try:
                from ytdlp_updater import update_ytdlp

                set_progress(10, "Updating yt-dlp…")
                update_ytdlp(progress_cb=lambda m: set_progress(40, m))
                set_progress(0, "yt-dlp updated — restart app to fully reload")
                root.after(
                    0,
                    lambda: messagebox.showinfo(
                        "Update", "yt-dlp updated. Restart YTMP to use it."
                    ),
                )
            except Exception as exc:
                root.after(0, lambda: messagebox.showerror("Update failed", str(exc)))

        threading.Thread(target=worker, daemon=True).start()

    def license_status_label(state: dict) -> str:
        if not state.get("valid"):
            return "● License required"
        ends = state.get("endsAt")
        days = ""
        if ends:
            try:
                from datetime import datetime, timezone

                end_dt = datetime.fromisoformat(str(ends).replace("Z", "+00:00"))
                left = (end_dt - datetime.now(timezone.utc)).days
                days = f" · {max(left, 0)}d left"
            except Exception:
                days = ""
        plan = state.get("plan") or ""
        offline = " (offline)" if state.get("offline") else ""
        return f"● Licensed{offline} · {plan}{days}".strip(" ·")

    def copy_last_path() -> None:
        p = last_file["path"]
        if not p:
            hist = settings_store.load_history(1)
            p = hist[0]["path"] if hist else None
        if not p:
            messagebox.showinfo("Copy path", "No downloaded file yet.")
            return
        root.clipboard_clear()
        root.clipboard_append(p)
        messagebox.showinfo("Copied", p)

    def manage_account() -> None:
        cfg = license_client.load_config()
        url = f"{cfg.get('websiteUrl', 'http://127.0.0.1:3000').rstrip('/')}/account"
        try:
            os.startfile(url)  # type: ignore[attr-defined]
        except Exception:
            messagebox.showinfo("Account", url)

    def show_license_dialog(force: bool = False) -> None:
        win = tk.Toplevel(root)
        win.title("Activate YTMP")
        win.configure(bg=COLORS["bg"])
        win.geometry("440x280")
        win.transient(root)
        if force:
            win.grab_set()
        pad = ttk.Frame(win, padding=20)
        pad.pack(fill="both", expand=True)
        ttk.Label(pad, text="Activate license", style="BrandMark.TLabel").pack(anchor="w")
        ttk.Label(pad, text="Paste your YM-XXXX-XXXX-XXXX key", style="Sub.TLabel").pack(
            anchor="w", pady=(4, 12)
        )
        key_var = tk.StringVar()
        ent = tk.Entry(
            pad,
            textvariable=key_var,
            bg=G["input"],
            fg=G["text"],
            insertbackground=G["accent"],
            relief="flat",
            highlightthickness=1,
            highlightbackground=G["input_edge"],
            highlightcolor=G["accent"],
            font=("Segoe UI", 13),
        )
        ent.pack(fill="x", ipady=10)
        msg = tk.StringVar(value="")
        ttk.Label(pad, textvariable=msg, style="Sub.TLabel").pack(anchor="w", pady=10)

        def do_activate() -> None:
            try:
                license_client.activate(key_var.get())
                licensed["ok"] = True
                set_status("● Licensed")
                download_btn.configure(state="normal")
                win.destroy()
                messagebox.showinfo("YTMP", "License activated.")
            except Exception as exc:
                msg.set(str(exc))

        actions = ttk.Frame(pad)
        actions.pack(fill="x", pady=(8, 0))
        ttk.Button(actions, text="Activate", style="Accent.TButton", command=do_activate).pack(
            side="left", padx=(0, 8)
        )
        ttk.Button(actions, text="Manage account", style="Ghost.TButton", command=manage_account).pack(
            side="left"
        )

    download_btn = GlassButton(btns, text="Download MP3", command=do_download, primary=True)
    download_btn.pack(side="left", padx=(0, 10))
    cancel_btn = GlassButton(btns, text="Cancel", command=cancel_download)
    cancel_btn.pack(side="left", padx=(0, 8))
    cancel_btn.configure(state="disabled")
    clear_btn = GlassButton(btns, text="Clear", command=clear_urls)
    clear_btn.pack(side="left", padx=(0, 8))
    GlassButton(btns, text="Open folder", command=open_out).pack(side="left", padx=(0, 8))
    GlassButton(btns, text="Play last", command=play_last).pack(side="left")

    # Compact menubar instead of a second cluttered button row
    menubar = tk.Menu(root, tearoff=0, bg=COLORS["panel"], fg=G["text"], activebackground=COLORS["accent"], activeforeground=COLORS["on_accent"], font=font_ui)
    m_file = tk.Menu(menubar, tearoff=0, bg=COLORS["panel"], fg=G["text"], activebackground=COLORS["accent"], activeforeground=COLORS["on_accent"])
    m_file.add_command(label="Open last file", command=open_last)
    m_file.add_command(label="Copy last path", command=copy_last_path)
    m_file.add_separator()
    m_file.add_command(label="Export history (CSV)", command=export_history_csv)
    m_file.add_command(label="Export playlist (M3U)", command=export_playlist_m3u)
    m_file.add_separator()
    m_file.add_command(label="Exit", command=root.destroy)
    menubar.add_cascade(label="File", menu=m_file)

    m_tools = tk.Menu(menubar, tearoff=0, bg=COLORS["panel"], fg=G["text"], activebackground=COLORS["accent"], activeforeground=COLORS["on_accent"])
    m_tools.add_command(label="History…", command=show_history)
    m_tools.add_command(label="Update yt-dlp", command=update_engine)
    m_tools.add_command(label="Open data folder", command=open_data_folder)
    menubar.add_cascade(label="Tools", menu=m_tools)

    m_help = tk.Menu(menubar, tearoff=0, bg=COLORS["panel"], fg=G["text"], activebackground=COLORS["accent"], activeforeground=COLORS["on_accent"])
    m_help.add_command(label="Activate license…", command=show_license_dialog)
    m_help.add_command(label="Account", command=manage_account)
    m_help.add_separator()
    m_help.add_command(label="About YTMP", command=show_about)
    menubar.add_cascade(label="Help", menu=m_help)
    root.config(menu=menubar)

    engine_state: dict = {"ffmpeg": None}

    # ----- Convert tab -----
    conv_host = ttk.Frame(convert_tab)
    conv_host.pack(fill="both", expand=True, padx=4, pady=4)
    _, conv_inner = make_card(conv_host, fill="both", expand=True)
    section_label(
        conv_inner,
        "Convert a file",
        "Turn local audio/video into MP3, WAV, FLAC, M4A, Opus, or MP4 — nothing uploads",
        step="1",
    )
    conv_file = tk.StringVar()
    conv_row = ttk.Frame(conv_inner, style="Glass.TFrame")
    conv_row.pack(fill="x", pady=(14, 0))
    conv_entry = ttk.Entry(conv_row, textvariable=conv_file)
    conv_entry.pack(side="left", fill="x", expand=True, padx=(0, 8))
    conv_fmt = tk.StringVar(value="mp3")
    conv_br = tk.StringVar(value="192")

    def pick_conv() -> None:
        p = filedialog.askopenfilename(
            title="Choose media file",
            filetypes=[
                ("Media", "*.mp4;*.mkv;*.webm;*.mov;*.avi;*.mp3;*.m4a;*.wav;*.flac;*.opus;*.aac"),
                ("All", "*.*"),
            ],
        )
        if p:
            conv_file.set(p)

    ttk.Button(conv_row, text="Browse", style="Ghost.TButton", command=pick_conv).pack(side="left")

    rowc = ttk.Frame(conv_inner, style="Glass.TFrame")
    rowc.pack(anchor="w", pady=14)
    ttk.Label(rowc, text="Format", style="GlassMuted.TLabel").pack(side="left")
    dark_menu(rowc, conv_fmt, "mp3", "m4a", "wav", "flac", "opus", "mp4", width=6).pack(
        side="left", padx=(8, 16)
    )
    ttk.Label(rowc, text="Bitrate", style="GlassMuted.TLabel").pack(side="left")
    dark_menu(rowc, conv_br, "64", "128", "192", "256", "320", width=6).pack(side="left", padx=8)

    def run_convert() -> None:
        if not licensed["ok"]:
            messagebox.showwarning("License", "Activate a license first.")
            return
        src = Path(conv_file.get())
        if not src.is_file():
            messagebox.showwarning("Convert", "Choose a valid file.")
            return
        out_dir = Path(out_var.get().strip() or str(DEFAULT_OUT))

        def worker() -> None:
            set_busy(True)
            cancel_flag["on"] = False
            try:
                set_progress(10, f"Converting → {conv_fmt.get()}…")
                dest = media_tools.convert_file(
                    engine_state["ffmpeg"],
                    src,
                    out_dir,
                    conv_fmt.get(),
                    conv_br.get(),
                    cancel_flag,
                )
                last_file["path"] = str(dest)
                settings_store.add_history(
                    {"title": dest.name, "path": str(dest), "mode": "convert", "url": ""}
                )
                set_progress(100, f"Saved {dest.name}")
                root.after(0, lambda: messagebox.showinfo("Convert", f"Saved:\n{dest}"))
            except Exception as exc:
                set_progress(0, str(exc))
                root.after(0, lambda: messagebox.showerror("Convert failed", str(exc)))
            finally:
                set_busy(False)

        threading.Thread(target=worker, daemon=True).start()

    conv_actions = ttk.Frame(conv_inner, style="Glass.TFrame")
    conv_actions.pack(anchor="w", pady=(4, 0))
    ttk.Button(conv_actions, text="Convert file", style="Accent.TButton", command=run_convert).pack(
        side="left", padx=(0, 8)
    )

    def run_batch_convert() -> None:
        if not licensed["ok"]:
            messagebox.showwarning("License", "Activate a license first.")
            return
        folder = filedialog.askdirectory(title="Choose folder of media files")
        if not folder:
            return
        out_dir = Path(out_var.get().strip() or str(DEFAULT_OUT))

        def worker() -> None:
            set_busy(True)
            cancel_flag["on"] = False
            try:
                set_progress(10, "Batch converting…")
                results = media_tools.batch_convert_folder(
                    engine_state["ffmpeg"],
                    Path(folder),
                    out_dir,
                    conv_fmt.get(),
                    conv_br.get(),
                    cancel_flag,
                )
                for dest in results:
                    settings_store.add_history(
                        {"title": dest.name, "path": str(dest), "mode": "batch", "url": ""}
                    )
                last_file["path"] = str(results[-1])
                set_progress(100, f"Converted {len(results)} file(s)")
                root.after(
                    0,
                    lambda: messagebox.showinfo(
                        "Batch convert", f"Converted {len(results)} file(s) to {out_dir}"
                    ),
                )
            except Exception as exc:
                set_progress(0, str(exc))
                root.after(0, lambda: messagebox.showerror("Batch failed", str(exc)))
            finally:
                set_busy(False)

        threading.Thread(target=worker, daemon=True).start()

    ttk.Button(
        conv_actions, text="Batch folder…", style="Ghost.TButton", command=run_batch_convert
    ).pack(side="left")

    # ----- Tools tab -----
    tools_host = ttk.Frame(tools_tab)
    tools_host.pack(fill="both", expand=True, padx=4, pady=4)
    _, tools_inner = make_card(tools_host, fill="both", expand=True)
    section_label(tools_inner, "Pick a media file", "Local file only — tools run with ffmpeg on your machine", step="1")

    tool_file = tk.StringVar()
    tool_row = ttk.Frame(tools_inner, style="Glass.TFrame")
    tool_row.pack(fill="x", pady=(14, 0))
    ttk.Entry(tool_row, textvariable=tool_file).pack(side="left", fill="x", expand=True, padx=(0, 8))

    def pick_tool() -> None:
        p = filedialog.askopenfilename(title="Choose media file")
        if p:
            tool_file.set(p)

    ttk.Button(tool_row, text="Browse", style="Ghost.TButton", command=pick_tool).pack(side="left")

    tool_start = tk.StringVar(value="00:00:00")
    tool_end = tk.StringVar(value="00:00:30")
    tool_speed = tk.StringVar(value="1.25")
    tool_crf = tk.StringVar(value="28")
    tool_vol = tk.StringVar(value="3")
    tool_rot = tk.StringVar(value="90")
    tool_chunk = tk.StringVar(value="60")
    tool_remux = tk.StringVar(value="mp4")

    _, grid_card = make_card(tools_host, fill="x", pady=(10, 0))
    section_label(grid_card, "Adjust parameters", "Only fill what the tool needs (e.g. Start/End for Trim)", step="2")
    grid = ttk.Frame(grid_card, style="Glass.TFrame")
    grid.pack(anchor="w", pady=(10, 0))

    def _param(row: int, col: int, label: str, var: tk.StringVar, width: int = 12) -> None:
        ttk.Label(grid, text=label, style="GlassMuted.TLabel").grid(
            row=row * 2, column=col, sticky="w", padx=(0 if col == 0 else 14, 0)
        )
        e = ttk.Entry(grid, textvariable=var, width=width)
        e.grid(row=row * 2 + 1, column=col, sticky="w", padx=(0 if col == 0 else 14, 0), pady=(2, 8))

    _param(0, 0, "Start", tool_start)
    _param(0, 1, "End", tool_end)
    _param(0, 2, "Speed", tool_speed)
    _param(0, 3, "CRF", tool_crf)
    _param(1, 0, "Volume dB", tool_vol)
    _param(1, 1, "Rotate°", tool_rot)
    _param(1, 2, "Chunk sec", tool_chunk)
    _param(1, 3, "Remux to", tool_remux)

    def tool_src() -> Path:
        p = Path(tool_file.get())
        if not p.is_file():
            raise ValueError("Choose a valid media file")
        return p

    def run_tool(kind: str) -> None:
        if not licensed["ok"]:
            messagebox.showwarning("License", "Activate a license first.")
            return

        def worker() -> None:
            set_busy(True)
            cancel_flag["on"] = False
            try:
                src = tool_src()
                out_dir = Path(out_var.get().strip() or str(DEFAULT_OUT))
                ff = engine_state["ffmpeg"]
                set_progress(15, f"Running {kind}…")
                if kind == "trim":
                    dest = media_tools.trim_media(
                        ff, src, out_dir, tool_start.get(), tool_end.get() or None, cancel_flag
                    )
                elif kind == "extract":
                    dest = media_tools.extract_audio(ff, src, out_dir, "mp3", "192", cancel_flag)
                elif kind == "compress":
                    dest = media_tools.compress_video(
                        ff, src, out_dir, tool_crf.get(), cancel_flag
                    )
                elif kind == "gif":
                    dest = media_tools.make_gif(
                        ff, src, out_dir, tool_start.get(), "5", "12", "480", cancel_flag
                    )
                elif kind == "normalize":
                    dest = media_tools.normalize_audio(ff, src, out_dir, cancel_flag)
                elif kind == "speed":
                    dest = media_tools.change_speed(
                        ff, src, out_dir, float(tool_speed.get()), cancel_flag
                    )
                elif kind == "frame":
                    dest = media_tools.extract_frame(
                        ff, src, out_dir, tool_start.get(), cancel_flag
                    )
                elif kind == "volume":
                    dest = media_tools.adjust_volume(
                        ff, src, out_dir, float(tool_vol.get()), cancel_flag
                    )
                elif kind == "rotate":
                    dest = media_tools.rotate_video(
                        ff, src, out_dir, int(tool_rot.get()), cancel_flag
                    )
                elif kind == "reverse":
                    dest = media_tools.reverse_media(ff, src, out_dir, cancel_flag)
                elif kind == "fade":
                    dest = media_tools.fade_audio(ff, src, out_dir, 1.0, 2.0, cancel_flag)
                elif kind == "mono":
                    dest = media_tools.to_mono(ff, src, out_dir, cancel_flag)
                elif kind == "mute":
                    dest = media_tools.strip_audio(ff, src, out_dir, cancel_flag)
                elif kind == "remux":
                    dest = media_tools.remux(
                        ff, src, out_dir, tool_remux.get().strip() or "mp4", cancel_flag
                    )
                elif kind == "split":
                    parts = media_tools.split_chunks(
                        ff, src, out_dir, int(tool_chunk.get() or "60"), cancel_flag
                    )
                    last_file["path"] = str(parts[-1])
                    for dest in parts:
                        settings_store.add_history(
                            {"title": dest.name, "path": str(dest), "mode": "split", "url": ""}
                        )
                    set_progress(100, f"Split into {len(parts)} part(s)")
                    root.after(
                        0,
                        lambda: messagebox.showinfo(
                            "Split", f"Created {len(parts)} part(s) in\n{out_dir}"
                        ),
                    )
                    return
                elif kind == "info":
                    info = media_tools.probe_media(ff, src)
                    set_progress(100, "Media info ready")
                    root.after(
                        0,
                        lambda: messagebox.showinfo(
                            "Media info", json.dumps(info, indent=2)[:1800]
                        ),
                    )
                    return
                else:
                    raise ValueError(kind)
                last_file["path"] = str(dest)
                settings_store.add_history(
                    {"title": dest.name, "path": str(dest), "mode": kind, "url": ""}
                )
                set_progress(100, f"Saved {dest.name}")
                root.after(0, lambda: messagebox.showinfo("Tools", f"Saved:\n{dest}"))
            except Exception as exc:
                write_log(traceback.format_exc())
                set_progress(0, str(exc))
                root.after(0, lambda: messagebox.showerror("Tool failed", str(exc)))
            finally:
                set_busy(False)

        threading.Thread(target=worker, daemon=True).start()

    _, tools_actions_card = make_card(tools_host, fill="both", expand=True, pady=(10, 0))
    section_label(tools_actions_card, "Run a tool", "One click starts a job — use Cancel below if needed", step="3")
    tool_btns = ttk.Frame(tools_actions_card, style="Glass.TFrame")
    tool_btns.pack(anchor="w", fill="x", pady=(10, 0))
    rows = [ttk.Frame(tool_btns, style="Glass.TFrame") for _ in range(3)]
    for r in rows:
        r.pack(anchor="w", pady=3, fill="x")
    pairs = [
        ("Trim", "trim"),
        ("Extract audio", "extract"),
        ("Compress", "compress"),
        ("Make GIF", "gif"),
        ("Normalize", "normalize"),
        ("Speed", "speed"),
        ("Snapshot", "frame"),
        ("Volume", "volume"),
        ("Rotate", "rotate"),
        ("Reverse", "reverse"),
        ("Fade in/out", "fade"),
        ("To mono", "mono"),
        ("Mute video", "mute"),
        ("Remux", "remux"),
        ("Split chunks", "split"),
        ("Media info", "info"),
    ]
    for i, (label, kind) in enumerate(pairs):
        parent = rows[min(i // 6, len(rows) - 1)]
        ttk.Button(
            parent, text=label, style="Tool.TButton", command=lambda k=kind: run_tool(k)
        ).pack(side="left", padx=(0, 6), pady=2)

    # Merge audio
    merge_files: list[Path] = []

    def add_merge() -> None:
        paths = filedialog.askopenfilenames(title="Add audio files to merge")
        for p in paths:
            merge_files.append(Path(p))
        merge_lbl.set(f"{len(merge_files)} file(s) queued")

    def run_merge() -> None:
        if not licensed["ok"]:
            messagebox.showwarning("License", "Activate a license first.")
            return
        if len(merge_files) < 2:
            messagebox.showwarning("Merge", "Add at least 2 audio files.")
            return

        def worker() -> None:
            set_busy(True)
            try:
                set_progress(20, "Merging audio…")
                dest = media_tools.merge_audio(
                    engine_state["ffmpeg"],
                    list(merge_files),
                    Path(out_var.get().strip() or str(DEFAULT_OUT)),
                    cancel_flag,
                )
                last_file["path"] = str(dest)
                set_progress(100, f"Saved {dest.name}")
                root.after(0, lambda: messagebox.showinfo("Merge", f"Saved:\n{dest}"))
            except Exception as exc:
                root.after(0, lambda: messagebox.showerror("Merge failed", str(exc)))
            finally:
                set_busy(False)

        threading.Thread(target=worker, daemon=True).start()

    merge_bar = ttk.Frame(tools_actions_card, style="Glass.TFrame")
    merge_bar.pack(fill="x", pady=(16, 0))
    ttk.Label(merge_bar, text="MERGE AUDIO", style="Section.TLabel").pack(side="left")
    merge_lbl = tk.StringVar(value="0 queued")
    ttk.Label(merge_bar, textvariable=merge_lbl, style="GlassMuted.TLabel").pack(side="left", padx=12)
    ttk.Button(merge_bar, text="Add files", style="Soft.TButton", command=add_merge).pack(
        side="left", padx=(0, 6)
    )
    ttk.Button(merge_bar, text="Merge to MP3", style="Accent.TButton", command=run_merge).pack(
        side="left"
    )

    # ----- Library tab -----
    lib_host = ttk.Frame(library_tab)
    lib_host.pack(fill="both", expand=True, padx=4, pady=4)
    _, lib_inner = make_card(lib_host, fill="both", expand=True)
    section_label(lib_inner, "Library", "Search past downloads and exports")
    lib_q = tk.StringVar()
    lib_bar = ttk.Frame(lib_inner, style="Glass.TFrame")
    lib_bar.pack(fill="x", pady=(12, 8))
    ttk.Entry(lib_bar, textvariable=lib_q).pack(side="left", fill="x", expand=True)
    ttk.Button(lib_bar, text="Search", style="Ghost.TButton", command=lambda: refresh_lib()).pack(
        side="left", padx=6
    )
    ttk.Button(lib_bar, text="Open", style="Ghost.TButton", command=lambda: lib_open()).pack(
        side="left", padx=(0, 6)
    )
    ttk.Button(
        lib_bar,
        text="Clear",
        style="Soft.TButton",
        command=lambda: (settings_store.clear_history(), refresh_lib()),
    ).pack(side="left")

    lib_list = tk.Listbox(
        lib_inner,
        bg=G["input"],
        fg=G["text"],
        selectbackground=COLORS["accent"],
        selectforeground=COLORS["on_accent"],
        activestyle="none",
        relief="flat",
        highlightthickness=1,
        highlightbackground=G["input_edge"],
        highlightcolor=G["accent"],
        borderwidth=0,
        height=16,
        font=font_ui,
    )
    lib_list.pack(fill="both", expand=True, pady=(4, 0))
    lib_items: list[dict] = []

    def refresh_lib() -> None:
        nonlocal lib_items
        lib_items = settings_store.search_history(lib_q.get())
        lib_list.delete(0, "end")
        for h in lib_items:
            lib_list.insert(
                "end", f"  {h.get('mode', '?')}   ·   {h.get('title') or h.get('path')}"
            )

    def lib_open() -> None:
        sel = lib_list.curselection()
        if not sel:
            return
        path = lib_items[sel[0]].get("path")
        if path and Path(path).is_file():
            subprocess.Popen(["explorer", "/select,", str(Path(path))])

    refresh_lib()
    # tab change already bound earlier

    set_mode(saved.get("mode") or "music")

    def boot() -> None:
        try:
            set_progress(5, "Checking license…")
            state = license_client.heartbeat()
            if state.get("valid"):
                licensed["ok"] = True
                set_status(license_status_label(state))
            else:
                licensed["ok"] = False
                set_status("● License required")
                root.after(0, lambda: show_license_dialog(force=True))
                root.after(0, lambda: download_btn.configure(state="disabled"))

            set_progress(10, "Checking ffmpeg…")
            ffmpeg = ensure_ffmpeg(progress_cb=lambda m: set_progress(25, m))
            engine_state["ffmpeg"] = ffmpeg
            set_progress(50, "Loading engine…")
            load_engine(ffmpeg)
            latest = license_client.check_latest()
            if latest and latest.get("version") and latest["version"] != license_client.APP_VERSION:
                set_progress(0, f"Update available: {latest['version']}")
            else:
                set_progress(0, "Ready — paste a link and hit Download")
            if licensed["ok"]:
                set_status(status_var.get() if status_var.get().startswith("●") else "● Ready")
            DEFAULT_OUT.mkdir(parents=True, exist_ok=True)

            def heartbeat_loop() -> None:
                while True:
                    try:
                        st = license_client.heartbeat()
                        licensed["ok"] = bool(st.get("valid"))
                        if not licensed["ok"]:
                            root.after(0, lambda: download_btn.configure(state="disabled"))
                            root.after(0, lambda: set_status("● License invalid"))
                        else:
                            root.after(0, lambda s=st: set_status(license_status_label(s)))
                    except Exception:
                        pass
                    threading.Event().wait(20 * 60)

            threading.Thread(target=heartbeat_loop, daemon=True).start()
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
    write_log("--- YTMP standalone start ---")
    run_gui()


if __name__ == "__main__":
    main()
