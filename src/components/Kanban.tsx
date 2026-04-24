import { useState } from 'react'
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronDown, ChevronRight, List, Columns3, Rows3, Rows2 } from 'lucide-react'
import { useStore } from '../store'
import { PIPELINE_STAGES, CONTENT_FORMATS, PLATFORMS, type Platform, type ContentFormat, type Project } from '../types'
import { STATUS_VISUAL } from '../lib/statusColors'
import { usePipelineRestore } from '../lib/usePipelineRestore'

const UNSCHEDULED_KEY = '__unscheduled__'

function formatDateLabel(dateKey: string): string {
  if (dateKey === UNSCHEDULED_KEY) return 'Unscheduled'
  const d = parseISO(dateKey)
  if (Number.isNaN(d.getTime())) return 'Unscheduled'
  if (isToday(d)) return `Today · ${format(d, 'MMM d')}`
  if (isTomorrow(d)) return `Tomorrow · ${format(d, 'MMM d')}`
  if (isYesterday(d)) return `Yesterday · ${format(d, 'MMM d')}`
  return format(d, 'EEE, MMM d')
}

// Group projects by scheduled_date (ISO YYYY-MM-DD). Nulls/invalid go to
// a single "__unscheduled__" bucket. Returns entries sorted newest-first,
// with unscheduled pinned to the bottom — matches the current list order
// shown on the Pipeline screen.
function groupByScheduledDate(items: Project[]): Array<[string, Project[]]> {
  const buckets: Record<string, Project[]> = {}
  for (const p of items) {
    const key = p.scheduled_date && /^\d{4}-\d{2}-\d{2}/.test(p.scheduled_date)
      ? p.scheduled_date.slice(0, 10)
      : UNSCHEDULED_KEY
    if (!buckets[key]) buckets[key] = []
    buckets[key].push(p)
  }
  const entries = Object.entries(buckets)
  entries.sort(([a], [b]) => {
    if (a === UNSCHEDULED_KEY) return 1
    if (b === UNSCHEDULED_KEY) return -1
    return b.localeCompare(a)
  })
  return entries
}

