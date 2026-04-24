# Pipeline UX Overhaul — Design

**Date:** 2026-04-25
**Status:** Draft — awaiting user approval
**Scope:** `src/components/Kanban.tsx`, `src/components/Calendar.tsx`, `src/store.tsx`, one additive Supabase migration, a few new `src/lib/` modules.
**Non-goals:** drag-reorder, keyboard shortcuts, saved views, per-project color overrides.

## Context

The Pipeline (List view) currently renders projects grouped by stage and (as of 2026-04-24) by scheduled date inside each stage. With 21 items in Ideation alone, usability has four concrete failures:

1. **Lost place on return.** Opening a project and returning scrolls back to the top.
2. **"Ready" clutter.** Items marked *ready* still occupy pipeline + calendar real estate the user has stopped needing.
3. **No visual status signal.** All project rows and calendar pills render in the same blueprint-light / blueprint color regardless of stage.
4. **Density overwhelm.** 21+ rows per stage, all ~44px tall, make scanning slow.

The team uses shared cloud data in Supabase. Any change that touches existing data is unacceptable. This design uses **only additive** backend changes: one new JSONB column on the existing `user_settings` table with a safe default.

## Decisions captured during brainstorming

| Decision                     | Choice                                              |
| ---------------------------- | --------------------------------------------------- |
| Ready-state behavior         | **A — Hide by default + toggle chip**               |
| Restoration depth            | **Scroll + expanded groups + returning-card glow**  |
| Status color system          | **Status dot + muted text label** (paired, not color-only) |
| Density default              | **Compact rows (32px) + comfortable toggle**        |
| Preference persistence       | **Cloud (Supabase `user_settings.ui_prefs` JSONB)** |
| Ephemeral state persistence  | **sessionStorage (per-tab)**                        |

## Architecture

### Storage split

**Cloud-synced preferences** — live in a new JSONB column `user_settings.ui_prefs`. Loaded once on login, updated with a 500ms debounce on change, synced across a user's devices:

```jsonc
{
  "pipeline": {
    "viewMode": "list" | "board",
    "rowDensity": "compact" | "comfortable",
    "showReady": false,
    "collapsed": { "ideation": false, "ideation:2026-04-30": true, ... }
  }
}
```

**Session state** — per-tab sessionStorage under key `typewriter.pipeline.session.v1`. Cleared on browser close, on tab close, and one-shot on successful restore:

```ts
interface PipelineSession {
  scrollTop: number
  lastOpenedId: string | null
  savedAt: number        // epoch ms; expire entries older than 30 min
}
```

### Rationale for the split

Preferences travel with the user across devices. Scroll position does not — it's tab-scoped navigation memory. Syncing scroll across devices would feel broken ("I was at April 14 on my phone, why is my laptop there?").

### Migration

File: `supabase/migrations/020_user_settings_ui_prefs.sql`

```sql
-- Additive: new JSONB column on existing user_settings with safe default.
-- Online operation (Postgres 11+). Existing RLS policy users_own_settings
-- already covers this column. Zero impact on any other table or query.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS ui_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;
```

**Safety guarantees**:
- No `ALTER` on `projects`, `channels`, `notes`, or any table holding content.
- `ADD COLUMN ... NOT NULL DEFAULT` is non-blocking in Postgres 11+.
- Existing queries that don't reference `ui_prefs` are byte-identical.
- Rollback: `ALTER TABLE user_settings DROP COLUMN ui_prefs;` — no data besides UI state is affected.

## Module layout

| File                                 | Role                                                        |
| ------------------------------------ | ----------------------------------------------------------- |
| `supabase/migrations/020_*.sql`      | Additive column migration                                   |
| `src/types.ts`                       | `UIPrefs` interface, `STATUS_COLORS` map                    |
| `src/lib/uiPrefs.ts`                 | Zod schema, defaults, type-safe merge helpers               |
| `src/lib/statusColors.ts`            | Status → `{ token, label, ariaLabel }` mapping              |
| `src/lib/pipelineSession.ts`         | sessionStorage helpers (save / load / clear, TTL)           |
| `src/store.tsx`                      | Load `ui_prefs` on boot, debounced write-back on change     |
| `src/components/Kanban.tsx`          | Compact rows, hide-ready chip, scroll/state restoration     |
| `src/components/Calendar.tsx`        | Status-dot pill markup                                       |
| `src/index.css`                      | `--status-*` tokens, row density CSS, glow keyframes        |

