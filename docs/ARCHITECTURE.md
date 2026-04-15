# Architecture

Typewriter is a single-page React app talking directly to Supabase. No backend
of our own — the browser is the client, Supabase is the server, Vercel is the
CDN. Everything below is in service of keeping that stack honest.

---

## Data flow

```
User gesture
   └─> component handler
       └─> store mutation (src/store.tsx)
           ├─> Supabase call (.insert/.update/.delete/.select)
           └─> local state update (optimistic where safe)
                 └─> React re-renders
                       └─> UI reflects new state

If the Supabase call throws → store rethrows → global window.onunhandledrejection
   catcher → toast queue → user sees "Couldn't save: <reason>"
```

Silent failures are banned. Every mutation in `store.tsx` throws on error, and
deletes roll back optimistic updates before rethrowing.

---

## Store (`src/store.tsx`)

One context + hook exposed as `useStore()`. Owns:

- `user`, `profile` — Supabase auth state
- `channels`, `activeChannelId`, `projects` — per-channel content pipeline
- `allProjects`, `allSessions` — cross-channel aggregates for Dashboard
- `notes`, `checklistItems`, `checklistTemplates`
- `expenses`, `income`, `conversionRate` — finances
- `timeBlocks`, `mit` — Today planner
- `editorOutputs` — daily ship log
- `deals` — brand deals (admin-locked)

Mutations are async and throw. Fetchers set loading flags and also throw.
**Never silently swallow — always surface via throw.**

---

## Routing (`src/App.tsx`)

Top-level routes:

| Path | Component | Purpose |
|---|---|---|
| `/` | Dashboard | Per-channel overview, bento stats, streak |
| `/pipeline` | Kanban | Content cards by status, with format tags |
| `/today` | Today | Time-blocked day planner, MIT, drag to reschedule |
| `/calendar` | Calendar | Month view of scheduled content |
| `/saved` · `/saved/:id` | Saved · NoteEditor | Note list + editor |
| `/scripts/:id` | ScriptEditor | Per-project script draft |
| `/checklist` | Checklist | Daily recurring tasks |
| `/expenses` | Expenses (admin) | Finance tracking |
| `/editor-output` | EditorOutput | Daily ship log |
| `/settings` | Settings (admin) | Profile, channels, templates |

Admin-locked routes are wrapped in `<AdminLock>` which gates on `VITE_ADMIN_PASSCODE`.

---

## Personas / channels

Four channels share one Supabase user. `activeChannelId` in the store scopes
most reads — Kanban, Calendar, scripts. Dashboard and streaks aggregate across
all four. Switching personas never writes — it's purely a UI filter.

---

## Error surface

Three layers:

1. **Toast queue** (`src/lib/toast.tsx`) — 6s auto-dismiss, corner-anchored. For mutation failures.
2. **FetchErrorBanner** — top-of-page Retry button when initial fetch fails.
3. **Global `window.onunhandledrejection`** — catches anything that escapes (wired in `App.tsx`).

---

## Motion system

See [MICRO-INTERACTIONS.md](./MICRO-INTERACTIONS.md). TL;DR: tokens in
`src/index.css`, opt-in utility classes (`card-hover`, `stagger-in`,
`chev-toggle`, `sheet-in`, `tick-pop`, `flame-breath`), all gated by
`prefers-reduced-motion`.

---

## Why no framework

- No Next.js — we don't need SSR. The whole app is private and auth-gated.
- No Redux — Zustand-lite pattern in one file is enough for ~20 entities.
- No TanStack Query — Supabase realtime + a single fetch-on-mount covers it.
- No component library — everything is Tailwind v4 on hand-rolled primitives.

Keep the stack boring. Ship the product.
