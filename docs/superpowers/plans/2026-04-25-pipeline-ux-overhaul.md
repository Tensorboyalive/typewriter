# Pipeline UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Content Pipeline scannable and stateful — hide ready items, restore scroll/focus on return, color-code by status, and compact the row density — while preserving zero impact on existing Supabase data.

**Architecture:** One additive JSONB column on `user_settings` stores per-user UI preferences (cloud-synced). SessionStorage holds ephemeral per-tab scroll/returning-card state. New `src/lib/` modules isolate storage and color logic so `Kanban.tsx` stays readable. `Calendar.tsx` gets dot-prefixed pills for status parity.

**Tech Stack:** React 19, TypeScript, Tailwind v4 tokens via CSS custom properties, Supabase (Postgres), date-fns, lucide-react. No new runtime deps.

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/020_user_settings_ui_prefs.sql` | Create | Additive column: `user_settings.ui_prefs JSONB NOT NULL DEFAULT '{}'::jsonb` |
| `src/index.css` | Modify | Add `--status-*` CSS tokens (dark + light), `.row.returning` keyframes |
| `src/types.ts` | Modify | Add `UIPrefs`, `PipelinePrefs`, `STATUS_LABEL` map, extend `ProjectStatus` references |
| `src/lib/statusColors.ts` | Create | Pure helper: `status → { tokenVar, label, ariaLabel }` |
| `src/lib/uiPrefs.ts` | Create | Hand-rolled validator + defaults + immutable merge helpers |
| `src/lib/pipelineSession.ts` | Create | sessionStorage helpers with 30-min TTL, one-shot consume |
| `src/lib/usePipelineRestore.ts` | Create | React hook: restore scroll + glow, returns `glowId` and `snapshotBeforeNav` |
| `src/store.tsx` | Modify | Fetch `ui_prefs` on boot, debounced save, expose `uiPrefs` + `updatePipelinePrefs` |
| `src/components/Calendar.tsx` | Modify | Pill gets leading status dot, aria-label includes status |
| `src/components/Kanban.tsx` | Modify | Compact row, density toggle, hide-ready chip, filter logic, restoration wiring |

No existing file is renamed or deleted. The largest changed file (`Kanban.tsx`) stays under ~450 lines.

---

## Task 1 — Create Supabase migration

**Files:**
- Create: `supabase/migrations/020_user_settings_ui_prefs.sql`

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/020_user_settings_ui_prefs.sql`:

```sql
-- 020_user_settings_ui_prefs.sql
-- Purpose: persist per-user UI preferences (pipeline view mode, density,
--          hide-ready toggle, collapsed group state) across devices.
-- Safety: ADD COLUMN with NOT NULL DEFAULT is an online, metadata-only
--         operation in Postgres 11+. No existing rows are rewritten.
--         Existing RLS policy users_own_settings already covers this column.
--         Zero impact on projects/channels/notes/any other table.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS ui_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_settings.ui_prefs IS
  'Free-form UI preferences as JSON. Shape validated client-side. Example: { "pipeline": { "viewMode": "list", "rowDensity": "compact", "showReady": false, "collapsed": { "ideation:2026-04-30": true } } }';
```

- [ ] **Step 2: Apply via Supabase MCP to the live DB**

Use the Supabase MCP `apply_migration` tool on the live project to run this. Do NOT run other SQL. Verify the column exists afterward by listing `user_settings` columns.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/020_user_settings_ui_prefs.sql
git commit -m "feat(db): add user_settings.ui_prefs for UI preferences"
```

---

## Task 2 — Add status color CSS tokens and glow keyframes

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add tokens + keyframes**

Append to `src/index.css` (before the final `}` of `:root.dark` if the file uses that pattern; otherwise append at the bottom in a new `/* Status color system */` block):

```css
/* ─── Status color system ─────────────────────────────── */
:root {
  --status-idea:     oklch(60% 0.15 255);
  --status-scripted: oklch(70% 0.14 70);
  --status-edit:     oklch(65% 0.17 300);
  --status-ready:    oklch(65% 0.14 160);
  --status-posted:   oklch(55% 0.02 240);
}

