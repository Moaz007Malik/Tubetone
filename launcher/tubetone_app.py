"""
TubeTone desktop launcher — sets up ffmpeg, runs the local companion server,
and helps install the Chrome extension.
"""

from __future__ import annotations

import os
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


def resource_dir() -> Path:
    """Where bundled files live (PyInstaller _MEIPASS or project root)."""
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS)
    return app_dir()


APP_DIR = app_dir()
DATA_DIR = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "TubeTone"
FFMPEG_DIR = DATA_DIR / "ffmpeg"
FFMPEG_BIN = FFMPEG_DIR / "bin"
EXTENSION_DIR = APP_DIR / "extension"
SERVER_HOST = "127.0.0.1"
SERVER_PORT = 8765

# gyan.dev essentials build (Windows)
FFMPEG_ZIP_URL = (
    "https://www.gyan.dev/ffmpeg/builds/packages/"
    "ffmpeg-8.0-essentials_build.zip"
)


def log_path() -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return DATA_DIR / "launcher.log"


def write_log(msg: str) -> None:
    try:
        with log_path().open("a", encoding="utf-8") as f:
            f.write(msg.rstrip() + "\n")
    except OSError:
        pass


# ---------------------------------------------------------------------------
# ffmpeg setup
# ---------------------------------------------------------------------------

def find_ffmpeg_bin() -> Path | None:
    env = os.environ.get("FFMPEG_LOCATION")
    if env:
        p = Path(env)
        if (p / "ffmpeg.exe").is_file():
            return p
        if p.name.lower() == "ffmpeg.exe" and p.is_file():
            return p.parent

    bundled = APP_DIR / "ffmpeg" / "bin"
    if (bundled / "ffmpeg.exe").is_file():
        return bundled

    if (FFMPEG_BIN / "ffmpeg.exe").is_file():
        return FFMPEG_BIN

    which = shutil.which("ffmpeg")
    if which:
        return Path(which).parent
    return None


