import { useMemo } from 'react'
import { useStore } from '../store'
import { computeStreak, activityByDay } from './streaks'

/**
 * Compute streak + activity heatmap from existing store data, filtered by
 * current persona. An activity is any of:
 *  - checklist item completed (completed_at)
 *  - time_block created for that persona (created_at)
 *  - project status update (updated_at)
 *  - note created / updated (updated_at)
 */
export function useStreak() {
  const { persona, checklistItems, timeBlocks, allProjects, notes } = useStore()

  const activityDates = useMemo(() => {
    const out: Date[] = []

    for (const c of checklistItems) {
      if (c.completed_at) out.push(new Date(c.completed_at))
    }
    for (const b of timeBlocks) {
      if (b.persona === persona) out.push(new Date(b.created_at))
    }
    for (const p of allProjects) {
      if (p.updated_at) out.push(new Date(p.updated_at))
    }
    for (const n of notes) {
      if (n.updated_at) out.push(new Date(n.updated_at))
      else if (n.created_at) out.push(new Date(n.created_at))
    }

    return out.filter(d => !isNaN(d.getTime()))
  }, [persona, checklistItems, timeBlocks, allProjects, notes])

  const streak = useMemo(() => computeStreak(activityDates), [activityDates])
  const byDay = useMemo(() => activityByDay(activityDates), [activityDates])

  return { ...streak, byDay, persona }
}
