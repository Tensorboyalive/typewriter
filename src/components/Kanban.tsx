import { useState } from 'react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronDown, ChevronRight, Clock, Link, List, Columns3, UserPlus } from 'lucide-react'
import { useStore } from '../store'
import { STATUSES, CONTENT_TYPES, PLATFORMS, type ContentType, type Platform } from '../types'

type ViewMode = 'list' | 'board'

export function Kanban() {
  const { projects, addProject, updateProject, teamMembers, effectiveRole } = useStore()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<ContentType>('reel')
  const [newPlatform, setNewPlatform] = useState<Platform>('tb')
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all')

  const canAssign = effectiveRole === 'admin' || effectiveRole === 'pa'

  const toggleGroup = (id: string) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  const filtered = platformFilter === 'all'
    ? projects
    : projects.filter(p => p.platform === platformFilter)

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    const project = await addProject({
      title: newTitle.trim(),
      type: newType,
      platform: newPlatform,
      status: 'idea',
      scheduled_date: newDate,
    })
    setNewTitle('')
    setAdding(false)
    if (project) navigate(`/projects/${project.id}`)
  }

  const handleQuickAssign = async (e: React.MouseEvent, projectId: string, userId: string) => {
    e.stopPropagation()
    await updateProject(projectId, {
      assigned_to: userId || null,
      status: userId ? 'assigned' : undefined,
    } as any)
  }

  const renderProjectCard = (project: typeof projects[0], compact = false) => {
    const typeInfo = CONTENT_TYPES.find(t => t.id === project.type)
    const platInfo = PLATFORMS.find(p => p.id === project.platform)
    const assignee = teamMembers.find(m => m.user_id === project.assigned_to)

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
          {/* Quick assign */}
          {canAssign && (
            <div className="mt-1.5 flex items-center gap-1">
              <UserPlus size={10} className="text-ink-muted" />
              <select
                value={project.assigned_to ?? ''}
                onClick={e => e.stopPropagation()}
                onChange={e => handleQuickAssign(e as any, project.id, e.target.value)}
                className="text-[10px] bg-transparent border-none text-ink-muted outline-none cursor-pointer max-w-[80px] truncate"
              >
                <option value="">Unassigned</option>
                {teamMembers.filter(m => m.role === 'editor').map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.profile_name}</option>
                ))}
              </select>
            </div>
          )}
          {!canAssign && assignee && (
            <p className="text-[10px] text-ink-muted mt-1">{assignee.profile_name}</p>
          )}
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
          {canAssign && (
            <select
              value={project.assigned_to ?? ''}
              onClick={e => e.stopPropagation()}
              onChange={e => handleQuickAssign(e as any, project.id, e.target.value)}
              className="text-[10px] bg-canvas border border-line rounded px-1.5 py-0.5 text-ink-muted outline-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <option value="">Assign...</option>
              {teamMembers.filter(m => m.role === 'editor').map(m => (
                <option key={m.user_id} value={m.user_id}>{m.profile_name}</option>
              ))}
            </select>
          )}
          {assignee && (
            <span className="text-[10px] text-ink-muted">{assignee.profile_name}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl">
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

      {/* Platform filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setPlatformFilter('all')}
          className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
            platformFilter === 'all'
              ? 'border-blueprint bg-blueprint/10 text-blueprint'
              : 'border-line text-ink-secondary hover:border-ink-muted'
          }`}
        >
          All
        </button>
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            onClick={() => setPlatformFilter(p.id)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
              platformFilter === p.id
                ? 'border-transparent text-white'
                : 'border-line text-ink-secondary hover:border-ink-muted'
            }`}
            style={platformFilter === p.id ? { backgroundColor: p.color } : {}}
          >
            {p.label}
          </button>
        ))}
      </div>

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
          <div className="flex gap-2 mb-3 flex-wrap">
            <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted self-center mr-1">Type</p>
            {CONTENT_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setNewType(t.id)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  newType === t.id ? 'border-transparent text-white' : 'border-line text-ink-secondary hover:border-ink-muted'
                }`}
                style={newType === t.id ? { backgroundColor: t.color } : {}}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mb-3 flex-wrap">
            <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted self-center mr-1">Channel</p>
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => setNewPlatform(p.id)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  newPlatform === p.id ? 'border-transparent text-white' : 'border-line text-ink-secondary hover:border-ink-muted'
                }`}
                style={newPlatform === p.id ? { backgroundColor: p.color } : {}}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input value={newDate} onChange={e => setNewDate(e.target.value)} type="date" className="input" />
            <div className="flex-1" />
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-sm text-ink-muted hover:text-ink">Cancel</button>
            <button onClick={handleAdd} className="px-4 py-1.5 bg-blueprint text-white rounded-md text-sm">Create & Open</button>
          </div>
        </div>
      )}

      {/* Pipeline summary */}
      <div className="flex gap-4 mb-6">
        {STATUSES.map(s => {
          const count = filtered.filter(p => p.status === s.id).length
          return (
            <div key={s.id} className="text-center">
              <p className="text-xl font-light text-ink tabular-nums">{count}</p>
              <p className="text-[9px] uppercase tracking-wider text-ink-muted">{s.label}</p>
            </div>
          )
        })}
      </div>

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
  )
}
