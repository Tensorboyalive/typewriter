import { useState } from 'react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronDown, ChevronRight, Clock, Link, List, Columns3 } from 'lucide-react'
import { useStore } from '../store'
import { STATUSES, CONTENT_FORMATS, PLATFORMS, type Platform, type ContentFormat } from '../types'

type ViewMode = 'list' | 'board'

export function Kanban() {
  const { projects, addProject, activeChannel } = useStore()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newFormat, setNewFormat] = useState<ContentFormat>('reel')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const toggleGroup = (id: string) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  const filtered = projects

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
    if (project) navigate(`/projects/${project.id}`)
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

  const renderProjectCard = (project: typeof projects[0], compact = false) => {
    const platInfo = PLATFORMS.find(p => p.id === project.platform)

    if (compact) {
      return (
        <div
          key={project.id}
          onClick={() => navigate(`/projects/${project.id}`)}
          className="bg-surface border border-line rounded-md px-3 py-2 cursor-pointer hover:shadow-sm hover:border-blueprint/40 transition-all"
        >
          <p className="text-[12px] text-ink font-medium truncate mb-1.5">{project.title}</p>
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
            {project.deadline && (
              <span className="text-[9px] text-warning flex items-center gap-0.5">
                <Clock size={9} />
                {new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {project.is_brand_deal && (
              <span className="text-[8px] px-1 py-0.5 rounded bg-warning-light text-warning font-medium">$</span>
            )}
          </div>
        </div>
      )
    }

    return (
      <div
        key={project.id}
        onClick={() => navigate(`/projects/${project.id}`)}
        className="flex items-center gap-3 bg-surface border border-line rounded-md px-4 py-3 cursor-pointer group hover:shadow-sm hover:border-blueprint/40 transition-all"
      >
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
          {project.deadline && (
            <span className="text-[10px] text-warning flex items-center gap-0.5">
              <Clock size={10} />
              {new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {project.delivery_link && <Link size={10} className="text-success" />}
          {project.is_brand_deal && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-warning-light text-warning font-medium">$</span>
          )}
        </div>
      </div>
    )
  }

  // Inline stage-count summary (replaces the old right-side dock)
  const stageSummary = STATUSES.map(s => ({
    label: s.label.toLowerCase(),
    count: projects.filter(p => p.status === s.id).length,
  }))

  return (
    <div className="p-8 max-w-6xl md:pr-40">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-1">Projects</p>
          <h2 className="text-2xl font-light text-ink">Content Pipeline</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-line rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 text-sm transition-colors ${viewMode === 'list' ? 'bg-blueprint text-white' : 'text-ink-muted hover:bg-canvas'}`}
              title="List view"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`p-2 text-sm transition-colors ${viewMode === 'board' ? 'bg-blueprint text-white' : 'text-ink-muted hover:bg-canvas'}`}
              title="Board view"
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
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
        {stageSummary.map((s, i) => (
          <span key={s.label} className="flex items-center gap-3">
            <span><span className="text-ink font-medium tabular-nums">{s.count}</span> {s.label}</span>
            {i < stageSummary.length - 1 && <span className="text-line">·</span>}
          </span>
        ))}
      </div>

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
      {viewMode === 'board' && (
        <div className="overflow-x-auto -mx-2 px-2">
          <div className="grid gap-3 min-w-max" style={{ gridTemplateColumns: `repeat(${STATUSES.length}, minmax(180px, 1fr))` }}>
            {STATUSES.map(status => {
              const items = filtered.filter(p => p.status === status.id)
              return (
                <div key={status.id} className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-2 px-1">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted truncate">{status.label}</p>
                    <span className="text-[10px] bg-canvas text-ink-muted px-1.5 py-0.5 rounded-full shrink-0">{items.length}</span>
                  </div>
                  <div className="space-y-2 bg-ink/[0.04] dark:bg-ink/[0.08] rounded-lg p-1.5 min-h-[200px]">
                    {items.map(project => renderProjectCard(project, true))}
                    {items.length === 0 && (
                      <p className="text-[10px] text-ink-muted text-center py-8 italic">Empty</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── LIST VIEW ──────────────────────────────────── */}
      {viewMode === 'list' && (
        <>
          {STATUSES.map(status => {
            const items = filtered.filter(p => p.status === status.id)
            if (items.length === 0) return null
            const isCollapsed = collapsed[status.id]

            return (
              <div key={status.id} className="mb-4">
                <button onClick={() => toggleGroup(status.id)} className="flex items-center gap-2 mb-2 group">
                  {isCollapsed ? <ChevronRight size={14} className="text-ink-muted" /> : <ChevronDown size={14} className="text-ink-muted" />}
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">{status.label}</p>
                  <span className="text-[10px] bg-canvas text-ink-muted px-1.5 py-0.5 rounded-full">{items.length}</span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-1.5">
                    {items.map(project => renderProjectCard(project))}
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
