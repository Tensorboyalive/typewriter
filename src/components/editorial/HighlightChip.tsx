import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * The orange chip that carries every page's one memorable phrase.
 *
 * Rules (design.md §7.4):
 *  - Only ONE chip per H1 should set `hero`. Rotation is a flourish; scattered
 *    rotation is wallpaper.
 *  - Orange variant uses ink text — never white (WCAG fail 3.49:1).
 *  - `italic` is true by default because the italic phrase is the emphasis.
 */

export type HighlightVariant = 'orange' | 'cream' | 'ink' | 'strike'

interface HighlightChipProps {
  children: ReactNode
  variant?: HighlightVariant
  italic?: boolean
  hero?: boolean
  className?: string
}

const VARIANT_CLASS: Record<Exclude<HighlightVariant, 'strike'>, string> = {
  orange: 'highlight',
  cream:  'highlight-cream',
  ink:    'highlight-ink',
}

export function HighlightChip({
  children,
  variant = 'orange',
  italic = true,
  hero = false,
  className,
}: HighlightChipProps) {
  if (variant === 'strike') {
    return (
      <span className={cn('strike', italic && 'serif-italic', className)}>
        {children}
      </span>
    )
  }

  return (
    <span
      className={cn(
        VARIANT_CLASS[variant],
        hero && 'highlight-hero',
        italic && 'serif-italic',
        className,
      )}
    >
      {children}
    </span>
  )
}
