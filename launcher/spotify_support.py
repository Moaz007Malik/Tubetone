"""
Spotify → downloadable YouTube matches (audio/MP3).

Spotify does not expose official file downloads. We resolve metadata from Spotify’s
public embed payloads, then match each track on YouTube via yt-dlp (ytsearch1:).
Optional: song.link may return a direct YouTube URL for single tracks.
"""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)

# open.spotify.com/... or music.spotify.com, plus URIs / short links
SPOTIFY_RE = re.compile(
    r"(?:"
    r"https?://(?:open|play|music)\.spotify\.com/(?:intl-[a-z]{2}/)?"
    r"(track|album|playlist|episode|show)/([a-zA-Z0-9]{22})(?:[/?#][^\s]*)?"
    r"|https?://spotify\.link/[a-zA-Z0-9]+"
    r"|https?://spotify\.app\.link/[^\s]+"
    r"|spotify:(track|album|playlist|episode|show):([a-zA-Z0-9]{22})"
    r")",
    re.I,
)

URI_RE = re.compile(
    r"spotify:(track|album|playlist|episode|show):([a-zA-Z0-9]{22})",
    re.I,
)
PATH_RE = re.compile(
    r"/(?:intl-[a-z]{2}/)?(track|album|playlist|episode|show)/([a-zA-Z0-9]{22})",
    re.I,
)


def is_spotify_url(text: str) -> bool:
    t = (text or "").strip()
    if not t:
        return False
    if SPOTIFY_RE.search(t):
        return True
    low = t.lower()
    return "spotify.com/" in low or low.startswith("spotify:") or "spotify.link/" in low


def normalize_spotify_url(text: str) -> str | None:
    """Return a canonical https open.spotify.com URL, or None."""
    text = (text or "").strip()
    if not text:
        return None

    m = URI_RE.search(text)
    if m:
        kind, sid = m.group(1).lower(), m.group(2)
        return f"https://open.spotify.com/{kind}/{sid}"

    m = SPOTIFY_RE.search(text)
    if not m:
        # Bare pasted host without scheme
        if "spotify.com/" in text.lower() and not text.lower().startswith("http"):
            return normalize_spotify_url("https://" + text.lstrip("/"))
        return None

    full = m.group(0)
    if "spotify.link" in full.lower() or "spotify.app.link" in full.lower():
        return _resolve_redirect(full)

    if full.lower().startswith("spotify:"):
        m2 = URI_RE.search(full)
        if m2:
            return f"https://open.spotify.com/{m2.group(1).lower()}/{m2.group(2)}"
        return None

    if not full.startswith("http"):
        full = "https://" + full

    try:
        u = urllib.parse.urlparse(full)
        pm = PATH_RE.search(u.path or "")
        if not pm:
            return full.rstrip(").,]}")
        kind, sid = pm.group(1).lower(), pm.group(2)
        return f"https://open.spotify.com/{kind}/{sid}"
    except Exception:
        return full.rstrip(").,]}")


def _resolve_redirect(url: str, timeout: int = 15) -> str | None:
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": USER_AGENT},
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310
            final = resp.geturl()
        if is_spotify_url(final):
            return normalize_spotify_url(final) or final
        return final
    except Exception:
        return url if is_spotify_url(url) else None


def spotify_kind(url: str) -> str | None:
    n = normalize_spotify_url(url) or url
    pm = PATH_RE.search(urllib.parse.urlparse(n).path or "")
    return pm.group(1).lower() if pm else None


def is_spotify_collection(url: str) -> bool:
    k = spotify_kind(url)
    return k in {"album", "playlist", "show"}


def _http_get(url: str, timeout: int = 25) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/json",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310
        return resp.read().decode("utf-8", "replace")


def _http_get_json(url: str, timeout: int = 20) -> dict:
    raw = _http_get(url, timeout=timeout)
    return json.loads(raw)


def _parse_embed_entity(html: str) -> dict[str, Any]:
    m = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">(.+?)</script>',
        html,
        re.S,
    )
    if not m:
        raise RuntimeError("Spotify embed payload missing (__NEXT_DATA__)")
    data = json.loads(m.group(1))
    entity = (
        data.get("props", {})
        .get("pageProps", {})
        .get("state", {})
        .get("data", {})
        .get("entity")
    )
    if not isinstance(entity, dict):
        raise RuntimeError("Spotify embed entity missing")
    return entity


def _track_dict(title: str, artist: str, uri: str = "", source: str = "") -> dict:
    title = (title or "").strip()
    artist = (artist or "").strip()
    query = f"{artist} - {title}".strip(" -") if artist else title
    return {
        "title": title,
        "artist": artist,
        "uri": uri,
        "source": source,
        "query": query,
        # yt-dlp search URL used by the download engine
        "download_url": f"ytsearch1:{query}" if query else "",
    }


