import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Editorial magazine-issue eyebrow: 1px × 40px accent bar + mono label.
 * Appears above every primary page's H1. "01 · Score", "Proof · the receipts",
 * "Early access · typewriter:studio" — all use this.
 *
 * Per design.md §5 (inline rule) and §7 (load-bearing magazine signal).
 */

interface EyebrowProps {
  children: ReactNode
  /** Set false to render without the leading 40px rule (used in dense grids). */
  rule?: boolean
  className?: string
  as?: 'div' | 'span' | 'p'
}

export function Eyebrow({
  children,
  rule = true,
  className,
  as = 'div',
}: EyebrowProps) {
  const Tag = as
  return (
    <Tag
      className={cn(
        'mono inline-flex items-center gap-3 text-[0.72rem] uppercase tracking-[0.28em] leading-none text-muted',
        className,
      )}
    >
      {rule && (
        <span
          aria-hidden="true"
          className="inline-block h-px w-10 bg-current opacity-60"
        />
      )}
      <span>{children}</span>
    </Tag>
  )
}