.dark {
  --status-idea:     #7aa2ff;
  --status-scripted: #f5b851;
  --status-edit:     #c88cff;
  --status-ready:    #4fd19c;
  --status-posted:   #6b7681;
}

/* Compact row returning-card glow pulse.
   Compositor-friendly (shadow + border-color only). */
@keyframes pipeline-return-pulse {
  0%, 100% { box-shadow: 0 0 0 2px rgba(246, 138, 79, 0.22); }
  50%      { box-shadow: 0 0 0 6px rgba(246, 138, 79, 0.06); }
}

.pipeline-row--returning {
  animation: pipeline-return-pulse 700ms ease-out 2;
  border-color: rgba(246, 138, 79, 0.7) !important;
}

@media (prefers-reduced-motion: reduce) {
  .pipeline-row--returning { animation: none; }
}
```

- [ ] **Step 2: Build to verify no CSS parse errors**

Run: `./node_modules/.bin/vite build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(ui): add status color tokens and returning-card glow keyframes"
```

---

## Task 3 — Create statusColors.ts

**Files:**
- Create: `src/lib/statusColors.ts`

- [ ] **Step 1: Write the file**

Create `src/lib/statusColors.ts`:

```typescript
// Pure mapping: project status → visible label + CSS variable + accessibility label.
// Color is never the only signal — every consumer pairs the dot with a label.
import type { ProjectStatus } from '../types'

export interface StatusVisual {
  /** CSS custom property that holds the color. */
  tokenVar: string
  /** Short lowercase label shown next to dots. */
  label: string
  /** Descriptive aria-label for screen readers. */
  ariaLabel: string
}

export const STATUS_VISUAL: Record<ProjectStatus, StatusVisual> = {
  idea:      { tokenVar: 'var(--status-idea)',     label: 'idea',      ariaLabel: 'status: idea' },
  scripted:  { tokenVar: 'var(--status-scripted)', label: 'scripted',  ariaLabel: 'status: scripted' },
  in_edit:   { tokenVar: 'var(--status-edit)',     label: 'in edit',   ariaLabel: 'status: in edit' },
  ready:     { tokenVar: 'var(--status-ready)',    label: 'ready',     ariaLabel: 'status: ready' },
  posted:    { tokenVar: 'var(--status-posted)',   label: 'posted',    ariaLabel: 'status: posted' },
}

/** Convenience: ordered list for legends. */
export const STATUS_ORDER: ProjectStatus[] = ['idea', 'scripted', 'in_edit', 'ready', 'posted']
```

- [ ] **Step 2: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/statusColors.ts
git commit -m "feat(ui): add status-to-visual mapping helper"
```

---

## Task 4 — Create uiPrefs.ts

**Files:**
- Create: `src/lib/uiPrefs.ts`

- [ ] **Step 1: Write the file**

Create `src/lib/uiPrefs.ts`:

