# Fix failed Vercel deploy

## 1. Push this updated zip code to GitHub

```bat
cd flybook-next
git add .
git commit -m "Fix Vercel build Prisma"
git push
```

Vercel will auto-redeploy.

## 2. Set Environment Variables in Vercel

Project → Settings → Environment Variables:

DATABASE_URL = file:/tmp/flybook.db
AUTH_USER = admin
AUTH_PASS = admin123
AUTH_SECRET = any-long-random-secret-32chars
TZ = Asia/Dubai

Apply to Production + Preview.

## 3. Redeploy

Deployments → ... → Redeploy

## 4. If still fails

Vercel → failed deployment → Building → copy the RED error text.
