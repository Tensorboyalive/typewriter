import { cn } from '../../lib/cn'

/**
 * Single-line horizontal band that loops forever. Maximum one per page.
 * Breaks vertical cadence intentionally (compressed py-4 tempo).
 *
 * Per design.md §7.6. Respects prefers-reduced-motion via global CSS.
 */

interface MarqueeProps {
  items: string[]
  tone?: 'cream' | 'ink' | 'orange'
  className?: string
}

const TONE_CLASS: Record<NonNullable<MarqueeProps['tone']>, string> = {
  cream:  'bg-cream text-ink',
  ink:    'bg-ink text-cream',
  orange: 'bg-viral text-ink',
}

export function Marquee({ items, tone = 'orange', className }: MarqueeProps) {
  const doubled = [...items, ...items]
  return (
    <div className={cn('overflow-hidden py-4', TONE_CLASS[tone], className)}>
      <div className="marquee-track mono whitespace-nowrap text-[0.78rem] uppercase tracking-[0.28em]">
        {doubled.map((item, i) => (
          <span key={i} aria-hidden={i >= items.length} className="inline-flex items-center gap-12">
            {item}
            <span aria-hidden="true" className="opacity-40">·</span>
          </span>
        ))}
      </div>
    </div>
  )
}
