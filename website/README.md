# Website — YTMP public site

Production:

```bash
cp .env.production.example .env.production
# set NEXT_PUBLIC_API_URL, NEXT_PUBLIC_DOWNLOAD_URL, NEXT_PUBLIC_SUPPORT_EMAIL
npm ci
npm run build
npm run start
```

Local: copy `.env.example` → `.env.local`, then `npm run dev` (port 3000).

See root [PRODUCTION.md](../PRODUCTION.md).