export function Kanban() {
  const { projects, addProject, activeChannel, uiPrefs, updatePipelinePrefs } = useStore()
  const { viewMode, rowDensity, showReady, collapsed } = uiPrefs.pipeline
  const navigate = useNavigate()
  const { glowId, snapshotBeforeNav } = usePipelineRestore()

  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newFormat, setNewFormat] = useState<ContentFormat>('reel')

  const toggleGroup = (id: string) => {
    updatePipelinePrefs({
      collapsed: { ...collapsed, [id]: !collapsed[id] },
    })
  }

  const readyCount = projects.filter(p => p.status === 'ready').length
  const filtered = showReady ? projects : projects.filter(p => p.status !== 'ready')

  const handleCardClick = (projectId: string) => {
    snapshotBeforeNav(projectId)
    navigate(`/projects/${projectId}`)
  }

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    const defaultPlatform: Platform =
      (PLATFORMS.find(p => p.id === (activeChannel?.handle as Platform | undefined))?.id)
      ?? 'tb'
    const project = await addProject({
      title: newTitle.trim(),
      platform: defaultPlatform,
      status: 'idea',
      format: newFormat,
      scheduled_date: format(new Date(), 'yyyy-MM-dd'),
    })
    setNewTitle('')
    setNewFormat('reel')
    setAdding(false)
    if (project) {
      snapshotBeforeNav(project.id)
      navigate(`/projects/${project.id}`)
    }
  }

  const renderFormatTag = (fmt: ContentFormat | null | undefined, size: 'sm' | 'md' = 'sm') => {
    if (!fmt) return null
    const info = CONTENT_FORMATS.find(f => f.id === fmt)
    if (!info) return null
    const cls = size === 'sm'
      ? 'text-[9px] px-1.5 py-0.5'
      : 'text-[10px] px-1.5 py-0.5'
    return (
      <span className={`${cls} rounded font-medium bg-blueprint-light text-blueprint border border-blueprint/20`}>
        {info.label}
      </span>
    )
  }

  /**
   * Row rendering branches on:
   *  - `boardMode`: tiny stacked cards for the 3-column Board view
   *  - `rowDensity`: 'compact' (32px) vs 'comfortable' for the List view
   * Every variant includes the status dot + label (color-not-only) and the
   * returning-card glow class when `project.id === glowId`.
   */
  const renderProjectCard = (project: typeof projects[0], boardMode = false) => {
    const platInfo = PLATFORMS.find(p => p.id === project.platform)
    const visual = STATUS_VISUAL[project.status]
    const isReady = project.status === 'ready'
    const glowClass = glowId === project.id ? 'pipeline-row--returning' : ''
    const mutedClass = showReady && isReady ? 'opacity-50' : ''

    if (boardMode) {
      return (
        <button
          key={project.id}
          onClick={() => handleCardClick(project.id)}
          aria-label={`${project.title} — ${visual.ariaLabel}`}
          className={`card-hover stagger-in block w-full text-left bg-surface border border-line rounded-md px-3 py-2 cursor-pointer hover:border-blueprint/40 ${glowClass} ${mutedClass}`}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <span
              aria-hidden="true"
              className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: visual.tokenVar }}
            />
            <p className="text-[12px] text-ink font-medium truncate">{project.title}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {renderFormatTag(project.format)}
            {platInfo && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                style={{ backgroundColor: platInfo.color + '18', color: platInfo.color }}
              >
                {platInfo.label}
              </span>
            )}
            <span className="text-[9px] text-ink-muted lowercase ml-auto">{visual.label}</span>
          </div>
        </button>
      )
    }

    if (rowDensity === 'compact') {
      return (
        <button
          key={project.id}
          onClick={() => handleCardClick(project.id)}
          aria-label={`${project.title} — ${visual.ariaLabel}`}
          className={`pipeline-row w-full grid items-center gap-2.5 h-8 px-3 rounded-md border border-line bg-surface text-left hover:border-blueprint/40 transition-colors ${glowClass} ${mutedClass}`}
          style={{ gridTemplateColumns: '10px minmax(0,1fr) auto auto auto auto' }}
        >
          <span
            aria-hidden="true"
            className="inline-block w-[7px] h-[7px] rounded-full shrink-0"
            style={{ backgroundColor: visual.tokenVar }}
          />
          <span className="text-[13px] text-ink font-medium truncate">{project.title}</span>
          {renderFormatTag(project.format)}
          {platInfo && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: platInfo.color + '18', color: platInfo.color }}
            >
              {platInfo.label}
            </span>
          )}
          <span className="text-[10px] text-ink-muted lowercase min-w-[56px] text-right tabular-nums">
            {visual.label}
          </span>
          <span className="text-[10px] text-ink-muted tabular-nums min-w-[44px] text-right">
            {project.scheduled_date
              ? new Date(project.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : '—'}
          </span>
        </button>
      )
    }

    // Comfortable row (existing layout) with status dot prefix
    return (
      <button
        key={project.id}
        onClick={() => handleCardClick(project.id)}
        aria-label={`${project.title} — ${visual.ariaLabel}`}
        className={`pipeline-row card-hover stagger-in flex items-center gap-3 bg-surface border border-line rounded-md px-4 py-3 text-left w-full group hover:border-blueprint/40 ${glowClass} ${mutedClass}`}
      >
        <span
          aria-hidden="true"
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: visual.tokenVar }}
        />
        <p className="flex-1 text-sm text-ink font-medium truncate">{project.title}</p>
        <div className="flex items-center gap-2 shrink-0">
          {renderFormatTag(project.format, 'md')}
          {platInfo && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: platInfo.color + '18', color: platInfo.color }}
            >
              {platInfo.label}
            </span>
          )}
          {project.scheduled_date && (
            <span className="text-[10px] text-ink-muted tabular-nums">
              {new Date(project.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          <span className="text-[10px] text-ink-muted lowercase min-w-[56px] text-right">
            {visual.label}
          </span>
        </div>
      </button>
    )
  }

  // Inline stage-count summary — uses the 3 coarse pipeline stages.
  const stageSummary = PIPELINE_STAGES.map(stage => ({
    label: stage.label.toLowerCase(),
    count: projects.filter(p => stage.statuses.includes(p.status)).length,
  }))

  return (
    <div className="p-8 max-w-6xl md:pr-40">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-1">Projects</p>
          <h2 className="text-2xl font-light text-ink">Content Pipeline</h2>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === 'list' && (
            <div className="flex border border-line rounded-md overflow-hidden" title="Row density">
              <button
                onClick={() => updatePipelinePrefs({ rowDensity: 'compact' })}
                className={`p-2 text-sm transition-colors ${rowDensity === 'compact' ? 'bg-blueprint text-white' : 'text-ink-muted hover:bg-canvas'}`}
                title="Compact rows"
                aria-pressed={rowDensity === 'compact'}
              >
                <Rows3 size={16} />
              </button>
              <button
                onClick={() => updatePipelinePrefs({ rowDensity: 'comfortable' })}
                className={`p-2 text-sm transition-colors ${rowDensity === 'comfortable' ? 'bg-blueprint text-white' : 'text-ink-muted hover:bg-canvas'}`}
                title="Comfortable rows"
                aria-pressed={rowDensity === 'comfortable'}
              >
                <Rows2 size={16} />
              </button>
            </div>
          )}
          <div className="flex border border-line rounded-md overflow-hidden">
            <button
              onClick={() => updatePipelinePrefs({ viewMode: 'list' })}
              className={`p-2 text-sm transition-colors ${viewMode === 'list' ? 'bg-blueprint text-white' : 'text-ink-muted hover:bg-canvas'}`}
              title="List view"
              aria-pressed={viewMode === 'list'}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => updatePipelinePrefs({ viewMode: 'board' })}
              className={`p-2 text-sm transition-colors ${viewMode === 'board' ? 'bg-blueprint text-white' : 'text-ink-muted hover:bg-canvas'}`}
              title="Board view"
              aria-pressed={viewMode === 'board'}
            >
              <Columns3 size={16} />
            </button>
          </div>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blueprint text-white rounded-md text-sm hover:bg-blueprint-dark transition-colors"
          >
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      {/* Inline stage summary */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
        {stageSummary.map((s, i) => (
          <span key={s.label} className="flex items-center gap-3">
            <span><span className="text-ink font-medium tabular-nums">{s.count}</span> {s.label}</span>
            {i < stageSummary.length - 1 && <span className="text-line">·</span>}
          </span>
        ))}
        {!showReady && readyCount > 0 && (
          <span className="text-ink-muted">
            · <span className="tabular-nums">{readyCount}</span> ready hidden
          </span>
        )}
      </div>

      {/* Ready visibility toggle chip. Only visible when ready items exist. */}
      {readyCount > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button
            onClick={() => updatePipelinePrefs({ showReady: !showReady })}
            className={`text-[11px] inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-colors ${
              showReady
                ? 'border-success/40 bg-success-light/20 text-success'
                : 'border-line text-ink-muted bg-surface hover:border-blueprint/40'
            }`}
            aria-pressed={showReady}
            title={showReady ? 'Hide ready items' : 'Show ready items'}
          >
            <span
              aria-hidden="true"
              className="inline-block w-[7px] h-[7px] rounded-full"
              style={{ backgroundColor: 'var(--status-ready)' }}
            />
            {showReady
              ? <>Showing ready ({readyCount}) — click to hide</>
              : <>Ready hidden ({readyCount}) — click to show</>}
          </button>
        </div>
      )}

      {/* Quick Add — title + format picker. */}
      {adding && (
        <div className="mb-6 bg-surface border border-line rounded-lg p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-3">Quick add</p>
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Project title..."
            autoFocus
            className="input w-full mb-3"
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') setAdding(false)
            }}
          />
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mr-1">Format</span>
            {CONTENT_FORMATS.map(f => {
              const active = newFormat === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setNewFormat(f.id)}
                  className={`rounded-full px-3 py-1 text-[11px] border transition-colors ${
                    active
                      ? 'bg-blueprint-light text-blueprint border-blueprint'
                      : 'bg-canvas border-line text-ink-secondary hover:border-blueprint/40'
                  }`}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-sm text-ink-muted hover:text-ink">Cancel</button>
            <button onClick={handleAdd} className="px-4 py-1.5 bg-blueprint text-white rounded-md text-sm">Create & Open</button>
          </div>
        </div>
      )}

      {/* ─── BOARD VIEW ─────────────────────────────────── */}
      {/*
        3 columns: Ideation · In Process · Posted.
        No horizontal scroll (equal 1fr columns). No column background tile —
        cards sit directly on the canvas. Empty columns render nothing but the
        header, keeping the surface quiet.
      */}
      {viewMode === 'board' && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {PIPELINE_STAGES.map(stage => {
            const items = filtered.filter(p => stage.statuses.includes(p.status))
            return (
              <div key={stage.id} className="min-w-0">
                <div className="flex items-center gap-1.5 mb-3 px-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted truncate">{stage.label}</p>
                  <span className="text-[10px] text-ink-muted tabular-nums">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map(project => renderProjectCard(project, true))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── LIST VIEW ──────────────────────────────────── */}
      {/*
        Two-level grouping: stage → scheduled_date.
        Both levels collapsible; date keys are composite (`${stageId}:${dateKey}`)
        to avoid collision with stage keys.
      */}
      {viewMode === 'list' && (
        <>
          {PIPELINE_STAGES.map(stage => {
            const items = filtered.filter(p => stage.statuses.includes(p.status))
            if (items.length === 0) return null
            const isStageCollapsed = collapsed[stage.id]
            const dateGroups = groupByScheduledDate(items)

            return (
              <div key={stage.id} className="mb-6">
                <button onClick={() => toggleGroup(stage.id)} className="flex items-center gap-2 mb-3 group">
                  {isStageCollapsed ? <ChevronRight size={14} className="text-ink-muted" /> : <ChevronDown size={14} className="text-ink-muted" />}
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">{stage.label}</p>
                  <span className="text-[10px] bg-canvas text-ink-muted px-1.5 py-0.5 rounded-full">{items.length}</span>
                </button>

                {!isStageCollapsed && (
                  <div className="space-y-3">
                    {dateGroups.map(([dateKey, dateItems]) => {
                      const groupKey = `${stage.id}:${dateKey}`
                      const isDateCollapsed = collapsed[groupKey]
                      return (
                        <div key={groupKey}>
                          <button
                            onClick={() => toggleGroup(groupKey)}
                            className="flex items-center gap-2 mb-1.5 pl-1 w-full text-left"
                          >
                            {isDateCollapsed
                              ? <ChevronRight size={12} className="text-ink-muted" />
                              : <ChevronDown size={12} className="text-ink-muted" />}
                            <span className="text-[11px] text-ink-secondary font-medium tabular-nums">
                              {formatDateLabel(dateKey)}
                            </span>
                            <span className="text-[10px] text-ink-muted">·</span>
                            <span className="text-[10px] text-ink-muted tabular-nums">{dateItems.length}</span>
                            <span className="flex-1 h-px bg-line/60 ml-2" />
                          </button>
                          {!isDateCollapsed && (
                            <div className="space-y-1.5">
                              {dateItems.map(project => renderProjectCard(project))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {filtered.length === 0 && !adding && (
        <div className="text-center py-20">
          <p className="text-ink-muted text-sm">No projects yet. Create your first one above.</p>
        </div>
      )}
    </div>
  )
}
