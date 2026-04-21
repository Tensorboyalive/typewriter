import { format } from 'date-fns'
import { linkify } from './linkify'
import type { Project, Note } from '../types'
import { BRAND_INK_SOFT, BRAND_MUTED, BRAND_VIRAL } from './brand'

// A4 portrait, millimetres. 18mm margins give comfortable reading width.
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 18

const TITLE_SIZE = 18
const META_SIZE = 10
const BODY_SIZE = 11
const FOOTER_SIZE = 8
const LINE_HEIGHT = 1.5

// Canonical brand colors from lib/brand.ts. Do NOT duplicate hex values here.
const [LINK_R, LINK_G, LINK_B] = BRAND_VIRAL
const [INK_R, INK_G, INK_B] = BRAND_INK_SOFT
const [MUTED_R, MUTED_G, MUTED_B] = BRAND_MUTED

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
    doc.setTextColor(MUTED_R, MUTED_G, MUTED_B)
    doc.text(subtitle, MARGIN, y)
    y += 5
  }

  // Divider
  doc.setDrawColor(220, 220, 220)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
  y += 6

  // Body — word-wrapped with inline hyperlinks.
  doc.setFontSize(BODY_SIZE)
  doc.setTextColor(INK_R, INK_G, INK_B)
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
          // Skip pure-whitespace tokens at the start of a wrapped line — no
          // sense drawing a leading space.
          if (word.trim() === '') continue
        }
        if (tok.kind === 'link' && word.trim() !== '') {
          doc.setTextColor(LINK_R, LINK_G, LINK_B)
          doc.textWithLink(word, x, y, { url: tok.href })
          doc.setTextColor(INK_R, INK_G, INK_B)
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
