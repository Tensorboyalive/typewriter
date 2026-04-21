import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, addDays, subDays, parseISO, isBefore, startOfDay } from 'date-fns'
import { Pin, Plus, Trash2, Target, ChevronDown, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { useStore } from '../store'
import { PersonaSwitcher } from './PersonaSwitcher'
import type { TimeBlock, ChecklistItem, Project } from '../types'
import { cn } from '../lib/cn'

// ── Constants ────────────────────────────────────────────────────────
// Full 24h day. 60px per hour → 1440px total. Each 15-min slot = 15px.
const HOUR_PX = 60
const START_HOUR = 0
const END_HOUR = 24
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const SNAP_MIN = 15 // snap increment for resize/drag

const minToLabel = (m: number) => {
  const h = Math.floor(m / 60) % 24
  const mm = m % 60
  const period = h >= 12 ? 'pm' : 'am'
  const h12 = ((h + 11) % 12) + 1
  return mm === 0 ? `${h12}${period}` : `${h12}:${String(mm).padStart(2, '0')}${period}`
}

const clampMin = (m: number) => Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, m))
const snap = (m: number) => Math.round(m / SNAP_MIN) * SNAP_MIN

interface AddModalState {
  date: string
  start_min: number
  end_min: number
}

const DRAG_MIME = 'application/x-tw-block'

