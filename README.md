# YTMP — Local media toolkit for Windows

**Subscription Windows app** + **license API** + **public website** + **admin**.  
Downloads/conversion run on the PC via [yt-dlp](https://github.com/yt-dlp/yt-dlp) + ffmpeg. Online license required.

> **Production deploy:** see **[PRODUCTION.md](./PRODUCTION.md)** (env files, HTTPS, desktop config defaults).

## Layout

| Path | Role |
| --- | --- |
| `api/` | License & order API (Next.js, Prisma) |
| `website/` | Public marketing site |
| `admin/` | Admin dashboard |
| `launcher/` | Windows app + installer build |
| `extension/` + `server/` | Optional legacy Chrome / remote download path |

---

## Production (quick)

1. Copy production env examples and set real domains/secrets:
   - `api/.env.production.example`
   - `website/.env.production.example`
   - `admin/.env.production.example`
   - `launcher/config.defaults.example.json` → `launcher/config.defaults.json`
2. Build & deploy API, website, admin (`npm run build` / host start commands).
3. Build Windows installer: `launcher\build.bat` then `launcher\build_installer.bat`.

Full checklist: [PRODUCTION.md](./PRODUCTION.md).

---

## Local development

```bat
cd api
copy .env.example .env
npm install
npm run db:setup
npm run dev
```

API: http://127.0.0.1:8787  
Default admin: `admin@ytmp.app` / `admin123!` (change before any public deploy)

```bat
cd website
copy .env.example .env.local
npm install
npm run dev
```

Website: http://127.0.0.1:3000

```bat
cd admin
copy .env.example .env.local
npm install
npm run dev
```

Admin: http://127.0.0.1:3001

**Payments flow:** user orders on `/pricing` → admin **Mark paid** → license key → user activates in the app.

Desktop override: `%LOCALAPPDATA%\YTMP\config.json` (see `launcher/config.example.json`).  
Production builds use `launcher/config.defaults.json` as the default API/website URLs.

Optional SMTP (auto-email keys): `SMTP_*` in `api/.env`.

---

## Windows installer

```bat
cd launcher
REM Edit config.defaults.json first for production API/site URLs
build.bat
build_installer.bat
```

- `release/YTMP/` — portable folder  
- `release/YTMP-Setup.exe` — full installer (ffmpeg + shortcuts)

---

## Optional: Chrome extension + local/remote server

1. Install ffmpeg (PATH or `C:\ffmpeg\bin`)
2. `start-server.bat` or `python server/server.py`
3. Chrome → Load unpacked → `extension/`

Deploying that download server on Render: root `Dockerfile` + `render.yaml` (legacy **tubetone** download service — not the license API).

---

## Security notes

- Set a strong `JWT_SECRET` before production (API refuses weak secrets when `NODE_ENV=production`).
- Keep `ADMIN_PASSWORD` and API URLs private as appropriate.
- Only download content you have the right to use.