No existing file is renamed. No file exceeds the project's ~400-line norm after edits.

## Component specs

### Status color system

Tokens (added to `:root` and `:root.dark`):

```css
:root {
  --status-idea:     oklch(72% 0.12 255);
  --status-scripted: oklch(78% 0.14 70);
  --status-edit:     oklch(75% 0.17 300);
  --status-ready:    oklch(78% 0.14 160);
  --status-posted:   oklch(58% 0.02 240);
}
:root.dark {
  --status-idea:     #7aa2ff;
  --status-scripted: #f5b851;
  --status-edit:     #c88cff;
  --status-ready:    #4fd19c;
  --status-posted:   #6b7681;
}
```

**UX rule enforced:** color alone never conveys state. Every appearance of the dot pairs with:
- pipeline row → visible lowercase label (`idea`, `scripted`, `in edit`, `ready`, `posted`)
- calendar pill → the project title text + dot carries `aria-label="status: scripted"`

Contrast check (dark surface `#121a22` background, WCAG 3:1 non-text for the dot): all five tokens ≥3.9:1.

### Compact pipeline row (32px)

```
┌──────────────────────────────────────────────────────────────┐
│ •  The trade                       [Reel] [TB]  idea  May 2 │
└──────────────────────────────────────────────────────────────┘
```

- CSS grid columns: `10px 1fr auto auto auto`
- Title: 13px / 1.4 line-height / single line / ellipsis.
- Status label: 10px lowercase, `min-width: 56px` + `text-align: right` so the date rail stays aligned (tabular-nums rule).
- Hover: border shifts to `blueprint/40` — no layout shift.
- Returning-card glow: `.returning` class → 2 × 600ms shadow pulse, auto-removed after 1.4s.

**Comfortable row** (existing markup, ~44px) is preserved unchanged for users who prefer it.

### Hide-ready mechanism

Default `ui_prefs.pipeline.showReady = false`.

- Chip in filter row: label toggles between `Ready hidden (N) ✓` and `Show ready (N)`.
- When `showReady === false`, the filter `.filter(p => p.status !== 'ready')` is applied *before* the stage / date grouping. Counts, empty-state checks, and stage-summary numbers use the filtered list.
- When `showReady === true`, ready rows render inside their normal stage/date group with `.row.muted` class (`opacity: 0.45` on title + dot).
- Empty state for "no ideas/in-process after filter": existing empty-state message plus a passive hint *"(4 ready hidden — [Show ready])"*.
- Calendar is **unaffected**: scheduling context requires ready visibility.

### Density toggle

- Header control next to existing List/Board buttons.
- Two icons: `Rows3` (compact) / `Rows2` (comfortable).
- Selection writes `ui_prefs.pipeline.rowDensity`.
- Default: `compact`.

### Scroll / state restoration

`usePipelineRestore()` custom hook, used only from `Kanban.tsx`:

```ts
export function usePipelineRestore(): {
  glowId: string | null
  snapshotBeforeNav: (projectId: string) => void
}
```

On mount (`useLayoutEffect` for paint-free scroll):
1. Read `PipelineSession` from sessionStorage.
2. If present AND `Date.now() - savedAt < 30 * 60_000`:
   - `window.scrollTo({ top: session.scrollTop, left: 0, behavior: 'instant' })`
   - set `glowId = session.lastOpenedId`
   - clear session (one-shot consumption)
   - set a 1400ms timer to clear `glowId`
3. Otherwise do nothing (fresh nav).

`snapshotBeforeNav(id)` writes the current `window.scrollY` + id into sessionStorage, then the caller navigates.

Collapsed-group state comes from `ui_prefs.pipeline.collapsed` via the store — already persistent, so it "restores" automatically because it never resets.

### Calendar parity

Pill markup in `Calendar.tsx`:

```tsx
<button … aria-label={`${p.title}, ${STATUS_LABEL[p.status]}`}>
  <span className={`status-dot status-dot--${p.status}`} aria-hidden="true" />
  <span className="pill-title">{p.title}</span>
</button>
```

