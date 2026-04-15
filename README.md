# Typewriter

A multi-channel content-ops dashboard for one person running many voices.
Built by [Manu Gupta](https://github.com/Tensorboyalive) for `tensorboy`, `tmg`,
`savvy`, and `data` — two admins, one login, four personas.

Stack: **React 19 · TypeScript · Vite · Tailwind v4 · Supabase · Vercel**.

---

## What it does

- **Content pipeline** — Kanban + Calendar for reels, carousels, text posts, across all four channels.
- **Scripts & notes** — a fast editor with autosave, per-note pins, channel-scoped filtering.
- **Today** — time-blocked planner, MIT picker, drag-to-reschedule.
- **Checklist** — recurring daily templates, per-category grouping, skip reasons.
- **Finances** — expenses, income, conversion-rate tracking, export.
- **Editor outputs** — per-day record of what was shipped and by whom.
- **Music** — embedded YouTube radios (Manu's mixes + ambient streams) with a single hotkey (`M`).
- **Streaks** — a quiet flame tracking 36h-grace consecutive activity, per persona.
- **Admin lock** — 4-digit passcode wall for sensitive surfaces (finances, settings, deals).

---

## Quickstart

```bash
pnpm install         # or npm / yarn
cp .env.example .env # fill in Supabase URL + anon key + admin passcode
pnpm dev             # http://localhost:5173
```

Required env vars (see `.env.example`):

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_ADMIN_PASSCODE` | 4-digit passcode for admin-locked routes |

---

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server with HMR |
| `pnpm build` | `tsc -b && vite build` — type-checks then bundles to `dist/` |
| `pnpm lint` | ESLint across `src/` |
| `pnpm preview` | Serve the production build locally |

---

## Project layout

```
src/
├── components/      # UI, organized by surface (Dashboard, Today, Kanban, ...)
├── lib/             # Pure utilities (streaks, toast, stations, theme hooks)
├── store.tsx        # Zustand-style global store wrapping Supabase
├── types.ts         # Shared domain types
├── index.css        # Design tokens + motion system (see docs/MICRO-INTERACTIONS.md)
└── App.tsx          # Route tree + global providers (Toast, FetchErrorBanner)

supabase/
├── config.toml
└── migrations/      # Ordered SQL migrations (001 → 018)

docs/
├── ARCHITECTURE.md  # How the pieces fit together
├── DATABASE.md      # Schema + RLS overview
├── DEPLOY.md        # Vercel + Supabase deployment notes
├── MICRO-INTERACTIONS.md  # Motion tokens, utility classes, principles
└── plans/           # Design docs for shipped work
```

---

## Further reading

- [Architecture overview](./docs/ARCHITECTURE.md) — routing, data flow, store layout
- [Database & migrations](./docs/DATABASE.md) — tables, RLS, how to add a migration
- [Deployment](./docs/DEPLOY.md) — Vercel config, Supabase setup, env vars
- [Micro-interactions](./docs/MICRO-INTERACTIONS.md) — the motion system

---

## License

Private. All rights reserved © Manu Gupta.
