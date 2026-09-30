# FlyBook (Next.js) — Vercel deploy

## Local

```bash
npm install
cp .env.example .env
npx prisma db push
npm run dev
```

Login: admin / admin123

## GitHub → Vercel

1. Push this folder to GitHub
2. vercel.com → Import project
3. Environment variables:

| Name | Value |
|------|--------|
| DATABASE_URL | file:/tmp/flybook.db |
| AUTH_USER | admin |
| AUTH_PASS | admin123 |
| AUTH_SECRET | long-random-string |
| TZ | Asia/Dubai |

4. Deploy

Build uses: `prisma generate && next build`
