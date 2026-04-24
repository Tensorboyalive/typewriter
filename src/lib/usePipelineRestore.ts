import { useLayoutEffect, useRef, useState } from 'react'
import { loadSession, clearSession, saveSession } from './pipelineSession'

const GLOW_DURATION_MS = 1400

/**
 * Restore pipeline scroll position and briefly glow the card the user just
 * came from. Also returns a helper to snapshot the current state before the
 * user navigates into a project detail page.
 */
export function usePipelineRestore(): {
  glowId: string | null
  snapshotBeforeNav: (projectId: string) => void
} {
  const [glowId, setGlowId] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    const session = loadSession()
    if (!session) return

    // Restore scroll position synchronously before paint.
    if (session.scrollTop > 0) {
      window.scrollTo({ top: session.scrollTop, left: 0, behavior: 'instant' })
    }

    if (session.lastOpenedId) {
      // Intentional setState in layout effect: we're restoring UI state from
      // external storage, not deriving it from props. This is the canonical
      // pattern for persisted UI state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGlowId(session.lastOpenedId)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setGlowId(null), GLOW_DURATION_MS)
    }

    clearSession()

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  const snapshotBeforeNav = (projectId: string) => {
    saveSession({ scrollTop: window.scrollY, lastOpenedId: projectId })
  }

  return { glowId, snapshotBeforeNav }
}
