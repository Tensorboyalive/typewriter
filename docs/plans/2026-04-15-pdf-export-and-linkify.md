# PDF Export + Auto-Linkify Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a Download-PDF button on the script/note editors and make pasted URLs render as orange clickable links across every long-form writing surface (ScriptEditor, NoteEditor, EditorOutput).

**Architecture:** Two pure utility modules (`linkify.ts`, `exportPdf.ts`) + one shared display component (`LinkifiedText.tsx`). jsPDF is imported lazily so the main bundle stays flat. Storage is unchanged — plain strings remain in Postgres; the render layer tokenizes URLs at display time.

**Tech Stack:** React 19, TypeScript, Vite 8 (rolldown), Tailwind v4, jsPDF v3 (lazy), lucide-react, date-fns.

**Working directory:** `/tmp/typewriter-review` (all commands run from here).

**Design reference:** `docs/plans/2026-04-15-pdf-export-and-linkify-design.md`.

---

## Task 1: Install jspdf

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: Install the dependency**

Run: `cd /tmp/typewriter-review && npm install jspdf@^3.0.0`
Expected: `added N packages` with no peer-dep warnings.

**Step 2: Verify it's recorded in package.json**

Run: `cd /tmp/typewriter-review && grep jspdf package.json`
Expected: `"jspdf": "^3.0.0"` under dependencies.

**Step 3: Commit**

```bash
cd /tmp/typewriter-review
git add package.json package-lock.json
git commit -m "chore: add jspdf for PDF export"
```

---

## Task 2: Build the linkify utility

**Files:**
- Create: `src/lib/linkify.ts`

**Step 1: Create the file**

```ts
// Pure URL tokenizer. No DOM, no deps. Used by <LinkifiedText> for display
// and by exportPdf() to place hyperlink hotspots in the PDF.

export type LinkifyToken =
  | { kind: 'text'; value: string }
  | { kind: 'link'; value: string; href: string }

// Match http(s):// URLs and bare www. URLs. Bare-domain matching (foo.com in
// prose) is deliberately excluded — too many false positives in casual writing.
const URL_RE = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/g

// Trailing sentence punctuation that should stay outside the anchor.
const TRAILING_PUNCT_RE = /[.,)\]!?:;]+$/

export function stripTrailingPunct(url: string): { url: string; trailing: string } {
  const match = url.match(TRAILING_PUNCT_RE)
  if (!match) return { url, trailing: '' }
  return {
    url: url.slice(0, -match[0].length),
    trailing: match[0],
  }
}

export function ensureProtocol(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

export function linkify(text: string): LinkifyToken[] {
  if (!text) return []
  const tokens: LinkifyToken[] = []
  let lastIndex = 0

  // Reset regex state between calls (URL_RE is module-scoped and has /g).
  URL_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = URL_RE.exec(text)) !== null) {
    const start = match.index
    const raw = match[0]
    const { url, trailing } = stripTrailingPunct(raw)

    if (start > lastIndex) {
      tokens.push({ kind: 'text', value: text.slice(lastIndex, start) })
    }
    tokens.push({ kind: 'link', value: url, href: ensureProtocol(url) })
    if (trailing) tokens.push({ kind: 'text', value: trailing })

    lastIndex = start + raw.length
  }

  if (lastIndex < text.length) {
    tokens.push({ kind: 'text', value: text.slice(lastIndex) })
  }

  return tokens
}
```

**Step 2: Verify it compiles**

Run: `cd /tmp/typewriter-review && npx tsc --noEmit`
Expected: no errors touching `src/lib/linkify.ts`.

**Step 3: Smoke-check the tokenizer behavior**

Run from `/tmp/typewriter-review`:

```bash
node --input-type=module -e "
import('./src/lib/linkify.ts').catch(async () => {
  // ts-node isn't set up — fall back to a tsc compile + inspection.
});
"
```

If that errors (ts-node not set up), instead run:

```bash
cd /tmp/typewriter-review
npx tsc src/lib/linkify.ts --target es2020 --module esnext --moduleResolution bundler --outDir /tmp/linkify-check
node --input-type=module -e "
import('/tmp/linkify-check/linkify.js').then(m => {
  console.log(JSON.stringify(m.linkify('visit https://example.com.'), null, 2));
  console.log(JSON.stringify(m.linkify('see www.foo.com and https://bar.com!'), null, 2));
  console.log(JSON.stringify(m.linkify(''), null, 2));
});
"
```

