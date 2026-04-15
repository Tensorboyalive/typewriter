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