```typescript
// UI preferences persisted to user_settings.ui_prefs (JSONB).
// Hand-rolled validator: the project has no Zod dep, and adding one for four
// fields is YAGNI. Validator is forgiving — unknown keys are preserved,
// malformed fields are replaced with defaults.

export type ViewMode = 'list' | 'board'
export type RowDensity = 'compact' | 'comfortable'

export interface PipelinePrefs {
  viewMode: ViewMode
  rowDensity: RowDensity
  showReady: boolean
  /** Map of groupId → isCollapsed. groupIds are `stageId` or `stageId:dateKey`. */
  collapsed: Record<string, boolean>
}

export interface UIPrefs {
  pipeline: PipelinePrefs
}

export const DEFAULT_UI_PREFS: UIPrefs = {
  pipeline: {
    viewMode: 'list',
    rowDensity: 'compact',
    showReady: false,
    collapsed: {},
  },
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Safe, forgiving parse. Never throws. Falls back to defaults on any shape issue. */
export function parseUIPrefs(raw: unknown): UIPrefs {
  if (!isPlainObject(raw)) return DEFAULT_UI_PREFS

  const pipelineRaw = raw.pipeline
  const p = isPlainObject(pipelineRaw) ? pipelineRaw : {}

  const viewMode: ViewMode = p.viewMode === 'board' ? 'board' : 'list'
  const rowDensity: RowDensity = p.rowDensity === 'comfortable' ? 'comfortable' : 'compact'
  const showReady = typeof p.showReady === 'boolean' ? p.showReady : false

  let collapsed: Record<string, boolean> = {}
  if (isPlainObject(p.collapsed)) {
    for (const [k, v] of Object.entries(p.collapsed)) {
      if (typeof v === 'boolean') collapsed[k] = v
    }
  }

  return { pipeline: { viewMode, rowDensity, showReady, collapsed } }
}

/** Immutable patch to pipeline subtree. */
export function setPipelinePrefs(prev: UIPrefs, patch: Partial<PipelinePrefs>): UIPrefs {
  return {
    ...prev,
    pipeline: { ...prev.pipeline, ...patch },
  }
}

/** Immutable toggle of a specific collapse key. */
export function toggleCollapsed(prev: UIPrefs, groupId: string): UIPrefs {
  const current = prev.pipeline.collapsed[groupId] === true
  return setPipelinePrefs(prev, {
    collapsed: { ...prev.pipeline.collapsed, [groupId]: !current },
  })
}
```

- [ ] **Step 2: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/uiPrefs.ts
git commit -m "feat(ui): UIPrefs validator + immutable helpers"
```

---

## Task 5 — Create pipelineSession.ts

**Files:**
- Create: `src/lib/pipelineSession.ts`

- [ ] **Step 1: Write the file**

Create `src/lib/pipelineSession.ts`:

```typescript
// Ephemeral per-tab state for the pipeline — scroll position and last-opened
// card — so returning from a project detail page lands you where you left.
// sessionStorage is per-tab and cleared on browser close; this prevents cross-
// tab fights and cross-session staleness.

const KEY = 'typewriter.pipeline.session.v1'
const MAX_AGE_MS = 30 * 60 * 1000 // 30 minutes

export interface PipelineSession {
  scrollTop: number
  lastOpenedId: string | null
  savedAt: number
}

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    // Touch the API — may throw in private mode with quota 0.
    const test = '__tw_probe__'
    window.sessionStorage.setItem(test, '1')
    window.sessionStorage.removeItem(test)
    return window.sessionStorage
  } catch {
    return null
  }
}

export function saveSession(session: Omit<PipelineSession, 'savedAt'>): void {
  const storage = safeStorage()
  if (!storage) return
  try {
    const payload: PipelineSession = { ...session, savedAt: Date.now() }
    storage.setItem(KEY, JSON.stringify(payload))
  } catch {
    // quota / JSON issues — silently drop; restoration will just no-op.
  }
}

export function loadSession(): PipelineSession | null {
  const storage = safeStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' && parsed !== null &&
      typeof (parsed as PipelineSession).scrollTop === 'number' &&
      typeof (parsed as PipelineSession).savedAt === 'number'
    ) {
      const s = parsed as PipelineSession
      if (Date.now() - s.savedAt > MAX_AGE_MS) {
        storage.removeItem(KEY)
        return null
      }
      return s
    }
    return null
  } catch {
    return null
  }
}

export function clearSession(): void {
  const storage = safeStorage()
  if (!storage) return
  try { storage.removeItem(KEY) } catch { /* noop */ }
}
```

- [ ] **Step 2: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/pipelineSession.ts
git commit -m "feat(ui): sessionStorage helpers for pipeline scroll restoration"
```

---

## Task 6 — Extend types.ts

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Append the UIPrefs re-export and the status label map near the top of the file after existing status types**

Add at the top of `src/types.ts`, immediately after the existing `PIPELINE_STAGES` declaration (around line 29):

```typescript
// Re-export UIPrefs so components can import from the central types module.
export type { UIPrefs, PipelinePrefs, ViewMode, RowDensity } from './lib/uiPrefs'
```

