# Admin — YTMP dashboard

Production:

```bash
cp .env.production.example .env.production
# set NEXT_PUBLIC_API_URL to the public API origin
npm ci
npm run build
npm run start
```

Local: `.env.example` → `.env.local`, `npm run dev` on port 3001.

See root [PRODUCTION.md](../PRODUCTION.md).
