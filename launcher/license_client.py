"""Online license activate / heartbeat for YTMP."""

from __future__ import annotations

import hashlib
import json
import os
import platform
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

DATA_DIR = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "YTMP"
LICENSE_FILE = DATA_DIR / "license.json"
CONFIG_FILE = DATA_DIR / "config.json"
DEFAULT_API = os.environ.get("TUBETONE_API_URL", "http://127.0.0.1:8787")
APP_VERSION = "1.1.0"


def load_config() -> dict:
    cfg = {"apiUrl": DEFAULT_API, "websiteUrl": "http://127.0.0.1:3000"}
    if CONFIG_FILE.is_file():
        try:
            cfg.update(json.loads(CONFIG_FILE.read_text(encoding="utf-8")))
        except Exception:
            pass
    return cfg


def api_base() -> str:
    return str(load_config().get("apiUrl") or DEFAULT_API).rstrip("/")


def device_fingerprint() -> str:
    raw = f"{platform.node()}|{platform.system()}|{os.environ.get('USERNAME') or os.environ.get('USER') or ''}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def machine_name() -> str:
    return platform.node() or "PC"


def _request(method: str, path: str, body: dict | None = None, timeout: int = 20) -> dict:
    url = f"{api_base()}{path}"
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Content-Type": "application/json",
            "User-Agent": f"YTMP/{APP_VERSION}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            payload = json.loads(e.read().decode("utf-8"))
        except Exception:
            payload = {"error": str(e)}
        raise RuntimeError(payload.get("error") or payload.get("reason") or str(e)) from e


def load_license() -> dict | None:
    if not LICENSE_FILE.is_file():
        return None
    try:
        return json.loads(LICENSE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return None


def save_license(data: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    LICENSE_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def clear_license() -> None:
    LICENSE_FILE.unlink(missing_ok=True)


def activate(key: str) -> dict:
    result = _request(
        "POST",
        "/v1/licenses/activate",
        {
            "key": key.strip().upper(),
            "fingerprint": device_fingerprint(),
            "machineName": machine_name(),
        },
    )
    store = {
        "token": result["token"],
        "licenseKey": result.get("licenseKey") or key.strip().upper(),
        "plan": result.get("plan"),
        "status": result.get("status"),
        "endsAt": result.get("endsAt"),
        "email": result.get("email"),
        "offlineGraceHours": result.get("offlineGraceHours", 72),
        "lastValidatedAt": datetime.now(timezone.utc).isoformat(),
        "valid": True,
    }
    save_license(store)
    return store


def heartbeat() -> dict:
    lic = load_license()
    if not lic or not lic.get("token"):
        return {"valid": False, "reason": "no_license"}
    try:
        result = _request("POST", "/v1/licenses/heartbeat", {"token": lic["token"]})
        if result.get("token"):
            lic["token"] = result["token"]
        lic["plan"] = result.get("plan", lic.get("plan"))
        lic["status"] = result.get("status", lic.get("status"))
        lic["endsAt"] = result.get("endsAt", lic.get("endsAt"))
        lic["email"] = result.get("email", lic.get("email"))
        lic["offlineGraceHours"] = result.get(
            "offlineGraceHours", lic.get("offlineGraceHours", 72)
        )
        lic["lastValidatedAt"] = datetime.now(timezone.utc).isoformat()
        lic["valid"] = bool(result.get("valid", True))
        save_license(lic)
        return {"valid": True, **lic}
    except Exception as exc:
        # Offline grace
        last = lic.get("lastValidatedAt")
        grace_h = float(lic.get("offlineGraceHours") or 72)
        if last and lic.get("valid"):
            try:
                last_dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
                age_h = (datetime.now(timezone.utc) - last_dt).total_seconds() / 3600
                if age_h <= grace_h:
                    return {"valid": True, "offline": True, **lic}
            except Exception:
                pass
        return {"valid": False, "reason": str(exc), **lic}


def is_licensed() -> bool:
    state = heartbeat()
    return bool(state.get("valid"))


def check_latest() -> dict | None:
    try:
        return _request("GET", "/v1/app/latest")
    except Exception:
        return None