- [ ] **Step 2: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): re-export UIPrefs types"
```

---

## Task 7 — Update store.tsx to load + save ui_prefs

**Files:**
- Modify: `src/store.tsx`

This is the largest store change. Be surgical.

- [ ] **Step 1: Read the file to find the right edit sites**

Run: `cat src/store.tsx | head -80` and search for:
- the `useStore` return shape (to add `uiPrefs`, `updatePipelinePrefs`)
- the initial `user_settings` fetch (to also read `ui_prefs`)
- the loading sequence (to hydrate `uiPrefs` state)

- [ ] **Step 2: Add imports at the top of the file**

```typescript
import { DEFAULT_UI_PREFS, parseUIPrefs, setPipelinePrefs, type UIPrefs, type PipelinePrefs } from './lib/uiPrefs'
```

- [ ] **Step 3: Add state + debounce ref inside the store provider**

Inside the `StoreProvider` function body, near the other `useState` calls:

```typescript
const [uiPrefs, setUIPrefs] = useState<UIPrefs>(DEFAULT_UI_PREFS)
const uiPrefsSaveTimer = useRef<number | null>(null)
```

(Make sure `useRef` is imported from `react`. Add it to the existing `react` import if not present.)

- [ ] **Step 4: Load ui_prefs after auth succeeds**

Find the `user_settings` fetch (search for `user_settings`). Extend the `.select(...)` to include `ui_prefs` if not already `*`. After the fetch, parse and set state:

```typescript
// After the existing fetch, before any setState for conversion_rate:
if (settings && 'ui_prefs' in settings) {
  setUIPrefs(parseUIPrefs(settings.ui_prefs))
}
```

If settings row doesn't exist yet, create it via an `upsert` with `ui_prefs: {}` so subsequent writes don't fail:

```typescript
if (!settings) {
  await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, ui_prefs: {} }, { onConflict: 'user_id' })
}
```

- [ ] **Step 5: Add updatePipelinePrefs with debounced save**

Inside the provider, define:

```typescript
const updatePipelinePrefs = useCallback((patch: Partial<PipelinePrefs>) => {
  setUIPrefs(prev => {
    const next = setPipelinePrefs(prev, patch)

    // Debounce the remote write by 500ms.
    if (uiPrefsSaveTimer.current) window.clearTimeout(uiPrefsSaveTimer.current)
    uiPrefsSaveTimer.current = window.setTimeout(() => {
      if (!user) return
      supabase
        .from('user_settings')
        .update({ ui_prefs: next, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.error('[ui_prefs] save failed', error)
        })
    }, 500)

    return next
  })
}, [user])
```

(Make sure `useCallback` is imported from react.)

- [ ] **Step 6: Expose in the context value**

Extend the existing context provider `value={{ ... }}` to include:

```typescript
uiPrefs,
updatePipelinePrefs,
```

And extend the `StoreContextValue` (or equivalent) interface to declare:

```typescript
uiPrefs: UIPrefs
updatePipelinePrefs: (patch: Partial<PipelinePrefs>) => void
```

- [ ] **Step 7: Typecheck + build**

```bash
./node_modules/.bin/tsc --noEmit -p tsconfig.app.json && ./node_modules/.bin/vite build
```

Expected: both pass.

- [ ] **Step 8: Commit**

```bash
git add src/store.tsx
git commit -m "feat(store): load/save ui_prefs with debounced remote write"
```

---

## Task 8 — Create usePipelineRestore hook

**Files:**
- Create: `src/lib/usePipelineRestore.ts`

- [ ] **Step 1: Write the file**

```typescript
import { useLayoutEffect, useRef, useState } from 'react'
import { loadSession, clearSession, saveSession } from './pipelineSession'

const GLOW_DURATION_MS = 1400