Expected output:
- `https://example.com.` splits into `{ link, href: 'https://example.com' }` + `{ text: '.' }`.
- `www.foo.com` becomes `{ link, href: 'https://www.foo.com' }`.
- Empty input returns `[]`.

**Step 4: Commit**

```bash
cd /tmp/typewriter-review
git add src/lib/linkify.ts
git commit -m "feat: add linkify URL tokenizer"
```

---

## Task 3: Build the LinkifiedText component

**Files:**
- Create: `src/components/LinkifiedText.tsx`

**Step 1: Create the file**

```tsx
import { linkify } from '../lib/linkify'

type Props = {
  text: string
  // Whitespace preservation is on by default — script/note content depends on
  // newlines for paragraph breaks. Callers rendering inline (meta lines) can
  // opt out.
  preserveWhitespace?: boolean
  className?: string
}

// Renders plain text with URL runs replaced by orange, underlined anchors.
// Matches the brand accent (--color-blueprint). target="_blank" +
// rel="noopener noreferrer" prevents reverse-tabnab.
export function LinkifiedText({
  text,
  preserveWhitespace = true,
  className = '',
}: Props) {
  const tokens = linkify(text)
  const wrapperClass = preserveWhitespace
    ? `whitespace-pre-wrap break-words ${className}`
    : className

  return (
    <span className={wrapperClass}>
      {tokens.map((tok, i) =>
        tok.kind === 'link' ? (
          <a
            key={i}
            href={tok.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blueprint underline decoration-blueprint/40 hover:decoration-blueprint transition-colors"
          >
            {tok.value}
          </a>
        ) : (
          <span key={i}>{tok.value}</span>
        ),
      )}
    </span>
  )
}
```

**Step 2: Verify the build is green**

Run: `cd /tmp/typewriter-review && npm run build 2>&1 | tail -20`
Expected: `✓ built in` with no type errors, no unused-import warnings.

**Step 3: Commit**

```bash
cd /tmp/typewriter-review
git add src/components/LinkifiedText.tsx
git commit -m "feat: add LinkifiedText display component"
```

---

## Task 4: Build the PDF export utility

**Files:**
- Create: `src/lib/exportPdf.ts`

**Step 1: Create the file**

```ts
import { format } from 'date-fns'
import { linkify } from './linkify'
import type { Project, Note } from '../types'

// A4 portrait, millimetres. 18mm margins give comfortable reading width.
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 18
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

const TITLE_SIZE = 18
const META_SIZE = 10
const BODY_SIZE = 11
const FOOTER_SIZE = 8
const LINE_HEIGHT = 1.5

// Brand orange in RGB (matches --color-blueprint: #f97316).
const LINK_R = 249
const LINK_G = 115
const LINK_B = 22

function slugify(input: string): string {
  return (input || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'untitled'
}

type BuildInput = {
  title: string
  subtitle: string
  body: string
}

async function buildPdf({ title, subtitle, body }: BuildInput): Promise<{
  blob: Blob
  filename: string
}> {
  if (body.trim() === '') {
    throw new Error('Nothing to export')
  }

  // Lazy-load jsPDF so the main bundle stays flat (~150 KB saved for users
  // who never press Download PDF).
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // Title
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(TITLE_SIZE)
  doc.setTextColor(17, 17, 17)
  let y = MARGIN + 8
  doc.text(title || 'Untitled', MARGIN, y)
  y += 7

  // Meta line (optional)
  if (subtitle) {
    doc.setFontSize(META_SIZE)
    doc.setTextColor(120, 120, 120)
    doc.text(subtitle, MARGIN, y)
    y += 5
  }

  // Divider
  doc.setDrawColor(220, 220, 220)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
  y += 6

  // Body — word-wrapped with inline hyperlinks.
  doc.setFontSize(BODY_SIZE)
  doc.setTextColor(30, 30, 30)
  const lineStep = (BODY_SIZE / 2.83465) * LINE_HEIGHT // pt → mm

  const paragraphs = body.split(/\n/)
  for (const para of paragraphs) {
    if (para === '') {
      y += lineStep
      if (y > PAGE_HEIGHT - MARGIN) {
        doc.addPage()
        y = MARGIN + 8
      }
      continue
    }

    // Tokenize the paragraph, then word-wrap manually so we can track x offset
    // and drop textWithLink() calls at the right horizontal position.
    const tokens = linkify(para)
    let x = MARGIN

    for (const tok of tokens) {
      const words = tok.value.split(/(\s+)/).filter(w => w !== '')
      for (const word of words) {
        const wordWidth = doc.getTextWidth(word)
        if (x + wordWidth > PAGE_WIDTH - MARGIN) {
          y += lineStep
          x = MARGIN
          if (y > PAGE_HEIGHT - MARGIN - 8) {
            doc.addPage()
            y = MARGIN + 8
          }
        }
        if (tok.kind === 'link' && word.trim() !== '') {
          doc.setTextColor(LINK_R, LINK_G, LINK_B)
          doc.textWithLink(word, x, y, { url: tok.href })
          doc.setTextColor(30, 30, 30)
        } else {
          doc.text(word, x, y)
        }
        x += wordWidth
      }
    }

    // End of paragraph → newline.
    y += lineStep
    if (y > PAGE_HEIGHT - MARGIN) {
      doc.addPage()
      y = MARGIN + 8
    }
  }

  // Footer on every page.
  const pageCount = doc.getNumberOfPages()
  const today = format(new Date(), 'yyyy-MM-dd')
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFontSize(FOOTER_SIZE)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Typewriter · ${today}`,
      PAGE_WIDTH - MARGIN,
      PAGE_HEIGHT - MARGIN + 4,
      { align: 'right' },
    )
  }

  const blob = doc.output('blob')
  const filename = `${slugify(title)}-${today}.pdf`
  return { blob, filename }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Small delay before revoking so Firefox/Safari have time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function projectSubtitle(project: Project): string {
  const parts: string[] = []
  if (project.format) parts.push(project.format)
  if (project.scheduled_date) {
    parts.push(`scheduled ${format(new Date(project.scheduled_date), 'MMM d, yyyy')}`)
  }
  if (project.deadline) {
    parts.push(`deadline ${format(new Date(project.deadline), 'MMM d, yyyy')}`)
  }
  return parts.join(' · ')
}

