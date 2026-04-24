// UI preferences persisted to user_settings.ui_prefs (JSONB).
// Hand-rolled validator — no Zod dep in this project. Forgiving: unknown keys
// are dropped, malformed fields fall back to defaults, never throws.

export type ViewMode = 'list' | 'board'
export type RowDensity = 'compact' | 'comfortable'

export interface PipelinePrefs {
  viewMode: ViewMode
  rowDensity: RowDensity
  showReady: boolean
  /** Map of groupId → isCollapsed. groupIds are `stageId` or `stageId:dateKey`. */
  collapsed: Record<string, boolean>
}

export interface UIPrefs {
  pipeline: PipelinePrefs
}

export const DEFAULT_UI_PREFS: UIPrefs = {
  pipeline: {
    viewMode: 'list',
    rowDensity: 'compact',
    showReady: false,
    collapsed: {},
  },
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Safe, forgiving parse. Never throws. Falls back to defaults on any shape issue. */
export function parseUIPrefs(raw: unknown): UIPrefs {
  if (!isPlainObject(raw)) return DEFAULT_UI_PREFS

  const pipelineRaw = raw.pipeline
  const p = isPlainObject(pipelineRaw) ? pipelineRaw : {}

  const viewMode: ViewMode = p.viewMode === 'board' ? 'board' : 'list'
  const rowDensity: RowDensity = p.rowDensity === 'comfortable' ? 'comfortable' : 'compact'
  const showReady = typeof p.showReady === 'boolean' ? p.showReady : false

  const collapsed: Record<string, boolean> = {}
  if (isPlainObject(p.collapsed)) {
    for (const [k, v] of Object.entries(p.collapsed)) {
      if (typeof v === 'boolean') collapsed[k] = v
    }
  }

  return { pipeline: { viewMode, rowDensity, showReady, collapsed } }
}

/** Immutable patch to the pipeline subtree. */
export function setPipelinePrefs(prev: UIPrefs, patch: Partial<PipelinePrefs>): UIPrefs {
  return {
    ...prev,
    pipeline: { ...prev.pipeline, ...patch },
  }
}
