# API — YTMP license service

Production: copy `.env.production.example` env vars onto the host, then:

```bash
npm ci
npm run build
npm run start:prod
```

Local:

```bash
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

See root [PRODUCTION.md](../PRODUCTION.md).