export function usePipelineRestore(): {
  glowId: string | null
  snapshotBeforeNav: (projectId: string) => void
} {
  const [glowId, setGlowId] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    const session = loadSession()
    if (!session) return

    // Restore scroll position synchronously before paint.
    if (session.scrollTop > 0) {
      window.scrollTo({ top: session.scrollTop, left: 0, behavior: 'instant' })
    }

    if (session.lastOpenedId) {
      setGlowId(session.lastOpenedId)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setGlowId(null), GLOW_DURATION_MS)
    }

    clearSession()

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  const snapshotBeforeNav = (projectId: string) => {
    saveSession({ scrollTop: window.scrollY, lastOpenedId: projectId })
  }

  return { glowId, snapshotBeforeNav }
}
```

- [ ] **Step 2: Typecheck**

```bash
./node_modules/.bin/tsc --noEmit -p tsconfig.app.json
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/usePipelineRestore.ts
git commit -m "feat(ui): usePipelineRestore hook for scroll + glow restoration"
```

---

## Task 9 — Update Calendar.tsx with status-dot pills

**Files:**
- Modify: `src/components/Calendar.tsx`

- [ ] **Step 1: Import STATUS_VISUAL**

Add near the existing imports:

```typescript
import { STATUS_VISUAL } from '../lib/statusColors'
```

- [ ] **Step 2: Replace the existing pill button markup**

Find the pill rendering inside `dayProjects.map(p => (...))` and replace with:

```tsx
const visual = STATUS_VISUAL[p.status]
return (
  <button
    key={p.id}
    onClick={e => {
      e.stopPropagation()
      navigate(`/projects/${p.id}`)
    }}
    aria-label={`${p.title} — ${visual.ariaLabel}`}
    className="flex items-center gap-1.5 w-full text-left text-[11px] px-1.5 py-0.5 rounded truncate font-medium hover:ring-1 hover:ring-blueprint transition-all bg-surface-hi border border-line text-ink"
    title={`${p.title} · ${visual.label}`}
  >
    <span
      aria-hidden="true"
      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
      style={{ backgroundColor: visual.tokenVar }}
    />
    <span className="truncate">{p.title}</span>
  </button>
)
```

- [ ] **Step 3: Also update the day-detail list markup at the bottom of Calendar.tsx**

Find the `getProjectsForDay(selectedDate).map(p => (...))` block and replace the colored dot there too:

```tsx
{getProjectsForDay(selectedDate).map(p => {
  const visual = STATUS_VISUAL[p.status]
  return (
    <button
      key={p.id}
      onClick={() => navigate(`/projects/${p.id}`)}
      className="w-full flex items-center gap-2 text-sm text-ink-secondary text-left px-2 py-1.5 rounded-md hover:bg-canvas border border-transparent hover:border-line transition-all"
    >
      <span
        aria-hidden="true"
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: visual.tokenVar }}
      />
      <span className="flex-1 truncate">{p.title}</span>
      <span className="text-[10px] uppercase tracking-wider text-ink-muted shrink-0">
        {visual.label}
      </span>
    </button>
  )
})}
```

- [ ] **Step 4: Typecheck + build**

```bash
./node_modules/.bin/tsc --noEmit -p tsconfig.app.json && ./node_modules/.bin/vite build
```

Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/Calendar.tsx
git commit -m "feat(calendar): status-dot pills using shared status color tokens"
```

---

## Task 10 — Kanban: compact row + density toggle

**Files:**
- Modify: `src/components/Kanban.tsx`

- [ ] **Step 1: Add imports**

Add to the existing import block:

```typescript
import { useStore } from '../store'
import { STATUS_VISUAL } from '../lib/statusColors'
import { Rows3, Rows2 } from 'lucide-react'   // add Rows3, Rows2 to existing lucide import
```

- [ ] **Step 2: Read uiPrefs from store**

Near the top of `Kanban()`:

```typescript
const { projects, addProject, activeChannel, uiPrefs, updatePipelinePrefs } = useStore()
const { viewMode, rowDensity, showReady, collapsed } = uiPrefs.pipeline
```

Remove the existing local state for `viewMode`, `collapsed`, and the `toggleGroup` helper. Replace with:

