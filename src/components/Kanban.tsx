import { useState } from 'react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronDown, ChevronRight, Clock, Link, List, Columns3 } from 'lucide-react'
import { useStore } from '../store'
import { STATUSES, CONTENT_TYPES, PLATFORMS, type Platform } from '../types'

type ViewMode = 'list' | 'board'

export function Kanban() {
  const { projects, addProject, activeChannel } = useStore()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all')

  const toggleGroup = (id: string) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  const filtered = platformFilter === 'all'
    ? projects
    : projects.filter(p => p.platform === platformFilter)

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    // Sensible defaults — user will refine inside the project page.
    const defaultPlatform: Platform =
      (PLATFORMS.find(p => p.id === (activeChannel?.handle as Platform | undefined))?.id)
      ?? 'tb'
    const project = await addProject({
      title: newTitle.trim(),
      type: 'reel',
      platform: defaultPlatform,
      status: 'idea',
      scheduled_date: format(new Date(), 'yyyy-MM-dd'),
    })
    setNewTitle('')
    setAdding(false)
    if (project) navigate(`/projects/${project.id}`)
  }

  const renderProjectCard = (project: typeof projects[0], compact = false) => {
    const typeInfo = CONTENT_TYPES.find(t => t.id === project.type)
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
            <span
              className="text-[9px] px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: typeInfo?.color + '18', color: typeInfo?.color }}
            >
              {typeInfo?.label}
            </span>
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
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{ backgroundColor: typeInfo?.color + '18', color: typeInfo?.color }}
          >
            {typeInfo?.label}
          </span>
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

  // Count helpers for the right dock
  const platformCount = (pid: Platform) => projects.filter(p => p.platform === pid).length

  return (
    <div className="p-8 max-w-6xl flex gap-6">
      {/* ── Main content ───────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-1">Projects</p>
            <h2 className="text-2xl font-light text-ink">Content Pipeline</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
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

        {/* Quick Add — title-only. Picks set inside the project page. */}
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
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-sm text-ink-muted hover:text-ink">Cancel</button>
              <button onClick={handleAdd} className="px-4 py-1.5 bg-blueprint text-white rounded-md text-sm">Create & Open</button>
            </div>
          </div>
        )}

        {/* ─── BOARD VIEW ─────────────────────────────────── */}
        {viewMode === 'board' && (
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${STATUSES.length}, minmax(0, 1fr))` }}>
            {STATUSES.map(status => {
              const items = filtered.filter(p => p.status === status.id)
              return (
                <div key={status.id} className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-2 px-1">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted truncate">{status.label}</p>
                    <span className="text-[10px] bg-canvas text-ink-muted px-1.5 py-0.5 rounded-full shrink-0">{items.length}</span>
                  </div>
                  <div className="space-y-2 bg-canvas/50 rounded-lg p-1.5 min-h-[200px]">
                    {items.map(project => renderProjectCard(project, true))}
                    {items.length === 0 && (
                      <p className="text-[10px] text-ink-muted text-center py-8 italic">Empty</p>
                    )}
                  </div>
                </div>
              )
            })}
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
            <p className="text-ink-muted text-sm">
              {platformFilter !== 'all' ? 'No projects for this platform.' : 'No projects yet. Create your first one above.'}
            </p>
          </div>
        )}
      </div>

      {/* ── Right dock: channel filter + stage counts ─────────────── */}
      <aside className="w-48 shrink-0 hidden lg:flex flex-col gap-6 pt-14">
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-ink-muted mb-2 px-1">Channels</p>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setPlatformFilter('all')}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] border transition-colors ${
                platformFilter === 'all'
                  ? 'border-blueprint bg-blueprint/10 text-blueprint'
                  : 'border-transparent text-ink-secondary hover:bg-canvas'
              }`}
            >
              <span>All</span>
              <span className="text-[10px] text-ink-muted tabular-nums">{projects.length}</span>
            </button>
            {PLATFORMS.map(p => {
              const active = platformFilter === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setPlatformFilter(p.id)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] border transition-colors ${
                    active ? 'border-transparent text-white' : 'border-transparent text-ink-secondary hover:bg-canvas'
                  }`}
                  style={active ? { backgroundColor: p.color } : {}}
                >
                  <span className="flex items-center gap-2">
                    {!active && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />}
                    {p.label}
                  </span>
                  <span className={`text-[10px] tabular-nums ${active ? 'text-white/80' : 'text-ink-muted'}`}>{platformCount(p.id)}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-ink-muted mb-2 px-1">Stages</p>
          <div className="flex flex-col gap-1 px-2.5">
            {STATUSES.map(s => {
              const count = filtered.filter(p => p.status === s.id).length
              return (
                <div key={s.id} className="flex items-center justify-between text-[11px]">
                  <span className="text-ink-secondary">{s.label}</span>
                  <span className="text-ink tabular-nums">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </aside>
    </div>
  )
}