export function Today() {
  const { persona, timeBlocks, fetchTimeBlocks, addTimeBlock, updateTimeBlock, deleteTimeBlock, setMIT,
    checklistItems, projects, allProjects } = useStore()
  const navigate = useNavigate()

  const [displayDate, setDisplayDate] = useState<Date>(() => new Date())
  const dateKey = format(displayDate, 'yyyy-MM-dd')
  const isToday = dateKey === format(new Date(), 'yyyy-MM-dd')
  const isPast = isBefore(startOfDay(displayDate), startOfDay(new Date()))

  const [nowMin, setNowMin] = useState(() => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  })
  const [addModal, setAddModal] = useState<AddModalState | null>(null)
  const [mitPicker, setMitPicker] = useState(false)
  const [trayOpen, setTrayOpen] = useState(true)
  const railRef = useRef<HTMLDivElement>(null)

  // Refetch when date or persona changes
  useEffect(() => {
    fetchTimeBlocks(dateKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey, persona])

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date()
      setNowMin(d.getHours() * 60 + d.getMinutes())
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  // Auto-scroll current time into view on first mount
  useEffect(() => {
    if (!railRef.current) return
    const offset = Math.max(0, (nowMin - START_HOUR * 60) * (HOUR_PX / 60) - 120)
    railRef.current.scrollTo({ top: offset, behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const myBlocks = useMemo(
    () => timeBlocks.filter(b => b.persona === persona && b.date === dateKey),
    [timeBlocks, persona, dateKey],
  )
  const mit = myBlocks.find(b => b.is_mit) ?? null

  const usedProjectIds = new Set(myBlocks.map(b => b.project_id).filter(Boolean) as string[])
  const usedChecklistIds = new Set(myBlocks.map(b => b.checklist_item_id).filter(Boolean) as string[])

  const trayChecklist = checklistItems.filter(
    c => c.status !== 'done' && !usedChecklistIds.has(c.id),
  )
  const trayProjects = allProjects.filter(
    p => p.scheduled_date?.split('T')[0] === dateKey && !usedProjectIds.has(p.id),
  )

  const nowOffsetPx = (nowMin - START_HOUR * 60) * (HOUR_PX / 60)
  const showNowLine = isToday && nowMin >= START_HOUR * 60 && nowMin < END_HOUR * 60

  const handleMoveToTomorrow = async (block: TimeBlock) => {
    const nextDay = format(addDays(parseISO(block.date), 1), 'yyyy-MM-dd')
    await updateTimeBlock(block.id, { date: nextDay })
  }

  // Drop handler on the hour grid — compute new start_min from drop Y offset.
  // dataTransfer payload carries the block id and its duration (minutes).
  // [contract preserved byte-identical]
  const handleGridDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData(DRAG_MIME)
    if (!raw) return
    const [id, durStr] = raw.split('|')
    const duration = Number(durStr) || 60
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const minsFromTop = (y / HOUR_PX) * 60 + START_HOUR * 60
    const newStart = snap(clampMin(minsFromTop))
    const newEnd = clampMin(newStart + duration)
    await updateTimeBlock(id, { start_min: newStart, end_min: newEnd })
  }

  return (
    <div className="flex h-full flex-col bg-cream">
      {/* Header with eyebrow + serif day/date */}
      <div className="rule-bottom border-ink/10 bg-paper/70 px-6 py-5 pr-4 md:px-10 md:pr-44">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="mono text-[0.62rem] uppercase tracking-[0.28em] text-muted">
              the day · time-blocked
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => setDisplayDate(d => subDays(d, 1))}
                aria-label="previous day"
                className="p-1 text-muted hover:text-viral"
              >
                <ChevronLeft size={18} />
              </button>
              <h1
                className="serif leading-[1] tracking-[-0.02em] text-ink tnum"
                style={{ fontSize: 'clamp(1.5rem, calc(1rem + 1vw), 2.25rem)' }}
              >
                {format(displayDate, 'EEEE, MMMM d')}
              </h1>
              <button
                onClick={() => setDisplayDate(d => addDays(d, 1))}
                aria-label="next day"
                className="p-1 text-muted hover:text-viral"
              >
                <ChevronRight size={18} />
              </button>
              {!isToday && (
                <button
                  onClick={() => setDisplayDate(new Date())}
                  className="mono ml-1 border-b border-viral/60 px-1 pb-0.5 text-[0.62rem] uppercase tracking-[0.24em] text-viral"
                >
                  today
                </button>
              )}
            </div>
          </div>
          <div className="shrink-0">
            <PersonaSwitcher />
          </div>
        </div>

        <MITSlot
          mit={mit}
          onPick={() => setMitPicker(true)}
          onClear={() => mit && deleteTimeBlock(mit.id)}
          onOpen={() => mit?.project_id && navigate(`/projects/${mit.project_id}`)}
          projects={allProjects}
          checklist={checklistItems}
        />
      </div>

      {/* Body: rail + tray */}
      <div className="flex flex-1 overflow-hidden">
        {/* Hourly rail */}
        <div ref={railRef} className={cn(
          'relative flex-1 overflow-auto',
          trayOpen ? 'pb-[55vh] md:pb-0' : 'pb-16 md:pb-0',
        )}>
          <div
            className="relative"
            style={{ height: (END_HOUR - START_HOUR) * HOUR_PX }}
            onDragOver={e => e.preventDefault()}
            onDrop={handleGridDrop}
          >
            {HOURS.map(h => (
              <HourRow
                key={h}
                hour={h}
                onAdd={() => setAddModal({ date: dateKey, start_min: h * 60, end_min: (h + 1) * 60 })}
              />
            ))}

            {showNowLine && (
              <div
                className="pointer-events-none absolute inset-x-0 z-20"
                style={{ top: nowOffsetPx }}
              >
                <div className="h-px bg-danger" />
                <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-danger" />
              </div>
            )}

            {myBlocks.map(b => (
              <BlockCard
                key={b.id}
                block={b}
                projects={allProjects}
                isPast={isPast}
                onDelete={() => deleteTimeBlock(b.id)}
                onOpen={() => b.project_id && navigate(`/projects/${b.project_id}`)}
                onRelabel={(label) => updateTimeBlock(b.id, { label })}
                onResize={(endMin) => updateTimeBlock(b.id, { end_min: endMin })}
                onMoveToTomorrow={() => handleMoveToTomorrow(b)}
              />
            ))}
          </div>
        </div>

        <TrayPanel
          open={trayOpen}
          onToggle={() => setTrayOpen(o => !o)}
          checklist={trayChecklist}
          projects={trayProjects}
          onAssign={async (kind, item) => {
            const baseHour = isToday
              ? Math.max(START_HOUR, Math.min(END_HOUR - 1, Math.floor(nowMin / 60)))
              : 9
            await addTimeBlock({
              date: dateKey,
              start_min: baseHour * 60,
              end_min: (baseHour + 1) * 60,
              project_id: kind === 'project' ? item.id : null,
              checklist_item_id: kind === 'checklist' ? item.id : null,
              label: kind === 'project' ? (item as Project).title : (item as ChecklistItem).title,
            })
          }}
        />
      </div>

      {addModal && (
        <AddBlockModal
          state={addModal}
          projects={projects}
          checklist={checklistItems}
          onClose={() => setAddModal(null)}
          onSubmit={async (payload) => {
            await addTimeBlock({ ...payload, date: addModal.date, start_min: addModal.start_min, end_min: addModal.end_min })
            setAddModal(null)
          }}
        />
      )}

      {mitPicker && (
        <MITPickerModal
          checklist={checklistItems}
          projects={allProjects}
          onClose={() => setMitPicker(false)}
          onPick={async (ref) => {
            await setMIT(dateKey, ref)
            setMitPicker(false)
          }}
        />
      )}
    </div>
  )
}

// ─── Subcomponents ─────────────────────────────────────────────────

function MITSlot({ mit, onPick, onClear, onOpen, projects, checklist }: {
  mit: TimeBlock | null
  onPick: () => void
  onClear: () => void
  onOpen: () => void
  projects: Project[]
  checklist: ChecklistItem[]
}) {
  let title: string | null = null
  let isDone = false
  if (mit) {
    if (mit.project_id) {
      const p = projects.find(p => p.id === mit.project_id)
      title = p?.title ?? mit.label
      isDone = p?.status === 'posted'
    }
    else if (mit.checklist_item_id) {
      const c = checklist.find(c => c.id === mit.checklist_item_id)
      title = c?.title ?? mit.label
      isDone = c?.status === 'done'
    }
    else title = mit.label
  }
  const [pulse, setPulse] = useState(false)
  const prevDone = useRef(isDone)
  useEffect(() => {
    if (isDone && !prevDone.current) {
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 220)
      return () => clearTimeout(t)
    }
    prevDone.current = isDone
  }, [isDone])

  const filled = Boolean(mit && title)

  return (
    <div
      className={cn(
        'mt-4 flex items-center gap-3 rule-top rule-bottom border-ink/10 px-2 py-3 transition-transform duration-200',
        filled ? 'bg-viral/15' : 'bg-transparent',
        pulse && 'scale-[1.02] bg-success/15',
      )}
    >
      <Target size={15} className={cn('shrink-0', filled ? 'text-viral' : 'text-muted')} />
      {filled ? (
        <>
          <div className="min-w-0 flex-1">
            <p className="mono text-[0.6rem] uppercase tracking-[0.28em] text-viral">
              most important today
            </p>
            <button
              onClick={onOpen}
              className="serif mt-1 block w-full truncate text-left text-[1.1rem] leading-tight text-ink hover:text-viral"
            >
              {title}
            </button>
          </div>
          <button
            onClick={onClear}
            aria-label="clear mit"
            className="p-1 text-muted hover:text-danger"
          >
            <Trash2 size={13} />
          </button>
        </>
      ) : (
        <button
          onClick={onPick}
          className="mono flex-1 text-left text-[0.72rem] uppercase tracking-[0.24em] text-muted hover:text-viral"
        >
          pin the one thing that makes today a win →
        </button>
      )}
    </div>
  )
}

function HourRow({ hour, onAdd }: { hour: number; onAdd: () => void }) {
  return (
    <div
      onClick={onAdd}
      className="group absolute inset-x-0 cursor-pointer border-t border-ink/10 transition-colors hover:bg-paper/60"
      style={{ top: (hour - START_HOUR) * HOUR_PX, height: HOUR_PX }}
    >
      <span className="mono absolute left-3 top-1 text-[0.58rem] uppercase tracking-[0.24em] text-muted tnum">
        {minToLabel(hour * 60)}
      </span>
      <Plus size={13} className="absolute right-3 top-2 text-muted opacity-0 group-hover:opacity-100" />
    </div>
  )
}

function BlockCard({ block, projects, isPast, onDelete, onOpen, onRelabel, onResize, onMoveToTomorrow }: {
  block: TimeBlock
  projects: Project[]
  isPast: boolean
  onDelete: () => void
  onOpen: () => void
  onRelabel: (label: string) => void
  onResize: (endMin: number) => void
  onMoveToTomorrow: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(block.label ?? '')
  const [liveEndMin, setLiveEndMin] = useState<number | null>(null)

  const top = (block.start_min - START_HOUR * 60) * (HOUR_PX / 60)
  const effectiveEnd = liveEndMin ?? block.end_min
  const height = Math.max(24, (effectiveEnd - block.start_min) * (HOUR_PX / 60) - 4)
  const proj = block.project_id ? projects.find(p => p.id === block.project_id) : null
  const title = proj?.title ?? block.label ?? 'untitled'

  // Pointer-based bottom-edge resize — logic preserved byte-identical
  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    e.preventDefault()
    const startY = e.clientY
    const startEnd = block.end_min
    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - startY
      const deltaMin = (dy / HOUR_PX) * 60
      const nextEnd = snap(clampMin(Math.max(block.start_min + SNAP_MIN, startEnd + deltaMin)))
      setLiveEndMin(nextEnd)
    }
    const up = () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      setLiveEndMin(committed => {
        if (committed != null && committed !== block.end_min) onResize(committed)
        return null
      })
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
  }

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData(DRAG_MIME, `${block.id}|${block.end_min - block.start_min}`)
      }}
      className={cn(
        'sheet-in absolute left-16 right-2 z-10 cursor-grab overflow-hidden px-3 py-1.5 active:cursor-grabbing',
        block.is_mit
          ? 'bg-viral text-ink'
          : 'bg-paper border border-ink/10 hover:border-viral',
      )}
      style={{ top: top + 2, height }}
    >
      <div className="flex h-full items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn(
            'mono text-[0.58rem] uppercase tracking-[0.24em] tnum',
            block.is_mit ? 'text-ink/80' : 'text-muted',
          )}>
            {minToLabel(block.start_min)} · {minToLabel(effectiveEnd)}
            {block.is_mit && ' · mit'}
          </p>
          {editing ? (
            <input
              autoFocus
              value={label}
              onChange={e => setLabel(e.target.value)}
              onBlur={() => { onRelabel(label); setEditing(false) }}
              onKeyDown={e => { if (e.key === 'Enter') { onRelabel(label); setEditing(false) } }}
              className="serif mt-0.5 w-full border-b border-current bg-transparent text-[0.95rem] outline-none"
            />
          ) : (
            <button
              onClick={() => (proj ? onOpen() : setEditing(true))}
              className={cn(
                'serif mt-0.5 block w-full truncate text-left text-[0.95rem] leading-tight',
                block.is_mit ? 'text-ink' : 'text-ink hover:text-viral',
              )}
            >
              {title}
            </button>
          )}
          {isPast && (
            <button
              onClick={onMoveToTomorrow}
              className={cn(
                'mono mt-0.5 inline-flex items-center gap-0.5 text-[0.55rem] uppercase tracking-[0.24em]',
                block.is_mit ? 'text-ink/80' : 'text-muted hover:text-viral',
              )}
              title="move to tomorrow"
            >
              <ArrowRight size={10} /> tomorrow
            </button>
          )}
        </div>
        <button
          onClick={onDelete}
          className={cn(
            'p-0.5 opacity-60 hover:opacity-100',
            block.is_mit ? 'text-ink' : 'text-muted hover:text-danger',
          )}
          aria-label="delete block"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Bottom resize handle — pointer events only, does not trigger drag. */}
      <div
        onPointerDown={startResize}
        onDragStart={e => e.preventDefault()}
        className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
        style={{ touchAction: 'none' }}
      />
    </div>
  )
}