```typescript
const toggleGroup = (id: string) => {
  updatePipelinePrefs({
    collapsed: { ...collapsed, [id]: !collapsed[id] },
  })
}
```

- [ ] **Step 3: Add density toggle button in the header**

Find the header `flex items-center gap-2` that holds the List/Board toggle. Insert a density toggle before it:

```tsx
<div className="flex border border-line rounded-md overflow-hidden">
  <button
    onClick={() => updatePipelinePrefs({ rowDensity: 'compact' })}
    className={`p-2 text-sm transition-colors ${rowDensity === 'compact' ? 'bg-blueprint text-white' : 'text-ink-muted hover:bg-canvas'}`}
    title="Compact rows"
    aria-pressed={rowDensity === 'compact'}
  >
    <Rows3 size={16} />
  </button>
  <button
    onClick={() => updatePipelinePrefs({ rowDensity: 'comfortable' })}
    className={`p-2 text-sm transition-colors ${rowDensity === 'comfortable' ? 'bg-blueprint text-white' : 'text-ink-muted hover:bg-canvas'}`}
    title="Comfortable rows"
    aria-pressed={rowDensity === 'comfortable'}
  >
    <Rows2 size={16} />
  </button>
</div>
```

- [ ] **Step 4: Rewrite renderProjectCard to branch on density**

Replace the existing `renderProjectCard` with:

```tsx
const renderProjectCard = (project: typeof projects[0]) => {
  const platInfo = PLATFORMS.find(p => p.id === project.platform)
  const visual = STATUS_VISUAL[project.status]
  const isReady = project.status === 'ready'

  if (rowDensity === 'compact') {
    return (
      <button
        key={project.id}
        onClick={() => handleCardClick(project.id)}
        aria-label={`${project.title} — ${visual.ariaLabel}`}
        className={`pipeline-row w-full grid items-center gap-2.5 h-8 px-3 rounded-md border border-line bg-surface text-left hover:border-blueprint/40 transition-colors
          ${glowId === project.id ? 'pipeline-row--returning' : ''}
          ${showReady && isReady ? 'opacity-45' : ''}`}
        style={{ gridTemplateColumns: '10px minmax(0,1fr) auto auto auto auto' }}
      >
        <span
          aria-hidden="true"
          className="inline-block w-[7px] h-[7px] rounded-full shrink-0"
          style={{ backgroundColor: visual.tokenVar }}
        />
        <span className="text-[13px] text-ink font-medium truncate">{project.title}</span>
        {renderFormatTag(project.format)}
        {platInfo && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-medium"
            style={{ backgroundColor: platInfo.color + '18', color: platInfo.color }}
          >
            {platInfo.label}
          </span>
        )}
        <span className="text-[10px] text-ink-muted lowercase min-w-[56px] text-right tabular-nums">
          {visual.label}
        </span>
        <span className="text-[10px] text-ink-muted tabular-nums min-w-[44px] text-right">
          {project.scheduled_date ? new Date(project.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
        </span>
      </button>
    )
  }

  // Comfortable: keep existing layout but add dot prefix.
  return (
    <button
      key={project.id}
      onClick={() => handleCardClick(project.id)}
      aria-label={`${project.title} — ${visual.ariaLabel}`}
      className={`pipeline-row w-full card-hover stagger-in flex items-center gap-3 bg-surface border border-line rounded-md px-4 py-3 text-left group hover:border-blueprint/40
        ${glowId === project.id ? 'pipeline-row--returning' : ''}
        ${showReady && isReady ? 'opacity-45' : ''}`}
    >
      <span
        aria-hidden="true"
        className="inline-block w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: visual.tokenVar }}
      />
      <p className="flex-1 text-sm text-ink font-medium truncate">{project.title}</p>
      <div className="flex items-center gap-2 shrink-0">
        {renderFormatTag(project.format, 'md')}
        {platInfo && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{ backgroundColor: platInfo.color + '18', color: platInfo.color }}
          >
            {platInfo.label}
          </span>
        )}
        {project.scheduled_date && (
          <span className="text-[10px] text-ink-muted tabular-nums">
            {new Date(project.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        <span className="text-[10px] text-ink-muted lowercase min-w-[56px] text-right">
          {visual.label}
        </span>
      </div>
    </button>
  )
}
```

