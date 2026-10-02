# FlyBook – Debit & Credit Money Book

Cloudflare-ready **Next.js + Supabase** application.

## Login

The login form is blank (no pre-filled demo credentials).  
Enter the username you configured in Supabase Auth. The app maps `username` → `username@flybook.local`.

**Change the password after first login.**

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Run `supabase/schema.sql` (includes `transaction_time` column).
4. In **Authentication → Users**, create a user, e.g.:
   - Email: `admin@flybook.local`
   - Password: (your chosen password)
5. Copy the new Auth user's UUID.
6. Run the profile INSERT shown at the bottom of `supabase/schema.sql`, replacing `AUTH_USER_UUID`.
7. Copy `.env.example` to `.env.local` and add your Supabase URL and anon key.

### Existing database

If you already ran the schema before, add the time column:

```sql
alter table public.transactions add column if not exists transaction_time time;
```

## Local run

```bash
npm install
npm run dev
```

## Cloudflare Workers deployment

This package uses the OpenNext Cloudflare adapter.

```bash
npm install
npm run preview
npm run deploy
```

For Cloudflare Workers Builds, set the two public Supabase environment variables in the project's Build Variables/Secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Cloudflare's current documentation supports the OpenNext adapter for existing Next.js projects. The included `wrangler.toml` and `open-next.config.ts` are already configured for it.

## Included

- Debit/Credit CRUD
- Dashboard totals
- Daily Coins
- Members
- Date-wise reports
- PDF export with members summary
- Mobile Apple/Bento UI
- Responsive desktop UI
- Supabase persistent storage
- Supabase Auth
- Row Level Security
- FlyBook branding
- PWA manifest
- Cloudflare Workers configuration
