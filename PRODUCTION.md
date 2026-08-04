# YTMP — Production setup

Ship three Node apps (API, website, admin) plus a Windows desktop build pointed at those hosts.

## Architecture

| Service | Folder | Purpose | Typical URL |
| --- | --- | --- | --- |
| License API | `api/` | Orders, licenses, admin JSON | `https://api.your-domain.com` |
| Public site | `website/` | Marketing + pricing + download | `https://www.your-domain.com` |
| Admin | `admin/` | Mark paid, keys, audit | `https://admin.your-domain.com` |
| Desktop app | `launcher/` | Windows client | Uses `config.defaults.json` |

Old optional stack (`server/` + `extension/` + root `Dockerfile`) is **not** the SaaS product path.

---

## 1. Fill production env files

Never commit real secrets. Use the examples:

```text
api/.env.production.example      → host env for the API
website/.env.production.example  → copy to website/.env.production before build
admin/.env.production.example    → copy to admin/.env.production before build
launcher/config.defaults.example.json → launcher/config.defaults.json
```

### API (required)

| Variable | Production value |
| --- | --- |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | 32+ random characters (not `change-me` / not dev default) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Strong credentials |
| `CORS_ORIGINS` | `https://www…,https://admin…` (exact, no trailing slash) |
| `PUBLIC_WEBSITE_URL` | `https://www.your-domain.com` |
| `COOKIE_SECURE` | `true` |
| `ADMIN_COOKIE_SAMESITE` | `none` if admin + API are different hosts; `lax` if same-site |
| `DOWNLOAD_URL` | Public URL of `YTMP-Setup.exe` |
| `DATABASE_URL` | **Postgres** connection string (required on Vercel) |

### Free cloud database (recommended: Neon)

SQLite files do not survive on Vercel. Use free Postgres:

1. Create a project at [https://neon.tech](https://neon.tech) (free tier).
2. **Connection details** → copy the **pooled** connection string (host contains `-pooler`).
3. It looks like:  
   `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`
4. Set `DATABASE_URL` on the Vercel **api** project (Production + Preview).
5. Redeploy — `npm run build` runs `prisma db push` so tables are created.
6. First login uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` (seeded if no admin exists).

Alternatives (same Prisma URL shape): [Supabase](https://supabase.com) free Postgres, or Vercel Postgres marketplace.

API fails fast on boot if `JWT_SECRET` is weak (`src/instrumentation.ts`).

### Website / admin (build-time)

`NEXT_PUBLIC_*` is **embedded at build time**. Rebuild after changing:

```bash
cd website
cp .env.production.example .env.production
# edit NEXT_PUBLIC_API_URL, DOWNLOAD_URL, SUPPORT_EMAIL
npm ci
npm run build
npm run start
```

```bash
cd admin
cp .env.production.example .env.production
# edit NEXT_PUBLIC_API_URL
npm ci
npm run build
npm run start
```

```bash
cd api
# set env from .env.production.example on the host
npm ci
npm run build
npm run start:prod
```

Or from repo root: `npm run build:all` (after each package has its env).

---

## 2. Desktop release (production URLs)

1. Edit `launcher/config.defaults.json` (or copy from `config.defaults.example.json`):

```json
{
  "apiUrl": "https://api.your-domain.com",
  "websiteUrl": "https://www.your-domain.com"
}
```

2. Build:

```bat
cd launcher
build.bat
build_installer.bat
```

The defaults ship **inside** the exe bundle and as `release/YTMP/config.defaults.json`.  
End users can still override with `%LOCALAPPDATA%\YTMP\config.json`.

Environment overrides at runtime (optional):

- `YTMP_API_URL` (or `TUBETONE_API_URL`)
- `YTMP_WEBSITE_URL`

---

## 3. Deploy checklist

- [ ] HTTPS on API, website, and admin  
- [ ] `CORS_ORIGINS` lists website + admin origins exactly  
- [ ] Strong `JWT_SECRET` + admin password  
- [ ] Database on durable storage  
- [ ] SMTP set if you want automatic license emails  
- [ ] `DOWNLOAD_URL` / `NEXT_PUBLIC_DOWNLOAD_URL` point at installer  
- [ ] `launcher/config.defaults.json` points at production API + site  
- [ ] Website & admin **rebuilt** after any `NEXT_PUBLIC_*` change  
- [ ] First admin login works; create a test order → mark paid → activate app  

---

## 4. Local development (unchanged)

Use `.env.example` / `.env.local` pointing at `127.0.0.1` — see root `README.md`.

Ports: API `8787`, website `3000`, admin `3001`.

---

## 5. Optional legacy Docker download server

Root `Dockerfile` + `render.yaml` still package the old Python / yt-dlp **download** server for the Chrome extension flow. That is separate from the YTMP license SaaS (`api/` + desktop).
