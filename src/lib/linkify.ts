// Pure URL tokenizer. No DOM, no deps. Used by <LinkifiedText> for display
// and by exportPdf() to place hyperlink hotspots in the PDF.

export type LinkifyToken =
  | { kind: 'text'; value: string }
  | { kind: 'link'; value: string; href: string }

// Match http(s):// URLs and bare www. URLs. Bare-domain matching (foo.com in
// prose) is deliberately excluded — too many false positives in casual writing.
const URL_RE = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/g

// Trailing sentence punctuation that should stay outside the anchor so
// "https://foo.com." doesn't break into "link with dot".
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
  let cursor = 0

  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0
    const raw = match[0]
    const { url, trailing } = stripTrailingPunct(raw)

    if (start > cursor) {
      tokens.push({ kind: 'text', value: text.slice(cursor, start) })
    }
    tokens.push({ kind: 'link', value: url, href: ensureProtocol(url) })
    if (trailing) tokens.push({ kind: 'text', value: trailing })

    cursor = start + raw.length
  }

  if (cursor < text.length) {
    tokens.push({ kind: 'text', value: text.slice(cursor) })
  }

  return tokens
}
