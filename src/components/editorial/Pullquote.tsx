import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * The thesis moment. Exactly one per page (max two on a long page).
 * Never adjacent to another pullquote.
 *
 * Per design.md §7.5.
 */

interface PullquoteProps {
  children: ReactNode
  attribution?: string
  tone?: 'cream' | 'ink'
  size?: 'default' | 'lg'
  className?: string
}

export function Pullquote({
  children,
  attribution,
  tone = 'cream',
  size = 'default',
  className,
}: PullquoteProps) {
  const quoteColor = tone === 'ink' ? 'text-cream/20' : 'text-ink/20'
  const bodyColor  = tone === 'ink' ? 'text-cream' : 'text-ink'
  const attColor   = tone === 'ink' ? 'text-cream/60' : 'text-muted'

  const bodyClass = size === 'lg'
    ? 'text-[clamp(2rem,calc(1rem+2.5vw),3.6rem)] leading-[1.1]'
    : 'text-[clamp(1.5rem,calc(1rem+1.5vw),2.3rem)] leading-[1.15]'

  return (
    <figure className={cn('relative mx-auto max-w-[62ch] text-center', className)}>
      <span
        aria-hidden="true"
        className={cn('serif pointer-events-none select-none absolute -top-12 left-1/2 -translate-x-1/2 text-[10rem] leading-none', quoteColor)}
      >
        &ldquo;
      </span>
      <blockquote className={cn('serif relative', bodyClass, bodyColor)}>
        {children}
      </blockquote>
      {attribution && (
        <figcaption className={cn('mono mt-8 text-[0.68rem] uppercase tracking-[0.28em]', attColor)}>
          {attribution}
        </figcaption>
      )}
    </figure>
  )
}