def _tracks_from_entity(entity: dict, source_url: str) -> list[dict]:
    out: list[dict] = []
    track_list = entity.get("trackList")
    if isinstance(track_list, list) and track_list:
        for item in track_list:
            if not isinstance(item, dict):
                continue
            title = item.get("title") or item.get("name") or ""
            artist = item.get("subtitle") or ""
            uri = item.get("uri") or ""
            if not title:
                continue
            out.append(_track_dict(str(title), str(artist), str(uri), source_url))
        return out

    # Single track (or episode) page: entity is the track itself
    etype = (entity.get("entityType") or entity.get("type") or "").lower()
    title = entity.get("title") or entity.get("name") or ""
    artist = entity.get("subtitle") or ""
    uri = entity.get("uri") or ""
    if title and etype in {"track", "episode", "", "audiobook"}:
        if not artist and isinstance(entity.get("artists"), list):
            names = []
            for a in entity["artists"]:
                if isinstance(a, dict) and a.get("name"):
                    names.append(str(a["name"]))
                elif isinstance(a, str):
                    names.append(a)
            artist = ", ".join(names)
        out.append(_track_dict(str(title), str(artist), str(uri), source_url))
    return out


def fetch_spotify_tracks(url: str, *, limit: int = 0) -> list[dict]:
    """
    Resolve a Spotify track/album/playlist URL into searchable track dicts.
    limit=0 means no cap.
    """
    canon = normalize_spotify_url(url)
    if not canon:
        raise ValueError("Not a Spotify URL")

    kind = spotify_kind(canon) or "track"
    if kind == "show":
        # Treat show as playlist of episodes (if embed exposes them)
        kind = "playlist"

    sid_m = PATH_RE.search(urllib.parse.urlparse(canon).path or "")
    if not sid_m:
        raise ValueError("Could not parse Spotify ID")
    sid = sid_m.group(2)
    embed_kind = "playlist" if kind == "show" else kind
    embed = f"https://open.spotify.com/embed/{embed_kind}/{sid}"
    html = _http_get(embed)
    entity = _parse_embed_entity(html)
    tracks = _tracks_from_entity(entity, canon)
    if not tracks:
        # oEmbed fallback for single items
        tracks = _oembed_fallback(canon)

    if kind == "track" and len(tracks) == 1:
        # Prefer song.link YouTube match when available
        yt = _songlink_youtube(canon)
        if yt:
            tracks[0]["download_url"] = yt
            tracks[0]["matched"] = "songlink"

    if limit and limit > 0:
        tracks = tracks[:limit]
    if not tracks:
        raise RuntimeError(
            "No tracks found on that Spotify link. "
            "Try the full open.spotify.com track/album/playlist URL."
        )
    return tracks


def _oembed_fallback(url: str) -> list[dict]:
    try:
        oembed_url = "https://open.spotify.com/oembed?url=" + urllib.parse.quote(url, safe="")
        data = _http_get_json(oembed_url)
        title = (data.get("title") or "").strip()
        if not title:
            return []
        # Often "Track · Artist" or just track name
        artist = ""
        if " · " in title:
            parts = title.split(" · ", 1)
            title, artist = parts[0].strip(), parts[1].strip()
        return [_track_dict(title, artist, "", url)]
    except Exception:
        return []


def _songlink_youtube(spotify_url: str) -> str | None:
    try:
        api = (
            "https://api.song.link/v1-alpha.1/links?url="
            + urllib.parse.quote(spotify_url, safe="")
            + "&userCountry=US"
        )
        data = _http_get_json(api, timeout=18)
        links = data.get("linksByPlatform") or {}
        for platform in ("youtube", "youtubeMusic"):
            entry = links.get(platform)
            if isinstance(entry, dict) and entry.get("url"):
                return str(entry["url"])
        # entities fallback
        by_id = data.get("entitiesByUniqueId") or {}
        for ent in by_id.values():
            if not isinstance(ent, dict):
                continue
            if ent.get("apiProvider") in ("youtube", "youtubeMusic") and ent.get("id"):
                eid = ent["id"]
                if isinstance(eid, str) and len(eid) >= 6:
                    return f"https://www.youtube.com/watch?v={eid}"
    except Exception:
        return None
    return None


def expand_spotify_to_download_urls(url: str, *, limit: int = 0) -> list[str]:
    """Return yt-dlp-compatible URLs (YouTube watch or ytsearch1:)."""
    tracks = fetch_spotify_tracks(url, limit=limit)
    out: list[str] = []
    for t in tracks:
        d = (t.get("download_url") or "").strip()
        if d:
            out.append(d)
    return out


def spotify_preview_label(url: str, *, limit: int = 0) -> str:
    tracks = fetch_spotify_tracks(url, limit=limit or 5)
    kind = spotify_kind(url) or "item"
    if len(tracks) == 1:
        t = tracks[0]
        who = f" · {t['artist']}" if t.get("artist") else ""
        return f"Spotify {kind} · {t['title']}{who}"
    sample = ", ".join(t["title"] for t in tracks[:3] if t.get("title"))
    more = f" · e.g. {sample}" if sample else ""
    total = len(tracks) if not limit else f"{len(tracks)}+"
    return f"Spotify {kind} · {total} tracks{more}"
