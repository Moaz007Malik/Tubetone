"""Local media toolkit powered by ffmpeg (convert, trim, compress, etc.)."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path


def ffmpeg_exe(ffmpeg_bin: Path | None) -> str:
    if ffmpeg_bin and (ffmpeg_bin / "ffmpeg.exe").is_file():
        return str(ffmpeg_bin / "ffmpeg.exe")
    if ffmpeg_bin and (ffmpeg_bin / "ffmpeg").is_file():
        return str(ffmpeg_bin / "ffmpeg")
    which = shutil.which("ffmpeg")
    if which:
        return which
    raise RuntimeError("ffmpeg not found")


def ffprobe_exe(ffmpeg_bin: Path | None) -> str:
    if ffmpeg_bin and (ffmpeg_bin / "ffprobe.exe").is_file():
        return str(ffmpeg_bin / "ffprobe.exe")
    if ffmpeg_bin and (ffmpeg_bin / "ffprobe").is_file():
        return str(ffmpeg_bin / "ffprobe")
    which = shutil.which("ffprobe")
    if which:
        return which
    # fall back beside ffmpeg
    ff = Path(ffmpeg_exe(ffmpeg_bin))
    probe = ff.with_name("ffprobe.exe" if ff.suffix.lower() == ".exe" else "ffprobe")
    if probe.is_file():
        return str(probe)
    raise RuntimeError("ffprobe not found")


def run_ffmpeg(ffmpeg_bin: Path | None, args: list[str], cancel_flag: dict | None = None) -> None:
    cmd = [ffmpeg_exe(ffmpeg_bin), "-y", *args]
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0,
    )
    while True:
        if cancel_flag and cancel_flag.get("on"):
            proc.terminate()
            raise RuntimeError("Cancelled")
        ret = proc.poll()
        if ret is not None:
            if ret != 0:
                err = (proc.stderr.read() if proc.stderr else b"").decode("utf-8", errors="ignore")
                raise RuntimeError(err[-800:] or f"ffmpeg exit {ret}")
            return
        try:
            proc.wait(timeout=0.25)
        except subprocess.TimeoutExpired:
            continue


def unique_path(dest: Path) -> Path:
    if not dest.exists():
        return dest
    stem, suf = dest.stem, dest.suffix
    n = 2
    while True:
        cand = dest.with_name(f"{stem} ({n}){suf}")
        if not cand.exists():
            return cand
        n += 1


def convert_file(
    ffmpeg_bin: Path | None,
    src: Path,
    out_dir: Path,
    target: str,
    bitrate: str = "192",
    cancel_flag: dict | None = None,
) -> Path:
    """target: mp3|m4a|wav|flac|opus|mp4|webm|mkv"""
    out_dir.mkdir(parents=True, exist_ok=True)
    target = target.lower().strip()
    dest = unique_path(out_dir / f"{src.stem}.{target}")
    args: list[str] = ["-i", str(src)]
    if target == "mp3":
        args += ["-vn", "-codec:a", "libmp3lame", "-b:a", f"{bitrate}k"]
    elif target == "m4a":
        args += ["-vn", "-codec:a", "aac", "-b:a", f"{bitrate}k"]
    elif target == "wav":
        args += ["-vn", "-codec:a", "pcm_s16le"]
    elif target == "flac":
        args += ["-vn", "-codec:a", "flac"]
    elif target == "opus":
        args += ["-vn", "-codec:a", "libopus", "-b:a", f"{bitrate}k"]
    elif target in {"mp4", "mkv", "webm"}:
        args += ["-codec:v", "libx264", "-preset", "fast", "-crf", "23", "-codec:a", "aac", "-b:a", f"{bitrate}k"]
        if target == "webm":
            args = ["-i", str(src), "-codec:v", "libvpx-vp9", "-b:v", "1M", "-codec:a", "libopus", "-b:a", f"{bitrate}k"]
    else:
        raise ValueError(f"Unsupported target: {target}")
    args.append(str(dest))
    run_ffmpeg(ffmpeg_bin, args, cancel_flag)
    return dest


def extract_audio(
    ffmpeg_bin: Path | None,
    src: Path,
    out_dir: Path,
    fmt: str = "mp3",
    bitrate: str = "192",
    cancel_flag: dict | None = None,
) -> Path:
    return convert_file(ffmpeg_bin, src, out_dir, fmt, bitrate, cancel_flag)


def trim_media(
    ffmpeg_bin: Path | None,
    src: Path,
    out_dir: Path,
    start: str,
    end: str | None,
    cancel_flag: dict | None = None,
) -> Path:
    """start/end as HH:MM:SS or seconds."""
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = unique_path(out_dir / f"{src.stem}_trim{src.suffix}")
    args = ["-ss", start, "-i", str(src)]
    if end:
        args += ["-to", end]
    args += ["-codec", "copy", str(dest)]
    try:
        run_ffmpeg(ffmpeg_bin, args, cancel_flag)
    except RuntimeError:
        # re-encode fallback when copy fails
        args = ["-ss", start, "-i", str(src)]
        if end:
            args += ["-to", end]
        args += ["-codec:v", "libx264", "-codec:a", "aac", str(dest)]
        run_ffmpeg(ffmpeg_bin, args, cancel_flag)
    return dest


def compress_video(
    ffmpeg_bin: Path | None,
    src: Path,
    out_dir: Path,
    crf: str = "28",
    cancel_flag: dict | None = None,
) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = unique_path(out_dir / f"{src.stem}_compressed.mp4")
    args = [
        "-i",
        str(src),
        "-codec:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        str(crf),
        "-codec:a",
        "aac",
        "-b:a",
        "128k",
        str(dest),
    ]
    run_ffmpeg(ffmpeg_bin, args, cancel_flag)
    return dest


def make_gif(
    ffmpeg_bin: Path | None,
    src: Path,
    out_dir: Path,
    start: str = "0",
    duration: str = "5",
    fps: str = "12",
    width: str = "480",
    cancel_flag: dict | None = None,
) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = unique_path(out_dir / f"{src.stem}.gif")
    filt = f"fps={fps},scale={width}:-1:flags=lanczos"
    args = ["-ss", start, "-t", duration, "-i", str(src), "-vf", filt, "-loop", "0", str(dest)]
    run_ffmpeg(ffmpeg_bin, args, cancel_flag)
    return dest


def normalize_audio(
    ffmpeg_bin: Path | None,
    src: Path,
    out_dir: Path,
    cancel_flag: dict | None = None,
) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = unique_path(out_dir / f"{src.stem}_normalized.mp3")
    args = [
        "-i",
        str(src),
        "-filter:a",
        "loudnorm",
        "-codec:a",
        "libmp3lame",
        "-b:a",
        "192k",
        str(dest),
    ]
    run_ffmpeg(ffmpeg_bin, args, cancel_flag)
    return dest


def change_speed(
    ffmpeg_bin: Path | None,
    src: Path,
    out_dir: Path,
    speed: float,
    cancel_flag: dict | None = None,
) -> Path:
    if speed <= 0:
        raise ValueError("speed must be > 0")
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = unique_path(out_dir / f"{src.stem}_x{speed}.mp3")
    # atempo supports 0.5–2.0; chain if needed
    tempo = speed
    filters: list[str] = []
    while tempo > 2.0:
        filters.append("atempo=2.0")
        tempo /= 2.0
    while tempo < 0.5:
        filters.append("atempo=0.5")
        tempo /= 0.5
    filters.append(f"atempo={tempo:.4f}")
    args = [
        "-i",
        str(src),
        "-filter:a",
        ",".join(filters),
        "-vn",
        "-codec:a",
        "libmp3lame",
        "-b:a",
        "192k",
        str(dest),
    ]
    run_ffmpeg(ffmpeg_bin, args, cancel_flag)
    return dest


def extract_frame(
    ffmpeg_bin: Path | None,
    src: Path,
    out_dir: Path,
    at_time: str = "00:00:01",
    cancel_flag: dict | None = None,
) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = unique_path(out_dir / f"{src.stem}_frame.jpg")
    args = ["-ss", at_time, "-i", str(src), "-frames:v", "1", str(dest)]
    run_ffmpeg(ffmpeg_bin, args, cancel_flag)
    return dest


def probe_media(ffmpeg_bin: Path | None, src: Path) -> dict:
    cmd = [
        ffprobe_exe(ffmpeg_bin),
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        str(src),
    ]
    raw = subprocess.check_output(
        cmd,
        creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0,
    )
    data = json.loads(raw.decode("utf-8"))
    fmt = data.get("format") or {}
    streams = data.get("streams") or []
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
    return {
        "path": str(src),
        "format": fmt.get("format_long_name") or fmt.get("format_name"),
        "duration": fmt.get("duration"),
        "size": fmt.get("size"),
        "bitrate": fmt.get("bit_rate"),
        "video": {
            "codec": video.get("codec_name"),
            "width": video.get("width"),
            "height": video.get("height"),
        }
        if video
        else None,
        "audio": {
            "codec": audio.get("codec_name"),
            "sample_rate": audio.get("sample_rate"),
            "channels": audio.get("channels"),
        }
        if audio
        else None,
    }


def adjust_volume(
    ffmpeg_bin: Path | None,
    src: Path,
    out_dir: Path,
    db: float = 0.0,
    cancel_flag: dict | None = None,
) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = unique_path(out_dir / f"{src.stem}_vol{db:+.0f}dB.mp3")
    args = [
        "-i",
        str(src),
        "-filter:a",
        f"volume={db}dB",
        "-vn",
        "-codec:a",
        "libmp3lame",
        "-b:a",
        "192k",
        str(dest),
    ]
    run_ffmpeg(ffmpeg_bin, args, cancel_flag)
    return dest


def rotate_video(
    ffmpeg_bin: Path | None,
    src: Path,
    out_dir: Path,
    degrees: int = 90,
    cancel_flag: dict | None = None,
) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = unique_path(out_dir / f"{src.stem}_rot{degrees}.mp4")
    # 90 / 180 / 270 clockwise via transpose
    if degrees % 360 == 90:
        vf = "transpose=1"
    elif degrees % 360 == 180:
        vf = "transpose=1,transpose=1"
    elif degrees % 360 == 270:
        vf = "transpose=2"
    else:
        raise ValueError("degrees must be 90, 180, or 270")
    args = [
        "-i",
        str(src),
        "-vf",
        vf,
        "-codec:a",
        "copy",
        str(dest),
    ]
    run_ffmpeg(ffmpeg_bin, args, cancel_flag)
    return dest


def reverse_media(
    ffmpeg_bin: Path | None,
    src: Path,
    out_dir: Path,
    cancel_flag: dict | None = None,
) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = unique_path(out_dir / f"{src.stem}_reversed{src.suffix}")
    # Audio-only reverse is cheaper; try audio first for common audio files
    if src.suffix.lower() in {".mp3", ".m4a", ".wav", ".flac", ".opus", ".aac"}:
        dest = unique_path(out_dir / f"{src.stem}_reversed.mp3")
        args = [
            "-i",
            str(src),
            "-af",
            "areverse",
            "-codec:a",
            "libmp3lame",
            "-b:a",
            "192k",
            str(dest),
        ]
    else:
        args = [
            "-i",
            str(src),
            "-vf",
            "reverse",
            "-af",
            "areverse",
            "-codec:v",
            "libx264",
            "-preset",
            "fast",
            "-codec:a",
            "aac",
            str(dest),
        ]
    run_ffmpeg(ffmpeg_bin, args, cancel_flag)
    return dest


def batch_convert_folder(
    ffmpeg_bin: Path | None,
    folder: Path,
    out_dir: Path,
    target: str,
    bitrate: str = "192",
    cancel_flag: dict | None = None,
) -> list[Path]:
    exts = {
        ".mp4",
        ".mkv",
        ".webm",
        ".mov",
        ".avi",
        ".mp3",
        ".m4a",
        ".wav",
        ".flac",
        ".opus",
        ".aac",
    }
    results: list[Path] = []
    for src in sorted(folder.iterdir()):
        if cancel_flag and cancel_flag.get("on"):
            raise RuntimeError("Cancelled")
        if not src.is_file() or src.suffix.lower() not in exts:
            continue
        results.append(convert_file(ffmpeg_bin, src, out_dir, target, bitrate, cancel_flag))
    if not results:
        raise ValueError("No media files found in folder")
    return results


def fade_audio(
    ffmpeg_bin: Path | None,
    src: Path,
    out_dir: Path,
    fade_in: float = 1.0,
    fade_out: float = 2.0,
    cancel_flag: dict | None = None,
) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = unique_path(out_dir / f"{src.stem}_fade.mp3")
    # duration for fade-out end needs probe; use long st if unknown
    info = probe_media(ffmpeg_bin, src)
    dur = float(info.get("duration") or 0) or 0.0
    af = f"afade=t=in:st=0:d={max(0.0, fade_in)}"
    if dur > fade_out > 0:
        af += f",afade=t=out:st={max(0.0, dur - fade_out)}:d={fade_out}"
    args = [
        "-i",
        str(src),
        "-af",
        af,
        "-vn",
        "-codec:a",
        "libmp3lame",
        "-b:a",
        "192k",
        str(dest),
    ]
    run_ffmpeg(ffmpeg_bin, args, cancel_flag)
    return dest


def to_mono(
    ffmpeg_bin: Path | None,
    src: Path,
    out_dir: Path,
    cancel_flag: dict | None = None,
) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = unique_path(out_dir / f"{src.stem}_mono.mp3")
    args = [
        "-i",
        str(src),
        "-ac",
        "1",
        "-vn",
        "-codec:a",
        "libmp3lame",
        "-b:a",
        "160k",
        str(dest),
    ]
    run_ffmpeg(ffmpeg_bin, args, cancel_flag)
    return dest


def strip_audio(
    ffmpeg_bin: Path | None,
    src: Path,
    out_dir: Path,
    cancel_flag: dict | None = None,
) -> Path:
    """Mute / remove audio track, keep video."""
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = unique_path(out_dir / f"{src.stem}_silent.mp4")
    args = [
        "-i",
        str(src),
        "-an",
        "-codec:v",
        "copy",
        str(dest),
    ]
    try:
        run_ffmpeg(ffmpeg_bin, args, cancel_flag)
    except RuntimeError:
        args = ["-i", str(src), "-an", "-codec:v", "libx264", "-preset", "fast", "-crf", "23", str(dest)]
        run_ffmpeg(ffmpeg_bin, args, cancel_flag)
    return dest


def remux(
    ffmpeg_bin: Path | None,
    src: Path,
    out_dir: Path,
    container: str = "mp4",
    cancel_flag: dict | None = None,
) -> Path:
    """Change container without re-encoding when possible."""
    out_dir.mkdir(parents=True, exist_ok=True)
    container = container.lower().strip().lstrip(".")
    if container not in {"mp4", "mkv", "mov", "webm", "m4a", "mp3"}:
        raise ValueError("Unsupported container")
    dest = unique_path(out_dir / f"{src.stem}.{container}")
    args = ["-i", str(src), "-codec", "copy", str(dest)]
    try:
        run_ffmpeg(ffmpeg_bin, args, cancel_flag)
    except RuntimeError:
        # remux failed — minimal re-encode
        if container in {"m4a", "mp3"}:
            return convert_file(ffmpeg_bin, src, out_dir, container, "192", cancel_flag)
        args = [
            "-i",
            str(src),
            "-codec:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "23",
            "-codec:a",
            "aac",
            str(dest),
        ]
        run_ffmpeg(ffmpeg_bin, args, cancel_flag)
    return dest


def split_chunks(
    ffmpeg_bin: Path | None,
    src: Path,
    out_dir: Path,
    chunk_sec: int = 60,
    cancel_flag: dict | None = None,
) -> list[Path]:
    """Split media into fixed-length chunks."""
    if chunk_sec < 1:
        raise ValueError("chunk length must be ≥ 1 second")
    out_dir.mkdir(parents=True, exist_ok=True)
    info = probe_media(ffmpeg_bin, src)
    dur = float(info.get("duration") or 0)
    if dur <= 0:
        raise ValueError("Could not determine duration")
    results: list[Path] = []
    t = 0.0
    i = 1
    while t < dur:
        if cancel_flag and cancel_flag.get("on"):
            raise RuntimeError("Cancelled")
        dest = unique_path(out_dir / f"{src.stem}_part{i:02d}{src.suffix}")
        args = [
            "-ss",
            str(t),
            "-i",
            str(src),
            "-t",
            str(chunk_sec),
            "-codec",
            "copy",
            str(dest),
        ]
        try:
            run_ffmpeg(ffmpeg_bin, args, cancel_flag)
        except RuntimeError:
            args = [
                "-ss",
                str(t),
                "-i",
                str(src),
                "-t",
                str(chunk_sec),
                "-codec:v",
                "libx264",
                "-codec:a",
                "aac",
                str(dest),
            ]
            run_ffmpeg(ffmpeg_bin, args, cancel_flag)
        results.append(dest)
        t += chunk_sec
        i += 1
    return results


def export_m3u(playlist_path: Path, files: list[Path], title: str = "YTMP Playlist") -> Path:
    lines = ["#EXTM3U", f"#PLAYLIST:{title}"]
    for f in files:
        if f.is_file():
            lines.append(f"#EXTINF:-1,{f.stem}")
            lines.append(str(f.resolve()))
    playlist_path.parent.mkdir(parents=True, exist_ok=True)
    playlist_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return playlist_path


def merge_audio(
    ffmpeg_bin: Path | None,
    files: list[Path],
    out_dir: Path,
    cancel_flag: dict | None = None,
) -> Path:
    if len(files) < 2:
        raise ValueError("Need at least 2 files to merge")
    out_dir.mkdir(parents=True, exist_ok=True)
    list_file = out_dir / "_ytmp_concat.txt"
    lines = []
    for f in files:
        # ffmpeg concat demuxer escaping
        p = str(f.resolve()).replace("'", r"'\''")
        lines.append(f"file '{p}'")
    list_file.write_text("\n".join(lines), encoding="utf-8")
    dest = unique_path(out_dir / "merged.mp3")
    try:
        args = ["-f", "concat", "-safe", "0", "-i", str(list_file), "-codec:a", "libmp3lame", "-b:a", "192k", str(dest)]
        run_ffmpeg(ffmpeg_bin, args, cancel_flag)
    finally:
        list_file.unlink(missing_ok=True)
    return dest
