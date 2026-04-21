import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Full-bleed background band + centered max-1400 container.
 * The page-row primitive that every editorial page is composed of.
 *
 * Per design.md §7.1.
 */

export type SectionTone = 'cream' | 'paper' | 'ink'

interface SectionProps {
  children: ReactNode
  tone?: SectionTone
  className?: string
  id?: string
  /** Set false to render the band full-bleed without the max-1400 wrapper. */
  container?: boolean
  as?: 'section' | 'header' | 'footer' | 'div' | 'main' | 'aside'
}

const TONE_CLASS: Record<SectionTone, string> = {
  cream: 'bg-cream text-ink',
  paper: 'bg-paper text-ink',
  ink:   'bg-ink text-cream grain',
}

export function Section({
  children,
  tone = 'cream',
  className,
  id,
  container = true,
  as = 'section',
}: SectionProps) {
  const Tag = as
  return (
    <Tag id={id} className={cn(TONE_CLASS[tone], className)}>
      {container ? (
        <div className="mx-auto w-full max-w-[1400px] px-6 md:px-10 lg:px-14">
          {children}
        </div>
      ) : (
        children
      )}
    </Tag>
  )
}