def download_ffmpeg(progress_cb=None) -> Path:
    """Download portable ffmpeg into %LOCALAPPDATA%/TubeTone/ffmpeg."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = DATA_DIR / "ffmpeg.zip"
    extract_to = DATA_DIR / "ffmpeg_extract"

    def report(msg: str) -> None:
        write_log(msg)
        if progress_cb:
            progress_cb(msg)

    report("Downloading ffmpeg (one-time setup, ~80 MB)…")
    urllib.request.urlretrieve(FFMPEG_ZIP_URL, zip_path)  # noqa: S310

    report("Extracting ffmpeg…")
    if extract_to.exists():
        shutil.rmtree(extract_to, ignore_errors=True)
    extract_to.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_to)

    # Find bin/ffmpeg.exe inside extracted tree
    found = next(extract_to.rglob("ffmpeg.exe"), None)
    if not found:
        raise RuntimeError("ffmpeg.exe not found in downloaded archive")

    src_bin = found.parent
    if FFMPEG_DIR.exists():
        shutil.rmtree(FFMPEG_DIR, ignore_errors=True)
    FFMPEG_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copytree(src_bin, FFMPEG_BIN)

    zip_path.unlink(missing_ok=True)
    shutil.rmtree(extract_to, ignore_errors=True)
    report("ffmpeg installed.")
    return FFMPEG_BIN


def ensure_ffmpeg(progress_cb=None) -> Path:
    existing = find_ffmpeg_bin()
    if existing:
        return existing
    return download_ffmpeg(progress_cb)


# ---------------------------------------------------------------------------
# Server
# ---------------------------------------------------------------------------

_server = None
_server_thread = None


def prepare_server_env(ffmpeg_bin: Path) -> None:
    os.environ["FFMPEG_LOCATION"] = str(ffmpeg_bin)
    os.environ["HOST"] = SERVER_HOST
    os.environ["PORT"] = str(SERVER_PORT)
    # Prefer local binding for the desktop app
    os.environ.pop("RENDER", None)
    os.environ.pop("API_KEY", None)


def start_server(ffmpeg_bin: Path) -> None:
    global _server, _server_thread
    if _server_thread and _server_thread.is_alive():
        return

    prepare_server_env(ffmpeg_bin)

    candidates = []
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        meipass = Path(sys._MEIPASS)
        candidates.extend([meipass / "server", meipass])
    candidates.extend([APP_DIR / "server", resource_dir() / "server", APP_DIR])

    for server_path in candidates:
        if (server_path / "server.py").is_file():
            if str(server_path) not in sys.path:
                sys.path.insert(0, str(server_path))
            break
    else:
        raise RuntimeError("server.py not found — reinstall TubeTone")

    import server as tubetone_server  # type: ignore  # noqa: WPS433

    tubetone_server.HOST = SERVER_HOST
    tubetone_server.PORT = SERVER_PORT
    tubetone_server.FFMPEG_LOCATION = str(ffmpeg_bin)
    tubetone_server.API_KEY = ""
    # Refresh find after env
    if hasattr(tubetone_server, "find_ffmpeg"):
        found = tubetone_server.find_ffmpeg()
        if found:
            tubetone_server.FFMPEG_LOCATION = found

    from http.server import ThreadingHTTPServer

    _server = ThreadingHTTPServer(
        (SERVER_HOST, SERVER_PORT), tubetone_server.Handler
    )

    def run() -> None:
        write_log(f"Server listening on http://{SERVER_HOST}:{SERVER_PORT}")
        try:
            _server.serve_forever()
        except Exception:
            write_log(traceback.format_exc())

    _server_thread = threading.Thread(target=run, daemon=True)
    _server_thread.start()


def stop_server() -> None:
    global _server
    if _server:
        try:
            _server.shutdown()
        except Exception:
            pass
        _server = None


# ---------------------------------------------------------------------------
# GUI
# ---------------------------------------------------------------------------

def run_gui() -> None:
    import tkinter as tk
    from tkinter import messagebox, ttk

    root = tk.Tk()
    root.title("TubeTone")
    root.geometry("520x460")
    root.minsize(480, 420)
    root.configure(bg="#12141a")

    style = ttk.Style()
    try:
        style.theme_use("clam")
    except tk.TclError:
        pass
    style.configure("TFrame", background="#12141a")
    style.configure("TLabel", background="#12141a", foreground="#f0ece4", font=("Segoe UI", 10))
    style.configure("Title.TLabel", font=("Segoe UI", 18, "bold"), foreground="#e8a23a")
    style.configure("Status.TLabel", font=("Segoe UI", 11))
    style.configure("TButton", font=("Segoe UI", 10), padding=8)

    main = ttk.Frame(root, padding=20)
    main.pack(fill="both", expand=True)

    ttk.Label(main, text="TubeTone", style="Title.TLabel").pack(anchor="w")
    ttk.Label(
        main,
        text="YouTube → MP3 companion for the Chrome extension",
    ).pack(anchor="w", pady=(4, 16))

    status_var = tk.StringVar(value="Starting…")
    ffmpeg_var = tk.StringVar(value="ffmpeg: checking…")
    ext_var = tk.StringVar(
        value=f"Extension folder: {EXTENSION_DIR}"
        if EXTENSION_DIR.is_dir()
        else "Extension folder missing — keep it next to TubeTone.exe"
    )
    log_var = tk.StringVar(value="")

    ttk.Label(main, textvariable=status_var, style="Status.TLabel").pack(anchor="w")
    ttk.Label(main, textvariable=ffmpeg_var).pack(anchor="w", pady=(6, 0))
    ttk.Label(main, textvariable=ext_var, wraplength=460).pack(anchor="w", pady=(6, 12))

    steps = (
        "1. Leave this window open (server must keep running)\n"
        "2. Open Chrome → chrome://extensions\n"
        "3. Enable Developer mode → Load unpacked\n"
        "4. Select the extension folder (button below)\n"
        "5. Open YouTube → click the TubeTone icon → Download"
    )
    ttk.Label(main, text=steps, justify="left").pack(anchor="w", pady=(0, 14))

    btn_row = ttk.Frame(main)
    btn_row.pack(fill="x", pady=(0, 8))

    def open_extensions_page() -> None:
        root.clipboard_clear()
        root.clipboard_append("chrome://extensions")
        messagebox.showinfo(
            "Load the extension",
            "1. Open Chrome and paste this in the address bar:\n"
            "     chrome://extensions\n"
            "   (also copied to your clipboard)\n\n"
            "2. Enable Developer mode\n"
            "3. Load unpacked → select the extension folder",
        )
        # Best-effort: launch Chrome to the extensions page
        chrome_paths = [
            Path(os.environ.get("PROGRAMFILES", r"C:\Program Files"))
            / "Google/Chrome/Application/chrome.exe",
            Path(os.environ.get("PROGRAMFILES(X86)", r"C:\Program Files (x86)"))
            / "Google/Chrome/Application/chrome.exe",
            Path(os.environ.get("LOCALAPPDATA", ""))
            / "Google/Chrome/Application/chrome.exe",
        ]
        for chrome in chrome_paths:
            if chrome.is_file():
                subprocess.Popen([str(chrome), "chrome://extensions"])
                break

    def open_extension_folder() -> None:
        path = EXTENSION_DIR if EXTENSION_DIR.is_dir() else APP_DIR
        subprocess.Popen(["explorer", str(path)])

    def open_downloads() -> None:
        out = Path.home() / "Downloads" / "TubeTone"
        out.mkdir(parents=True, exist_ok=True)
        subprocess.Popen(["explorer", str(out)])

    def copy_path() -> None:
        path = str(EXTENSION_DIR if EXTENSION_DIR.is_dir() else APP_DIR)
        root.clipboard_clear()
        root.clipboard_append(path)
        log_var.set("Extension path copied to clipboard")

    ttk.Button(btn_row, text="Open Chrome extensions", command=open_extensions_page).pack(
        side="left", padx=(0, 8)
    )
    ttk.Button(btn_row, text="Open extension folder", command=open_extension_folder).pack(
        side="left", padx=(0, 8)
    )

    btn_row2 = ttk.Frame(main)
    btn_row2.pack(fill="x", pady=(0, 8))
    ttk.Button(btn_row2, text="Copy extension path", command=copy_path).pack(
        side="left", padx=(0, 8)
    )
    ttk.Button(btn_row2, text="Open Downloads/TubeTone", command=open_downloads).pack(
        side="left"
    )

    ttk.Label(main, textvariable=log_var, wraplength=460, foreground="#9aa3b5").pack(
        anchor="w", pady=(12, 0)
    )

    def set_log(msg: str) -> None:
        write_log(msg)
        root.after(0, lambda: log_var.set(msg))

    def boot() -> None:
        try:
            set_log("Checking ffmpeg…")
            ffmpeg = ensure_ffmpeg(progress_cb=set_log)
            root.after(0, lambda: ffmpeg_var.set(f"ffmpeg: {ffmpeg}"))

            set_log("Starting local server…")
            start_server(ffmpeg)
            root.after(
                0,
                lambda: status_var.set(
                    f"● Server online  ·  http://{SERVER_HOST}:{SERVER_PORT}"
                ),
            )
            set_log("Ready. Load the extension in Chrome, then download from YouTube.")
        except Exception as exc:
            write_log(traceback.format_exc())
            root.after(0, lambda: status_var.set("● Setup failed"))
            root.after(
                0,
                lambda: messagebox.showerror(
                    "TubeTone setup failed",
                    f"{exc}\n\nSee log:\n{log_path()}",
                ),
            )

    threading.Thread(target=boot, daemon=True).start()

    def on_close() -> None:
        stop_server()
        root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_close)
    root.mainloop()


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    write_log("--- TubeTone launcher start ---")
    try:
        run_gui()
    except Exception:
        write_log(traceback.format_exc())
        raise


if __name__ == "__main__":
    main()