function TrayPanel({ checklist, projects, onAssign, open, onToggle }: {
  checklist: ChecklistItem[]
  projects: Project[]
  onAssign: (kind: 'checklist' | 'project', item: ChecklistItem | Project) => void
  open: boolean
  onToggle: () => void
}) {
  const empty = checklist.length === 0 && projects.length === 0

  return (
    <>
      <aside className="hidden w-64 flex-col overflow-hidden border-l border-ink/10 bg-paper/40 md:flex">
        <div className="rule-bottom px-4 py-4">
          <p className="mono text-[0.62rem] uppercase tracking-[0.28em] text-muted">
            unscheduled
          </p>
          <p className="mono mt-1 text-[0.58rem] uppercase tracking-[0.26em] text-muted/70">
            tap to drop into now
          </p>
        </div>
        <div className="flex-1 space-y-1 overflow-auto p-2">
          {empty && (
            <p className="mono px-2 py-4 text-[0.62rem] uppercase tracking-[0.24em] text-muted">
              all caught up.
            </p>
          )}
          {projects.map(p => (
            <TrayItem key={`p-${p.id}`} label={p.title} kind="project" onClick={() => onAssign('project', p)} />
          ))}
          {checklist.map(c => (
            <TrayItem key={`c-${c.id}`} label={c.title} kind="checklist" onClick={() => onAssign('checklist', c)} />
          ))}
        </div>
      </aside>

      {/* Mobile bottom drawer */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex max-h-[50vh] flex-col border-t border-ink/10 bg-paper md:hidden">
        <button
          onClick={onToggle}
          className="mono flex items-center justify-between px-4 py-3 text-[0.62rem] uppercase tracking-[0.28em] text-muted"
        >
          <span>unscheduled ({checklist.length + projects.length})</span>
          <ChevronDown size={14} className={cn('chev-toggle', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="space-y-1 overflow-auto border-t border-ink/10 p-2">
            {empty && (
              <p className="mono px-2 py-4 text-[0.62rem] uppercase tracking-[0.24em] text-muted">
                all caught up.
              </p>
            )}
            {projects.map(p => (
              <TrayItem key={`p-${p.id}`} label={p.title} kind="project" onClick={() => onAssign('project', p)} />
            ))}
            {checklist.map(c => (
              <TrayItem key={`c-${c.id}`} label={c.title} kind="checklist" onClick={() => onAssign('checklist', c)} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function TrayItem({ label, kind, onClick }: { label: string; kind: 'project' | 'checklist'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-2 px-2 py-2 text-left transition-colors hover:bg-cream"
    >
      <span className={cn(
        'mono px-1.5 py-0.5 text-[0.54rem] uppercase tracking-[0.22em]',
        kind === 'project' ? 'bg-viral/20 text-viral' : 'bg-ink/5 text-muted',
      )}>
        {kind === 'project' ? 'proj' : 'todo'}
      </span>
      <span className="serif truncate text-[0.92rem] text-ink group-hover:text-viral">{label || 'untitled'}</span>
    </button>
  )
}

function AddBlockModal({ state, projects, checklist, onClose, onSubmit }: {
  state: AddModalState
  projects: Project[]
  checklist: ChecklistItem[]
  onClose: () => void
  onSubmit: (payload: { label?: string | null; project_id?: string | null; checklist_item_id?: string | null }) => void
}) {
  const [label, setLabel] = useState('')
  const [projectId, setProjectId] = useState<string>('')
  const [checklistId, setChecklistId] = useState<string>('')

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div
        className="sheet-in w-full max-w-md rule-top rule-bottom border-ink/10 bg-paper p-6"
        onClick={e => e.stopPropagation()}
      >
        <p className="mono text-[0.62rem] uppercase tracking-[0.28em] text-muted">add · block</p>
        <p className="serif mt-2 text-[1.5rem] leading-tight text-ink tnum">
          {minToLabel(state.start_min)} · {minToLabel(state.end_min)}
        </p>

        <label className="mono mt-6 block text-[0.58rem] uppercase tracking-[0.28em] text-muted">label</label>
        <input
          autoFocus
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="what will you do?"
          className="input-underline mt-1"
        />

        <label className="mono mt-5 block text-[0.58rem] uppercase tracking-[0.28em] text-muted">
          link to project (optional)
        </label>
        <select
          value={projectId}
          onChange={e => { setProjectId(e.target.value); if (e.target.value) setChecklistId('') }}
          className="mono mt-2 w-full border-b border-ink/20 bg-transparent py-2 text-[0.85rem] outline-none focus:border-viral"
        >
          <option value="">· none ·</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>

        <label className="mono mt-5 block text-[0.58rem] uppercase tracking-[0.28em] text-muted">
          or checklist item
        </label>
        <select
          value={checklistId}
          onChange={e => { setChecklistId(e.target.value); if (e.target.value) setProjectId('') }}
          className="mono mt-2 w-full border-b border-ink/20 bg-transparent py-2 text-[0.85rem] outline-none focus:border-viral"
        >
          <option value="">· none ·</option>
          {checklist.filter(c => c.status !== 'done').map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>

        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="mono text-[0.68rem] uppercase tracking-[0.24em] text-muted hover:text-ink"
          >
            cancel
          </button>
          <button
            onClick={() => onSubmit({
              label: label || null,
              project_id: projectId || null,
              checklist_item_id: checklistId || null,
            })}
            className="mono inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.24em] text-cream transition hover:bg-viral hover:text-ink"
          >
            add block
          </button>
        </div>
      </div>
    </div>
  )
}

function MITPickerModal({ checklist, projects, onClose, onPick }: {
  checklist: ChecklistItem[]
  projects: Project[]
  onClose: () => void
  onPick: (ref: { project_id?: string | null; checklist_item_id?: string | null; label?: string | null }) => void
}) {
  const [custom, setCustom] = useState('')
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayProjects = projects.filter(p => p.scheduled_date?.split('T')[0] === today || !p.scheduled_date)

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div
        className="sheet-in w-full max-w-md rule-top rule-bottom border-ink/10 bg-paper p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center gap-2">
          <Pin size={13} className="text-viral" />
          <p className="mono text-[0.62rem] uppercase tracking-[0.28em] text-viral">pin your mit</p>
        </div>
        <p className="serif mt-2 text-[1.4rem] leading-tight text-ink">
          one thing that makes today a <span className="serif-italic">win</span>.
        </p>

        <div className="mt-6 flex items-end gap-3">
          <input
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="write it yourself…"
            className="input-underline flex-1"
          />
          <button
            disabled={!custom.trim()}
            onClick={() => onPick({ label: custom.trim() })}
            className="mono inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.24em] text-cream transition hover:bg-viral hover:text-ink disabled:opacity-40 disabled:pointer-events-none"
          >
            pin
          </button>
        </div>

        <p className="mono mt-8 text-[0.58rem] uppercase tracking-[0.28em] text-muted">
          from pipeline
        </p>
        <div className="mt-2 max-h-40 divide-y divide-ink/10 overflow-auto rule-top rule-bottom">
          {todayProjects.slice(0, 12).map(p => (
            <button
              key={p.id}
              onClick={() => onPick({ project_id: p.id, label: p.title })}
              className="serif flex w-full items-center gap-2 px-2 py-2 text-left text-[0.95rem] text-ink hover:bg-cream"
            >
              <span className="mono shrink-0 text-[0.54rem] uppercase tracking-[0.22em] text-muted">proj</span>
              <span className="flex-1 truncate">{p.title}</span>
            </button>
          ))}
          {todayProjects.length === 0 && (
            <p className="mono px-2 py-3 text-[0.6rem] uppercase tracking-[0.24em] text-muted">
              no projects.
            </p>
          )}
        </div>

        <p className="mono mt-6 text-[0.58rem] uppercase tracking-[0.28em] text-muted">
          from checklist
        </p>
        <div className="mt-2 max-h-40 divide-y divide-ink/10 overflow-auto rule-top rule-bottom">
          {checklist.filter(c => c.status !== 'done').slice(0, 12).map(c => (
            <button
              key={c.id}
              onClick={() => onPick({ checklist_item_id: c.id, label: c.title })}
              className="serif flex w-full items-center gap-2 px-2 py-2 text-left text-[0.95rem] text-ink hover:bg-cream"
            >
              <span className="mono shrink-0 text-[0.54rem] uppercase tracking-[0.22em] text-muted">todo</span>
              <span className="flex-1 truncate">{c.title}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="mono text-[0.68rem] uppercase tracking-[0.24em] text-muted hover:text-ink"
          >
            close
          </button>
        </div>
      </div>
    </div>
  )
}
