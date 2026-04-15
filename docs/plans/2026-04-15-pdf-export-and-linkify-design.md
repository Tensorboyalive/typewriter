# PDF export + auto-linkify writing surfaces

**Date:** 2026-04-15
**Status:** Approved — ready for implementation

## Intent

Two user-facing changes to the content pipeline, applied across every long-form
writing surface:

1. **Download as PDF** on the script editor so the user can share a script with
   their editor on the go (typically via WhatsApp after saving to Downloads).
2. **Auto-clickable URLs** inside the writing surfaces — any pasted link should
   become an orange, clickable hyperlink.

## Scope

Writing surfaces affected:

- `ScriptEditor` — project scripts. PDF + linkify.
- `NoteEditor` — saved notes. PDF + linkify.
- `EditorOutput` — daily ship-log description. Linkify only (short field — PDF
  not justified).

Explicitly out of scope: ultra-short free-text like time-block labels, project
titles, or note titles. Linkify adds noise more than value there.

## Architecture

Two new pure utility modules + one shared display component. No library
additions beyond `jspdf`, which is lazy-loaded so the bundle only grows for
users who press the Download PDF button.

```
src/lib/
  linkify.ts         — URL regex + tokenizer; pure, no deps, no DOM
  exportPdf.ts       — dynamic-import wrapper around jsPDF
src/components/
  LinkifiedText.tsx  — renders a string with URL runs as <a> (orange)
```

## Data flow

Storage is unchanged. `project.script`, `note.content`, and
`editor_output.description` remain plain strings in Postgres. No migration.

- **Edit mode** (default): existing `<textarea>` bound to the store field.
- **Read mode**: `<LinkifiedText>` renders the same string with URL runs
  replaced by anchors.
- **PDF export**: `linkify()` runs inside `exportPdf()` and each URL is drawn
  via `doc.textWithLink()` so hyperlinks are clickable in the PDF itself.

`linkify()` is deterministic and idempotent — running it on already-rendered
text is a no-op.

## Linkify rules

**Regex:** `/(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/g`

- Matches `http`/`https` URLs and `www.`-prefixed URLs.
- Deliberately excludes bare-domain matching (`foo.com` in prose) — too many
  false positives in casual writing.

**Trailing-punctuation strip:** `. , ) ] ! ? : ;` are trimmed off the end of
the match so `https://foo.com.` doesn't break into "link with dot".

**Anchor attributes:** `target="_blank"` + `rel="noopener noreferrer"` (prevents
reverse-tabnab, standard XSS-adjacent hygiene).

**Color:** `text-blueprint` (the brand orange — `#f97316` light /
`#fb923c` dark), underlined with a muted decoration color that brightens on
hover. Matches the explicit user request: "change its color in orange".

## Components

### `ScriptEditor`

Add two header controls next to the Trash button:

- `[ Edit | Read ]` pill toggle — same shape/style as the Kanban List/Board
  toggle shipped in `c3532a7`.
- `Download PDF` button — lucide `FileDown` icon + label.

Edit mode shows the current textarea unchanged. Read mode swaps the textarea
for a `<LinkifiedText>` block using the same typography classes
(`text-[16px] leading-relaxed`) so toggling doesn't feel like a layout shift.

Default mode on mount: Edit. Toggle state is local to the component — not
persisted (the Read mode is a proofreading affordance, not a setting).

### `NoteEditor`

Same Edit/Read toggle + Download PDF in the header toolbar.

### `EditorOutput`

Edit/Read toggle on the description only. No PDF button — entries are
short and don't justify the PDF ceremony.

## PDF layout (jsPDF)

- **Page:** A4 portrait, 18 mm margins, 11 pt body line height ~1.5.
- **Line 1:** Project title — 18 pt, `--color-ink`.
- **Line 2:** Meta — `{format} · scheduled {date} · deadline {date}` —
  10 pt, muted grey. Missing fields quietly skipped.
- **Divider:** Thin rule under the meta line.
- **Body:** Word-wrapped script/note. URL runs drawn via `doc.textWithLink()`
  in the brand-orange color so they're clickable in the PDF viewer.
- **Footer:** `Typewriter · {today}` — 8 pt, right-aligned on every page.
- **Filename:** `{slug(title)}-{yyyy-MM-dd}.pdf` via `date-fns` (already a
  dep). Empty title → `untitled-{date}.pdf`.

## Error handling

- `exportPdf()` wrapped in `try/catch` — failures propagate through the app's
  existing `window.onunhandledrejection` → toast queue. No silent failures.
- Empty-body guard: `if (body.trim() === '') { toast('Nothing to export'); return }`.
- `linkify()` never throws — on unexpected input it falls back to a single
  plain-text token.

## Styling tokens

All new styling uses existing Tailwind tokens — no new CSS variables:

- Link color: `text-blueprint` (brand orange).
- Link decoration: `underline decoration-blueprint/40 hover:decoration-blueprint`.
- Toggle pill: reuses the Kanban toggle's `bg-blueprint text-white` / `text-ink-muted hover:bg-canvas` pattern.

## Bundle impact

`jspdf` is imported **lazily** inside `exportPdf.ts`:

```ts
export async function exportScriptToPdf(project: Project) {
  const { jsPDF } = await import('jspdf')
  // ...
}
```

Result: the initial app bundle (currently 100 kB gzipped) stays flat. Users
who press Download PDF get a one-time ~150 kB gzipped chunk. This fits the
web/performance.md budget for an app page (<300 kB).

Font limitation: jsPDF ships with Helvetica/Times/Courier only. For v1 this
is acceptable — scripts are predominantly English. If Hindi/Hinglish rendering
becomes a real need later, we can embed `NotoSansDevanagari` (+~300 kB,
lazy-loaded) without changing the API.

## Testing

Manual pass (no new unit tests — the project has no test harness yet, adding
one is out of scope for this feature):

1. **Linkify — happy path.** Paste `https://example.com` into ScriptEditor,
   switch to Read, confirm orange underlined link, confirm click opens in a
   new tab with `rel=noopener`.
2. **Linkify — trailing punctuation.** Text `see https://example.com.` →
   the period is outside the anchor.
3. **Linkify — bare `www.`.** Text `visit www.example.com` → becomes anchor
   with `href="https://www.example.com"` (we prepend the protocol at render
   time).
4. **PDF — hyperlinks work.** Export a project with 2–3 URLs, open the PDF
   in Preview/Chrome, click a link → opens in browser.
5. **PDF — empty guard.** Delete the script body, click Download → toast
   "Nothing to export", no PDF downloaded.
6. **PDF — long body.** Paste a 2000-word script, export → PDF paginates
   cleanly with the footer on every page.
7. **Edit/Read toggle — no data loss.** Type in Edit, flip to Read, flip
   back → text is intact and cursor/scroll recovers gracefully.

## Migration / rollout

No DB migration. No env-var changes. No breaking changes to existing data.
Safe to ship behind no flag — the features are additive toolbar controls.

## Future extensions (explicitly NOT in v1)

- Inline markdown rendering (bold, italic, lists) — YAGNI for now.
- Embedded fonts for non-Latin scripts — add when demanded.
- Copy-as-markdown / copy-as-HTML buttons — different feature.
- PDF export for EditorOutput — add if users ask.
