# Deployment

Typewriter ships as a static Vite build on **Vercel**, backed by **Supabase**.

---

## Vercel

### Initial setup

1. Import the repo on [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Vite**. Build command: `pnpm build`. Output dir: `dist`.
3. Add environment variables (see below).
4. Deploy.

### Environment variables

| Name | Where from | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project settings → API | Public, ships in bundle |
| `VITE_SUPABASE_ANON_KEY` | Supabase project settings → API | Public, RLS-protected |
| `VITE_ADMIN_PASSCODE` | You pick it | 4 digits; don't commit to git |

All three are `VITE_`-prefixed → baked into the client bundle. None are secret
in the "keep it off GitHub" sense, but the anon key is still RLS-gated and the
passcode is still a friction layer against casual access.

### `vercel.json`

Owns headers and the CSP. Key knobs:

- `Permissions-Policy: autoplay=*` — required for the YouTube music iframe.
- `frame-src` allows `youtube-nocookie.com` — don't revert to `'none'` or music dies.
- No `X-Frame-Options: DENY` — same reason.
- HSTS, X-Content-Type-Options, Referrer-Policy are all on.

### Deploys

Push to `main` → Vercel auto-builds and deploys. PRs get preview deploys.

---

## Supabase

### Initial setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy URL + anon key into Vercel env vars.
3. Run migrations in order (see [DATABASE.md](./DATABASE.md)).
4. In **Auth → Providers**, enable email/password. Disable signups if you want a closed app.
5. Seed the owner profile manually (or let `auto_create_profile` do it on first sign-in).

### Auth flow

- Sign-up is disabled in the UI. Accounts are created by Supabase admin.
- On first sign-in, `auto_create_profile` trigger inserts a `profiles` row.
- `AdminLock` gates sensitive routes on client-side passcode — RLS gates mutations.

### Backups

Supabase runs daily backups on the Pro tier. For extra safety, `Settings →
Export all data` writes a JSON dump of every user-owned table.

---

## Troubleshooting

### "Couldn't save" toasts everywhere

Almost always RLS. Check the failing table has a policy that matches
`auth.uid() = user_id` and the row being inserted has the correct `user_id`.

### Music won't play

CSP regression. Verify `vercel.json` still has `frame-src
'self' https://www.youtube-nocookie.com https://www.youtube.com;` and no
`X-Frame-Options: DENY`.

### Build fails with TS errors about a missing column

You're ahead of the database. Run the latest migration before rebuilding.

### Streak flame is gone

Component renders `null` when there's no activity. That's intentional — it
only appears once you've got at least one real-session day on record.