- [ ] **Step 5: Typecheck + build**

```bash
./node_modules/.bin/tsc --noEmit -p tsconfig.app.json && ./node_modules/.bin/vite build
```

Expected: both pass (some placeholders like `handleCardClick` and `glowId` defined in next tasks will error — if so, continue to Task 11+12 and retest at the end).

- [ ] **Step 6: Do NOT commit yet** — Tasks 10/11/12 modify the same file. Batch-commit at end of Task 12.

---

## Task 11 — Kanban: hide-ready chip + filtering

**Files:**
- Modify: `src/components/Kanban.tsx`

- [ ] **Step 1: Add filtered + ready-count derivations**

Inside `Kanban()`, replace `const filtered = projects` with:

```typescript
const readyCount = projects.filter(p => p.status === 'ready').length
const filtered = showReady ? projects : projects.filter(p => p.status !== 'ready')
```

- [ ] **Step 2: Add the chip row below the summary**

Right after the existing `stage-count summary` block (around the `mb-6 flex flex-wrap…` div), add:

```tsx
{readyCount > 0 && (
  <div className="mb-6 flex flex-wrap items-center gap-2">
    <button
      onClick={() => updatePipelinePrefs({ showReady: !showReady })}
      className={`text-[11px] inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-colors ${
        showReady
          ? 'border-blueprint/40 bg-blueprint-light/20 text-blueprint'
          : 'border-line text-ink-muted bg-surface hover:border-blueprint/40'
      }`}
      aria-pressed={!showReady}
      title={showReady ? 'Hide ready items' : 'Show ready items'}
    >
      {showReady
        ? <>Showing ready ({readyCount}) ✓</>
        : <>Ready hidden ({readyCount})</>}
    </button>
  </div>
)}
```

- [ ] **Step 3: Confirm the stage summary reflects the filter**

The existing `stageSummary` reads `projects.filter(p => stage.statuses.includes(p.status))` — leave that as-is (it should show real stage counts). But add a small adjacent note when ready is hidden. Find the `stageSummary.map` render and wrap it:

```tsx
{stageSummary.map((s, i) => (
  <span key={s.label} className="flex items-center gap-3">
    <span><span className="text-ink font-medium tabular-nums">{s.count}</span> {s.label}</span>
    {i < stageSummary.length - 1 && <span className="text-line">·</span>}
  </span>
))}
{!showReady && readyCount > 0 && (
  <span className="text-ink-muted">· <span className="tabular-nums">{readyCount}</span> ready hidden</span>
)}
```

- [ ] **Step 4: Do not commit — continuing in next task**

---

## Task 12 — Kanban: scroll restoration wiring

**Files:**
- Modify: `src/components/Kanban.tsx`

- [ ] **Step 1: Import the hook**

```typescript
import { usePipelineRestore } from '../lib/usePipelineRestore'
```

- [ ] **Step 2: Call the hook at the top of Kanban()**

```typescript
const { glowId, snapshotBeforeNav } = usePipelineRestore()
```

- [ ] **Step 3: Add the handleCardClick helper**

Just before `renderProjectCard`:

```typescript
const handleCardClick = (projectId: string) => {
  snapshotBeforeNav(projectId)
  navigate(`/projects/${projectId}`)
}
```

- [ ] **Step 4: Also call snapshotBeforeNav in the "Create & Open" path**

Inside `handleAdd`, replace the final `if (project) navigate(\`/projects/${project.id}\`)` with:

```typescript
if (project) {
  snapshotBeforeNav(project.id)
  navigate(`/projects/${project.id}`)
}
```

- [ ] **Step 5: Typecheck + build**

```bash
./node_modules/.bin/tsc --noEmit -p tsconfig.app.json && ./node_modules/.bin/vite build
```

