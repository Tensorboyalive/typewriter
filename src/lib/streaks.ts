// Streak tracking. A "day of activity" is any day with ≥1 activity timestamp.
// Grace period: if last activity was within 36h of now, the current streak is
// still alive. Otherwise current resets to 0.

const MS_PER_DAY = 24 * 60 * 60 * 1000
const GRACE_MS = 36 * 60 * 60 * 1000

const dayKey = (d: Date) => {
  // local-date key, not UTC
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function computeStreak(activityDates: Date[]): {
  current: number
  longest: number
  lastActive: Date | null
} {
  if (!activityDates.length) return { current: 0, longest: 0, lastActive: null }

  const sorted = [...activityDates].sort((a, b) => a.getTime() - b.getTime())
  const lastActive = sorted[sorted.length - 1]

  // Unique local day keys, sorted ascending
  const uniqueKeys: string[] = []
  const seen = new Set<string>()
  for (const d of sorted) {
    const k = dayKey(d)
    if (!seen.has(k)) { seen.add(k); uniqueKeys.push(k) }
  }

  // Longest run of consecutive days
  let longest = 1
  let run = 1
  for (let i = 1; i < uniqueKeys.length; i++) {
    const prev = new Date(uniqueKeys[i - 1] + 'T00:00:00')
    const curr = new Date(uniqueKeys[i] + 'T00:00:00')
    const gap = Math.round((curr.getTime() - prev.getTime()) / MS_PER_DAY)
    if (gap === 1) run += 1
    else run = 1
    if (run > longest) longest = run
  }

  // Current streak: walk backwards from the last active day while days are
  // consecutive. Grace: if last activity is older than 36h, current = 0.
  const now = Date.now()
  let current = 0
  if (now - lastActive.getTime() <= GRACE_MS) {
    current = 1
    for (let i = uniqueKeys.length - 2; i >= 0; i--) {
      const prev = new Date(uniqueKeys[i] + 'T00:00:00')
      const next = new Date(uniqueKeys[i + 1] + 'T00:00:00')
      const gap = Math.round((next.getTime() - prev.getTime()) / MS_PER_DAY)
      if (gap === 1) current += 1
      else break
    }
  }

  return { current, longest, lastActive }
}

/** Bucket activity dates into a map of YYYY-MM-DD → count, for heatmap use. */
export function activityByDay(activityDates: Date[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const d of activityDates) {
    const k = dayKey(d)
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}

export const _dayKey = dayKey
