# Micro-interactions

The motion system that makes Typewriter feel alive without being flashy.
Every animation is opt-in, compositor-friendly, and gated by
`prefers-reduced-motion`.

---

## Principles

1. **Natural, not flashy.** Interactions clarify what's happening; they never
   demand attention.
2. **Ease-out-expo everywhere.** One curve — `cubic-bezier(0.16, 1, 0.3, 1)`.
   Snaps in fast, settles quietly.
3. **Transform + opacity only.** Never animate layout (width, top, margin).
4. **Respect the user.** `prefers-reduced-motion` collapses everything to
   `0.01ms` — no jank, no skipped states.
5. **Opt-in classes.** Nothing is invasively wired — you add a class where
   you want the behavior. Rip it out and nothing breaks.

---

## Tokens (`src/index.css`)

```css
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--dur-fast: 120ms;
--dur-base: 180ms;
--dur-slow: 280ms;
```

Use these anywhere you'd otherwise type an easing or duration. One curve,
three durations — pick the one that fits the affordance.

---

## Utility classes

| Class | What it does | Where applied |
|---|---|---|
| `.card-hover` | 2px lift + subtle shadow on hover | Saved notes, Kanban cards, Today blocks, Dashboard tiles, Checklist items |
| `.stagger-in` | Fade + rise on mount, delayed by index (via `useStagger` hook) | Same surfaces as card-hover |
| `.chev-toggle` | Smooth rotation transition for disclosure chevrons | ChannelSwitcher, Today's "Unscheduled" drawer |
| `.sheet-in` | Scale + fade from 97% on mount | Today modals, time blocks |
| `.toast-in` | Slide from corner | Toast queue |
| `.tick-pop` | Gentle 1.15× scale then settle | Checklist items flipping to done |
| `.flame-breath` | Slow 4s pulse | Streak flame in Layout |
| `.shake-x` | Brief horizontal shake | Invalid drops (reserved for future) |
| `.nav-item.is-active` | Left accent bar | Active nav link |
| `.route-fade` | Crossfade on route change | Outlet wrapper in Layout |

---

## Global behaviors

- **Button press.** Every `<button>` gets `:active { transform: scale(0.985) }`
  globally. No classes needed.
- **Focus indication.** Intentionally quiet. We do **not** ship a global
  orange halo — that version rendered as a hard box around empty inputs.
  Instead, styled inputs (e.g. `.input:focus`) shift their `border-color` from
  `--color-line` to `--color-ink-muted`, and bare/unstyled form fields fall
  back to the browser's native `:focus-visible` outline. Keyboard users still
  get feedback; the UI never turns orange on idle focus.
- **Cursor affordances.** Draggable items use `cursor-grab` + `active:cursor-grabbing`.

---

## Hooks

### `useStagger(index: number)`

Returns an inline style with `animationDelay = Math.min(index, 9) * 30 + 'ms'`.
Used on list items so the first ~10 cascade in, then the rest land instantly.
Capping prevents noticeable delays on long lists.

### `Ticker` component

rAF-based number animator. Interpolates from previous to new value using
`ease-out-expo` over `durationMs` (default 320). Respects
`prefers-reduced-motion` by snapping. Used on Dashboard stats.

---

## Reduced motion

The global block in `src/index.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Cheaper and safer than per-component guards. Hooks that schedule animation
work (`Ticker`) check `matchMedia` explicitly and snap to the target value.

---

## Adding a new interaction

Before reaching for a library or writing a keyframe:

1. Can it be a `transform` + `opacity` transition on an existing element? Use
   the token (`transition: transform var(--dur-base) var(--ease-out-expo)`).
2. Is it a recurring pattern? Add a utility class to `index.css` — don't
   inline it in a component.
3. Does it involve layout? Stop. Find a compositor-friendly alternative.
4. Does the user expect it? Probably not. Does the absence feel wrong?
   Probably yes. That's the bar.