- Pill background stays neutral (`bg-surface-hi`) for title readability on colored-tint day cells.
- The 5px dot visually separates stages at a glance (May 3 → `• ready`, `• idea`, `• scripted`).
- Ready pills always visible in calendar regardless of `showReady` — this is intentional (calendar's purpose is scheduling visibility, not focus filtering).

## Data flow

```
login →  fetch user_settings (existing query, now returns ui_prefs)
       → parse via Zod, merge with defaults, into store.uiPrefs
       → components read from store.uiPrefs

user toggles showReady / density / collapses group
       → optimistic local state update
       → debounced (500ms) PATCH to user_settings.ui_prefs
       → error → toast, revert

user clicks project card
       → snapshotBeforeNav(project.id)   (sessionStorage write, sync)
       → navigate(`/projects/${id}`)

user goes back (browser back OR app back button)
       → Kanban mounts
       → useLayoutEffect restores scroll + sets glowId
       → sessionStorage cleared
```

## Error handling

- **Corrupt `ui_prefs` JSON:** Zod `safeParse` → fall back to defaults silently, log to console in dev only.
- **Failed save to Supabase:** existing global `onunhandledrejection` toast surfaces the error. Local state stays — user keeps their toggle state for the session.
- **sessionStorage quota / disabled:** wrap access in try/catch; on failure, skip restoration gracefully (no crash). User just lands at top as they do today.
- **Stale `lastOpenedId`** (project deleted while open): glow target isn't found in the DOM → no-op. Never crash.

## Testing

Unit tests (Vitest — add if not present):
- `uiPrefs.ts` — Zod parse / merge / default fallback
- `pipelineSession.ts` — save/load/clear, TTL expiry
- `statusColors.ts` — every status maps to a non-empty token and label

Manual QA checklist:
- [ ] Compact row at 32px, title ellipsis works
- [ ] Status dot visible + correct color for each of 5 statuses
- [ ] Dot has aria-label ("status: scripted")
- [ ] Calendar pill shows leading dot in matching color
- [ ] Toggle "Show ready" reveals/hides correctly; count updates
- [ ] Open project → back → land at correct scroll position, correct card glows
- [ ] Glow fades within ~1.5s
- [ ] Collapse "Ideation" → reload page → still collapsed (cloud persistence)
- [ ] Change density → switch browser → still compact (cloud persistence)
- [ ] Reduced-motion OS setting disables the glow pulse
- [ ] Dark + light theme both render all 5 status colors with ≥3:1 contrast on dots, ≥4.5:1 on text labels

## Performance budget

- No new dependencies.
- Debounced preference write: ≤1 write per 500ms regardless of user input velocity.
- Row render cost unchanged (same React tree shape).
- Glow animation on `box-shadow` + `border-color` only → compositor-friendly.

## Rollout order (for the implementation plan)

1. SQL migration (ship first, doesn't break anything before app knows about it).
2. Types, Zod schema, lib modules.
3. Store integration (load/save `ui_prefs`).
4. Status color tokens in CSS.
5. Calendar pill dot.
6. Pipeline compact row + density toggle.
7. Hide-ready chip + filtering.
8. Scroll/state restoration.
9. QA pass.

Each step independently lands green (typecheck + build). No step requires a later step to compile.

## Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Migration applied, but older clients don't send `ui_prefs` → `null` crash | Column is `NOT NULL DEFAULT '{}'`; older clients never touch it and existing rows already get `{}`. |
| Team members share a user_id → they overwrite each other's prefs | Debounced writes minimize churn. Last-write-wins is acceptable for *preferences* (no content loss). Explicit note in README. |
| Scroll restoration hijacks a different navigation (deep link, new tab) | Session record has a 30-min TTL **and** is one-shot. Arriving via sidebar click clears it. |
| Status color adds sensory load instead of reducing it | Color is secondary — text label is primary. Monochrome fallback works because we keep labels. |

## Open items for implementation plan

- Vitest setup if not already present.
- Dev-mode `console.error` for corrupt `ui_prefs` (not prod).
- Decide whether to gate the redesign behind a feature flag (answer: no — single additive migration, low-risk UI swap; can revert via git).