export async function exportScriptToPdf(project: Project): Promise<void> {
  const { blob, filename } = await buildPdf({
    title: project.title || 'Untitled script',
    subtitle: projectSubtitle(project),
    body: project.script || '',
  })
  downloadBlob(blob, filename)
}

export async function exportNoteToPdf(note: Note): Promise<void> {
  const subtitle = note.updated_at
    ? `Updated ${format(new Date(note.updated_at), 'MMM d, yyyy')}`
    : ''
  const { blob, filename } = await buildPdf({
    title: note.title || 'Untitled note',
    subtitle,
    body: note.content || '',
  })
  downloadBlob(blob, filename)
}
```

**Step 2: Verify the build is green**

Run: `cd /tmp/typewriter-review && npm run build 2>&1 | tail -25`
Expected:
- No TS errors.
- Output shows a separate chunk for jspdf (something like `jspdf-<hash>.js`). If the chunk is bundled into the main entry, the lazy import is broken — investigate before committing.

**Step 3: Commit**

```bash
cd /tmp/typewriter-review
git add src/lib/exportPdf.ts
git commit -m "feat: add lazy PDF export for scripts and notes"
```

---

## Task 5: Wire toggle + Download PDF into ScriptEditor

**Files:**
- Modify: `src/components/ScriptEditor.tsx`

**Step 1: Add imports**

At the top of `ScriptEditor.tsx`, replace:

```ts
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, CalendarClock, Radio } from 'lucide-react'
```

with:

```ts
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, CalendarClock, Radio, FileDown, Edit3, Eye } from 'lucide-react'
import { LinkifiedText } from './LinkifiedText'
import { exportScriptToPdf } from '../lib/exportPdf'
```

**Step 2: Add local mode state**

Inside `ScriptEditor()`, right after `const project = projects.find(p => p.id === id)`:

```ts
  const [mode, setMode] = useState<'edit' | 'read'>('edit')
  const [exporting, setExporting] = useState(false)

  const handleDownloadPdf = async () => {
    if (!project) return
    setExporting(true)
    try {
      await exportScriptToPdf(project)
    } catch (err) {
      // Surface through the app's unhandled-rejection → toast path. Re-throw
      // so the global handler picks it up; don't swallow silently.
      console.error(err)
      throw err
    } finally {
      setExporting(false)
    }
  }
```

**Step 3: Add toggle + download button to the header toolbar**

In the header's right-hand control cluster (currently `<Timer /> + Trash button`), insert the toggle and download button before the Trash button.

Find:

```tsx
        <div className="flex items-center gap-3 shrink-0">
          <Timer />
          <button
            onClick={() => {
              deleteProject(project.id)
              navigate('/projects')
            }}
            className="p-2 rounded-md hover:bg-danger-light text-ink-muted hover:text-danger transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