Expected: both pass.

- [ ] **Step 6: Lint**

```bash
./node_modules/.bin/eslint src/components/Kanban.tsx src/components/Calendar.tsx src/lib/
```

Expected: no errors.

- [ ] **Step 7: Commit Kanban batch (Tasks 10-12)**

```bash
git add src/components/Kanban.tsx
git commit -m "feat(pipeline): compact row, density toggle, hide-ready chip, scroll restoration"
```

---

## Task 13 — Manual QA pass

**Files:** none — verification only.

- [ ] **Step 1: Start the dev server**

Use the Claude Preview MCP `preview_start` with name `typewriter`. Load in browser.

- [ ] **Step 2: Sign in and navigate to `/projects`**

You'll need the real `.env.local` (user's Supabase creds) for this. If only placeholders are available, skip QA and ship to Vercel preview for real-data testing.

- [ ] **Step 3: QA checklist**

Run through the spec's QA checklist (copy here):

- [ ] Compact row renders at 32px
- [ ] Status dot visible + correct color for each of 5 statuses
- [ ] Aria-label present on the dot container (`status: scripted`)
- [ ] Calendar pill shows leading dot in matching color
- [ ] Toggle "Show ready" reveals/hides correctly; count updates
- [ ] Chip label flips: "Ready hidden (N)" ↔ "Showing ready (N) ✓"
- [ ] Open project → browser back → land at correct scroll, correct card glows ~1.4s
- [ ] Glow fades and does not reappear on subsequent nav
- [ ] Collapse "Ideation" date group → reload browser → still collapsed
- [ ] Change density → sign out + sign in → still compact
- [ ] Reduced-motion enabled → no glow pulse (check macOS Reduce Motion)
- [ ] Dark + light theme both render all 5 status colors without looking broken

- [ ] **Step 4: If any fail, fix inline; re-run typecheck + build; commit the fix.**

---

## Task 14 — Push to feature branch and ship

**Files:** none — git/push.

- [ ] **Step 1: Confirm current branch**

```bash
git branch --show-current
```

Expected: `feat/pipeline-ux-overhaul`

- [ ] **Step 2: Summarize changes**

```bash
git log --oneline main..HEAD
git diff --stat main..HEAD
```

- [ ] **Step 3: Ask the user**

Before pushing or merging, ask: "Push this branch for Vercel preview, or merge straight to main (like last time)?" Use AskUserQuestion.

- [ ] **Step 4: Based on answer:**

If "push branch":
```bash
git push -u origin feat/pipeline-ux-overhaul
```
Then offer to open PR via `gh pr create`.

If "merge to main":
```bash
git checkout main
git merge --ff-only feat/pipeline-ux-overhaul
git push origin main
```

- [ ] **Step 5: Remind user**

Remind user to rotate the GitHub PAT they shared in chat earlier.

---

## Rollback

If anything goes wrong after ship:

1. `git revert <merge-commit>` on main and push.
2. To drop the DB column too:
   ```sql
   ALTER TABLE user_settings DROP COLUMN IF EXISTS ui_prefs;
   ```
   Only affects UI state; no content data is lost.

---

## Self-review notes

**Spec coverage:**
- Status color system — Tasks 2, 3, 9, 10 ✓
- Hide-ready — Task 11 ✓
- Scroll/state restoration — Tasks 5, 8, 12 ✓
- Compact row density — Task 10 ✓
- Cloud sync preferences — Tasks 1, 6, 7 ✓
- Calendar parity — Task 9 ✓

**Placeholder scan:** No TBD/TODO text; every step has concrete commands or code.

**Type consistency:** `PipelinePrefs`, `UIPrefs`, `STATUS_VISUAL` names used consistently across tasks. `handleCardClick` defined in Task 12 before it is referenced in the final committed state (Task 10's code references it, but we defer commit until Task 12 per the plan).

**One known inter-task dependency:** Task 10 compiles clean only after Task 12 is in place. The plan explicitly notes "do not commit yet" on Task 10 and batches commit at end of Task 12.
