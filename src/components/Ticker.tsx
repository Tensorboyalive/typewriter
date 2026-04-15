import { useEffect, useRef, useState } from 'react'

interface TickerProps {
  value: number
  durationMs?: number
  format?: (n: number) => string
  className?: string
}

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))

/**
 * Ticker — animates numeric changes from previous to new value using rAF +
 * ease-out-expo. Respects prefers-reduced-motion by snapping to the target.
 */
export function Ticker({ value, durationMs = 320, format, className }: TickerProps) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    if (from === to) return

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (reduce) {
      setDisplay(to)
      prevRef.current = to
      return
    }

    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = easeOutExpo(t)
      const current = from + (to - from) * eased
      setDisplay(Number.isInteger(from) && Number.isInteger(to) ? Math.round(current) : current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        prevRef.current = to
      }
    }
    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [value, durationMs])

  const text = format ? format(display) : String(display)
  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {text}
    </span>
  )
}