```

Replace with:

```tsx
        <div className="flex items-center gap-3 shrink-0">
          <Timer />
          {/* Edit/Read pill — same shape as the Kanban List/Board toggle */}
          <div className="flex items-center rounded-md border border-line bg-canvas p-0.5">
            <button
              type="button"
              onClick={() => setMode('edit')}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors ${
                mode === 'edit'
                  ? 'bg-blueprint text-white'
                  : 'text-ink-muted hover:bg-canvas'
              }`}
              aria-pressed={mode === 'edit'}
            >
              <Edit3 size={12} /> Edit
            </button>
            <button
              type="button"
              onClick={() => setMode('read')}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors ${
                mode === 'read'
                  ? 'bg-blueprint text-white'
                  : 'text-ink-muted hover:bg-canvas'
              }`}
              aria-pressed={mode === 'read'}
            >
              <Eye size={12} /> Read
            </button>
          </div>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={exporting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-line text-[12px] text-ink-secondary hover:text-blueprint hover:border-blueprint/40 transition-colors disabled:opacity-50"
          >
            <FileDown size={14} /> {exporting ? 'Exporting…' : 'Download PDF'}
          </button>
          <button
            onClick={() => {
              deleteProject(project.id)
              navigate('/projects')
            }}
            className="p-2 rounded-md hover:bg-danger-light text-ink-muted hover:text-danger transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
```

**Step 4: Swap the textarea for mode-aware rendering**

Find:

```tsx
      {/* Script editor — fills remaining viewport */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-10 h-full">
          <textarea
            value={project.script}
            onChange={e => updateProject(project.id, { script: e.target.value })}
            placeholder={`Start writing your script here...\n\nThink about:\n\u2022 Hook — First 3 seconds\n\u2022 Story — The main content\n\u2022 CTA — What should they do?`}
            className="w-full h-full min-h-[60vh] bg-transparent text-ink leading-relaxed resize-none focus:outline-none text-[16px]"
          />
        </div>
      </div>
```

Replace with:

```tsx
      {/* Script editor — fills remaining viewport */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-10 h-full">
          {mode === 'edit' ? (
            <textarea
              value={project.script}
              onChange={e => updateProject(project.id, { script: e.target.value })}
              placeholder={`Start writing your script here...\n\nThink about:\n\u2022 Hook — First 3 seconds\n\u2022 Story — The main content\n\u2022 CTA — What should they do?`}
              className="w-full h-full min-h-[60vh] bg-transparent text-ink leading-relaxed resize-none focus:outline-none text-[16px]"
            />
          ) : (
            <div className="w-full min-h-[60vh] text-ink leading-relaxed text-[16px]">
              {project.script.trim() ? (
                <LinkifiedText text={project.script} />
              ) : (
                <p className="text-ink-muted italic">Nothing written yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
```

**Step 5: Verify the build**

Run: `cd /tmp/typewriter-review && npm run build 2>&1 | tail -15`
Expected: green build, no unused imports.

**Step 6: Commit**

```bash
cd /tmp/typewriter-review
git add src/components/ScriptEditor.tsx
git commit -m "feat: add Edit/Read toggle and Download PDF in ScriptEditor"
```

---

## Task 6: Wire toggle + Download PDF into NoteEditor

**Files:**
- Modify: `src/components/NoteEditor.tsx`

**Step 1: Read the current file** to confirm the header shape.

Run: `cd /tmp/typewriter-review && head -100 src/components/NoteEditor.tsx`

Identify:
- The imports line (where to add `FileDown`, `Edit3`, `Eye`, `LinkifiedText`, `exportNoteToPdf`).
- The current `<textarea>` binding `note.content` (where to split edit/read).
- The header toolbar with Pin + Delete (where to insert toggle + download).

**Step 2: Add imports**

Add to the imports:

```ts
import { FileDown, Edit3, Eye } from 'lucide-react'  // merge into the existing lucide import
import { LinkifiedText } from './LinkifiedText'
import { exportNoteToPdf } from '../lib/exportPdf'
```

Ensure `useState` is already imported; if not, add it.

**Step 3: Add mode state + export handler**

Inside the component body, after the note lookup:

```ts
  const [mode, setMode] = useState<'edit' | 'read'>('edit')
  const [exporting, setExporting] = useState(false)

  const handleDownloadPdf = async () => {
    if (!note) return
    setExporting(true)
    try {
      await exportNoteToPdf(note)
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setExporting(false)
    }
  }
```

**Step 4: Insert toggle + download into the header**

Use the same toggle pill + download-button JSX from Task 5 (copied verbatim, swapping `handleDownloadPdf` behavior). Place it in the header's right-hand control cluster, before the Delete button.

**Step 5: Swap the textarea for mode-aware rendering**

Same pattern as Task 5 Step 4 — wrap the existing `<textarea value={note.content} …>` in `{mode === 'edit' ? (…) : (<LinkifiedText text={note.content} />)}`. Preserve all existing placeholder text and Tailwind classes on the textarea.

**Step 6: Verify the build**

Run: `cd /tmp/typewriter-review && npm run build 2>&1 | tail -15`
Expected: green build.

**Step 7: Commit**

```bash
cd /tmp/typewriter-review
git add src/components/NoteEditor.tsx
git commit -m "feat: add Edit/Read toggle and Download PDF in NoteEditor"
```

---

## Task 7: Linkify EditorOutput description (no toggle, no PDF)

**Files:**
- Modify: `src/components/EditorOutput.tsx`

**Step 1: Add import**

At the top of `EditorOutput.tsx`:

```ts
import { LinkifiedText } from './LinkifiedText'
```

**Step 2: Replace the static description render**

Find line 174 (the static description paragraph):

```tsx
<p className="text-sm text-ink pr-14">{output.description}</p>
```

Replace with:

```tsx
<p className="text-sm text-ink pr-14">
  <LinkifiedText text={output.description} />
</p>
```

Leave the inline-edit form alone — it's a textarea, linkification only matters on display.

**Step 3: Verify the build**

Run: `cd /tmp/typewriter-review && npm run build 2>&1 | tail -15`
Expected: green build.

**Step 4: Commit**

```bash
cd /tmp/typewriter-review
git add src/components/EditorOutput.tsx
git commit -m "feat: linkify URLs in ship-log entries"
```

---

## Task 8: Final verification + push

**Step 1: Confirm the jsPDF chunk is lazy**

Run: `cd /tmp/typewriter-review && npm run build 2>&1 | grep -E '(jspdf|dist/assets)' | head -20`
Expected:
- A separate chunk filename containing `jspdf` (e.g. `dist/assets/jspdf-<hash>.js`).
- The main entry chunk size should be close to its pre-change size (within ~5 KB gzipped). If the main chunk jumped by 100+ KB, the lazy import is collapsed — investigate `import('jspdf')` usage.

**Step 2: Start the dev server and smoke-test**

Run in one terminal: `cd /tmp/typewriter-review && npm run dev`

Open the app in a browser. Walk the design-doc test plan:

1. **Linkify — happy path.** Open any project in ScriptEditor. Paste `https://example.com` into the script. Flip to Read. The URL should render orange, underlined, and click-through opens in a new tab.
2. **Linkify — trailing punct.** Type `see https://example.com.`. In Read mode, the period should sit outside the anchor (check by hovering — status bar URL should not include the period).
3. **Linkify — bare www.** Type `visit www.example.com`. Read mode should render it as an anchor with `href="https://www.example.com"`.
4. **PDF — clickable hyperlinks.** With 2–3 URLs in the body, press Download PDF. Open the downloaded file in Preview/Chrome. Click a link — it should open in a browser.
5. **PDF — empty guard.** Delete the script body. Press Download PDF. Expected: an error toast ("Nothing to export") via the unhandled-rejection toast path; no PDF downloaded.
6. **PDF — long body.** Paste a ~2000-word script. Export. The PDF should paginate cleanly with the footer on every page.
7. **Toggle — no data loss.** Type in Edit. Flip to Read. Flip back. Cursor and scroll should recover gracefully; text is intact.
8. **NoteEditor — same as 1, 4, 7** but on a saved note.
9. **EditorOutput — linkify on display.** Create or open a ship-log entry with a URL in the description. The URL should render as an orange anchor in the static list view.

**Step 3: Push to origin**

Only after all smoke tests pass:

```bash
cd /tmp/typewriter-review
git log --oneline -10
git push origin main
```

Expected: clean push, no protected-branch errors.

**Step 4: Done**

No rollout flags, no DB migration, no env-var changes. The features are additive toolbar controls — safe to ship immediately.

---

## Reference

- Design doc: `docs/plans/2026-04-15-pdf-export-and-linkify-design.md`
- jsPDF v3 API: https://artskydj.github.io/jsPDF/docs/jsPDF.html
- `doc.textWithLink()`: places clickable hyperlink hotspots in the PDF at (x, y) with the specified URL.
- Lazy imports + Vite: Vite chunks `await import()` calls into separate files automatically. If the chunk collapses into the main entry, check for a sync `import jsPDF from 'jspdf'` leaking elsewhere.
