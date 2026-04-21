import { useState } from 'react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronDown, ChevronRight, Clock, Link, List, Columns3 } from 'lucide-react'
import { useStore } from '../store'
import { PIPELINE_STAGES, CONTENT_FORMATS, PLATFORMS, type Platform, type ContentFormat } from '../types'
import { HighlightChip } from './editorial/HighlightChip'
import { Eyebrow } from './editorial/Eyebrow'
import { cn } from '../lib/cn'

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

  const renderFormatTag = (fmt: ContentFormat | null | undefined) => {
    if (!fmt) return null
    const info = CONTENT_FORMATS.find(f => f.id === fmt)
    if (!info) return null
    return (
      <HighlightChip variant="orange" italic={false} className="mono shrink-0 text-[0.56rem] uppercase tracking-[0.22em]">
        {info.label.toLowerCase()}
      </HighlightChip>
    )
  }

  // Platform dot — data-viz color preserved, but reduced to a 1-char mono eyebrow.
  const renderPlatform = (pId: Platform) => {
    const info = PLATFORMS.find(p => p.id === pId)
    if (!info) return null
    return (
      <span className="mono inline-flex items-center gap-1 text-[0.56rem] uppercase tracking-[0.26em] text-muted">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: info.color }}
        />
        {info.label.toLowerCase()}
      </span>
    )
  }

  const renderProjectCard = (project: typeof projects[0], compact = false) => {
    const card = (
      <>
        <p className={cn(
          'serif leading-tight text-ink group-hover:text-viral',
          compact ? 'text-[0.98rem] line-clamp-2' : 'flex-1 truncate text-[1.05rem]',
        )}>
          {project.title || 'untitled'}
        </p>
        <div className={cn(
          'flex items-center gap-2 flex-wrap',
          compact ? 'mt-2' : 'shrink-0',
        )}>
          {renderFormatTag(project.format)}
          {renderPlatform(project.platform)}
          {project.scheduled_date && !compact && (
            <span className="mono text-[0.58rem] uppercase tracking-[0.24em] text-muted tnum">
              {new Date(project.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {project.deadline && (
            <span className="mono inline-flex items-center gap-1 text-[0.56rem] uppercase tracking-[0.24em] text-warning">
              <Clock size={9} />
              {new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {project.delivery_link && <Link size={10} className="text-success" />}
          {project.is_brand_deal && (
            <span className="mono text-[0.58rem] uppercase tracking-[0.24em] text-warning">
              brand deal
            </span>
          )}
        </div>
      </>
    )

    if (compact) {
      return (
        <button
          key={project.id}
          onClick={() => navigate(`/projects/${project.id}`)}
          className="group stagger-in flex w-full flex-col items-start rule-top border-ink/10 bg-paper p-4 text-left transition-colors hover:bg-cream"
        >
          {card}
        </button>
      )
    }

    return (
      <button
        key={project.id}
        onClick={() => navigate(`/projects/${project.id}`)}
        className="group stagger-in flex w-full items-start gap-6 py-4 text-left transition-colors hover:bg-paper/60 -mx-2 px-2"
      >
        {card}
      </button>
    )
  }

  // Inline stage-count summary — uses the 3 coarse pipeline stages.
  const stageSummary = PIPELINE_STAGES.map(stage => ({
    label: stage.label.toLowerCase(),
    count: projects.filter(p => stage.statuses.includes(p.status)).length,
  }))

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-10 md:px-10 md:py-16 md:pr-36">
      {/* Editorial header */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        <div className="md:col-span-8">
          <Eyebrow>projects · the pipeline</Eyebrow>
          <h1
            className="serif mt-6 leading-[0.95] tracking-[-0.02em] text-ink"
            style={{ fontSize: 'clamp(2.5rem, calc(1rem + 3vw), 4rem)' }}
          >
            every <span className="serif-italic">piece</span>,<br />
            in order.
          </h1>
        </div>
        <div className="md:col-span-4 md:self-end md:flex md:items-end md:justify-end md:gap-3">
          <div className="flex overflow-hidden rounded-full border border-ink/15">
            <button
              onClick={() => setViewMode('list')}
              aria-label="list view"
              aria-pressed={viewMode === 'list'}
              className={cn(
                'p-2.5 transition-colors',
                viewMode === 'list' ? 'bg-ink text-cream' : 'text-muted hover:text-ink',
              )}
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('board')}
              aria-label="board view"
              aria-pressed={viewMode === 'board'}
              className={cn(
                'p-2.5 transition-colors',
                viewMode === 'board' ? 'bg-ink text-cream' : 'text-muted hover:text-ink',
              )}
            >
              <Columns3 size={14} />
            </button>
          </div>
          <button
            onClick={() => setAdding(true)}
            className="mono ml-3 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.24em] text-cream transition hover:bg-viral hover:text-ink"
          >
            <Plus size={12} strokeWidth={2} /> new project
          </button>
        </div>
      </div>

      {/* Stage ribbon */}
      <div className="mt-10 rule-top rule-bottom flex flex-wrap items-baseline gap-x-8 gap-y-2 py-5">
        {stageSummary.map(s => (
          <div key={s.label} className="flex items-baseline gap-2">
            <span className="serif text-[1.5rem] leading-none text-ink tnum">{s.count}</span>
            <span className="mono text-[0.62rem] uppercase tracking-[0.26em] text-muted">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Quick Add drawer */}
      {adding && (
        <div className="mt-8 rule-bottom border-ink/10 bg-paper/60 p-6">
          <Eyebrow>quick add</Eyebrow>
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="project title…"
            autoFocus
            className="input-underline mt-4"
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') setAdding(false)
            }}
          />
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="mono mr-2 text-[0.58rem] uppercase tracking-[0.28em] text-muted">format ·</span>
            {CONTENT_FORMATS.map(f => {
              const active = newFormat === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setNewFormat(f.id)}
                  className={cn(
                    'mono px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.24em] transition-colors',
                    active ? 'bg-viral text-ink' : 'text-muted hover:text-ink',
                  )}
                >
                  {f.label.toLowerCase()}
                </button>
              )
            })}
          </div>
          <div className="mt-6 flex items-center justify-end gap-4">
            <button
              onClick={() => setAdding(false)}
              className="mono text-[0.68rem] uppercase tracking-[0.24em] text-muted hover:text-ink"
            >
              cancel
            </button>
            <button
              onClick={handleAdd}
              className="mono inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.24em] text-cream transition hover:bg-viral hover:text-ink"
            >
              create & open
            </button>
          </div>
        </div>
      )}

      {/* ─── BOARD VIEW ───────────────────────────────────── */}
      {viewMode === 'board' && (
        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
          {PIPELINE_STAGES.map(stage => {
            const items = filtered.filter(p => stage.statuses.includes(p.status))
            return (
              <div key={stage.id} className="min-w-0">
                <div className="flex items-baseline justify-between rule-bottom pb-3">
                  <Eyebrow rule={false}>{stage.label.toLowerCase()}</Eyebrow>
                  <span className="mono text-[0.68rem] uppercase tracking-[0.24em] text-muted tnum">{items.length}</span>
                </div>
                <div className="flex flex-col">
                  {items.length === 0 ? (
                    <p className="mono mt-6 text-[0.62rem] uppercase tracking-[0.24em] text-muted/70">
                      — empty —
                    </p>
                  ) : items.map(project => renderProjectCard(project, true))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── LIST VIEW ────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="mt-10">
          {PIPELINE_STAGES.map(stage => {
            const items = filtered.filter(p => stage.statuses.includes(p.status))
            if (items.length === 0) return null
            const isCollapsed = collapsed[stage.id]

            return (
              <section key={stage.id} className="mt-8 first:mt-0">
                <button
                  onClick={() => toggleGroup(stage.id)}
                  className="group mb-2 flex items-center gap-3"
                >
                  {isCollapsed
                    ? <ChevronRight size={14} className="text-muted transition-transform" />
                    : <ChevronDown size={14} className="text-muted transition-transform" />}
                  <Eyebrow rule={false}>{stage.label.toLowerCase()}</Eyebrow>
                  <span className="mono text-[0.62rem] uppercase tracking-[0.26em] text-muted tnum">
                    {items.length}
                  </span>
                </button>
                {!isCollapsed && (
                  <ul className="divide-y divide-ink/10 rule-top rule-bottom">
                    {items.map(project => (
                      <li key={project.id}>{renderProjectCard(project)}</li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}

      {filtered.length === 0 && !adding && (
        <div className="py-24 text-center">
          <p className="mono text-[0.7rem] uppercase tracking-[0.26em] text-muted">
            no projects yet. click new project to begin.
          </p>
        </div>
      )}
    </div>
  )
}
