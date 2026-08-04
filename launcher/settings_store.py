"""Persist YTMP UI settings and download history."""

from __future__ import annotations

import json
import os
from pathlib import Path

DATA_DIR = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "YTMP"
SETTINGS_FILE = DATA_DIR / "settings.json"
HISTORY_FILE = DATA_DIR / "history.json"

DEFAULTS = {
    "mode": "music",
    "bitrate": "128",
    "quality": "720",
    "outDir": str(Path.home() / "Downloads" / "YTMP"),
    "filenameTemplate": "%(title)s [%(id)s]",
    "playlistLimit": "0",
}


def load_settings() -> dict:
    data = dict(DEFAULTS)
    if SETTINGS_FILE.is_file():
        try:
            data.update(json.loads(SETTINGS_FILE.read_text(encoding="utf-8")))
        except Exception:
            pass
    return data


def save_settings(data: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    cur = load_settings()
    cur.update(data)
    SETTINGS_FILE.write_text(json.dumps(cur, indent=2), encoding="utf-8")


def load_history(limit: int = 200) -> list[dict]:
    if not HISTORY_FILE.is_file():
        return []
    try:
        items = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
        if isinstance(items, list):
            return items[:limit]
    except Exception:
        pass
    return []


def add_history(entry: dict, limit: int = 200) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    items = load_history(limit=limit)
    items.insert(0, entry)
    HISTORY_FILE.write_text(json.dumps(items[:limit], indent=2), encoding="utf-8")


def clear_history() -> None:
    HISTORY_FILE.unlink(missing_ok=True)


def search_history(query: str, limit: int = 50) -> list[dict]:
    q = (query or "").strip().lower()
    items = load_history(limit=200)
    if not q:
        return items[:limit]
    return [
        h
        for h in items
        if q in (h.get("title") or "").lower()
        or q in (h.get("path") or "").lower()
        or q in (h.get("url") or "").lower()
    ][:limit]
