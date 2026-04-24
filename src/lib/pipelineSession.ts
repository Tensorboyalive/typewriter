// Ephemeral per-tab state for the pipeline — scroll position and last-opened
// card — so returning from a project detail page lands you where you left.
// sessionStorage is per-tab and cleared on browser close; this prevents cross-
// tab fights and cross-session staleness.

const KEY = 'typewriter.pipeline.session.v1'
const MAX_AGE_MS = 30 * 60 * 1000 // 30 minutes

export interface PipelineSession {
  scrollTop: number
  lastOpenedId: string | null
  savedAt: number
}

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    // Touch the API — may throw in private mode with quota 0.
    const test = '__tw_probe__'
    window.sessionStorage.setItem(test, '1')
    window.sessionStorage.removeItem(test)
    return window.sessionStorage
  } catch {
    return null
  }
}

export function saveSession(session: Omit<PipelineSession, 'savedAt'>): void {
  const storage = safeStorage()
  if (!storage) return
  try {
    const payload: PipelineSession = { ...session, savedAt: Date.now() }
    storage.setItem(KEY, JSON.stringify(payload))
  } catch {
    // quota / serialization issues — drop silently; restoration will just no-op.
  }
}

export function loadSession(): PipelineSession | null {
  const storage = safeStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' && parsed !== null &&
      typeof (parsed as PipelineSession).scrollTop === 'number' &&
      typeof (parsed as PipelineSession).savedAt === 'number'
    ) {
      const s = parsed as PipelineSession
      if (Date.now() - s.savedAt > MAX_AGE_MS) {
        storage.removeItem(KEY)
        return null
      }
      return s
    }
    return null
  } catch {
    return null
  }
}

export function clearSession(): void {
  const storage = safeStorage()
  if (!storage) return
  try { storage.removeItem(KEY) } catch { /* noop */ }
}
