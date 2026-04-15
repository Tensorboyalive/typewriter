import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, addDays, subDays, parseISO, isBefore, startOfDay } from 'date-fns'
import { Pin, Plus, Trash2, Target, ChevronDown, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { useStore } from '../store'
import { PersonaSwitcher } from './PersonaSwitcher'
import type { TimeBlock, ChecklistItem, Project } from '../types'

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
    <div className="h-full flex flex-col">
      {/* Header. pr reserves space for floating theme/music buttons top-right. */}
      <div className="px-4 sm:px-6 py-4 pr-4 md:pr-44 border-b border-line bg-surface/50">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-ink-muted">Today</p>
            <div className="flex items-center gap-2 mt-0.5">
              <button
                onClick={() => setDisplayDate(d => subDays(d, 1))}
                aria-label="Previous day"
                className="p-1 rounded hover:bg-canvas text-ink-muted hover:text-ink"
              >
                <ChevronLeft size={18} />
              </button>
              <h1 className="text-xl sm:text-2xl font-light text-ink tabular-nums">
                {format(displayDate, 'EEEE, MMMM d')}
              </h1>
              <button
                onClick={() => setDisplayDate(d => addDays(d, 1))}
                aria-label="Next day"
                className="p-1 rounded hover:bg-canvas text-ink-muted hover:text-ink"
              >
                <ChevronRight size={18} />
              </button>
              {!isToday && (
                <button
                  onClick={() => setDisplayDate(new Date())}
                  className="ml-1 px-2 py-1 text-[11px] uppercase tracking-wider text-blueprint border border-blueprint/40 rounded hover:bg-blueprint-light/50"
                >
                  Today
                </button>
              )}
            </div>
          </div>
          <div className="shrink-0">
            <PersonaSwitcher />
          </div>
        </div>

        <MITSlot mit={mit} onPick={() => setMitPicker(true)}
          onClear={() => mit && deleteTimeBlock(mit.id)}
          onOpen={() => mit?.project_id && navigate(`/projects/${mit.project_id}`)}
          projects={allProjects}
          checklist={checklistItems}
        />
      </div>

      {/* Body: rail + tray */}
      <div className="flex-1 flex overflow-hidden">
        {/* Hourly rail — scrollable container keeps the header put */}
        <div ref={railRef} className={`flex-1 overflow-auto relative md:pb-0 ${trayOpen ? 'pb-[55vh]' : 'pb-16'}`}>
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
                className="absolute left-0 right-0 pointer-events-none z-20"
                style={{ top: nowOffsetPx }}
              >
                <div className="h-px bg-danger" />
                <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-danger" />
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
  return (
    <div className={`mt-3 flex items-center gap-3 p-3 rounded-lg border border-blueprint/30 bg-blueprint-light/30 transition-transform duration-200 ${pulse ? 'scale-[1.03] bg-success/10' : ''}`}>
      <Target size={16} className="text-blueprint shrink-0" />
      {mit && title ? (
        <>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-blueprint">Most important today</p>
            <button onClick={onOpen} className="text-sm font-medium text-ink truncate block w-full text-left hover:underline">
              {title}
            </button>
          </div>
          <button onClick={onClear} title="Clear MIT"
            className="p-1 text-ink-muted hover:text-danger">
            <Trash2 size={14} />
          </button>
        </>
      ) : (
        <button onClick={onPick} className="flex-1 text-left text-sm text-ink-muted hover:text-blueprint">
          Pin your Most Important Task for today…
        </button>
      )}
    </div>
  )
}

function HourRow({ hour, onAdd }: { hour: number; onAdd: () => void }) {
  return (
    <div
      onClick={onAdd}
      className="absolute left-0 right-0 border-t border-line-light hover:bg-canvas/50 cursor-pointer group"
      style={{ top: (hour - START_HOUR) * HOUR_PX, height: HOUR_PX }}
    >
      <span className="absolute left-3 top-1 text-[10px] uppercase tracking-wider text-ink-muted">
        {minToLabel(hour * 60)}
      </span>
      <Plus size={14} className="absolute right-3 top-2 text-ink-muted opacity-0 group-hover:opacity-100" />
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
  // Local preview height during drag-resize so the UI is immediate. Commit
  // to the store on pointerup.
  const [liveEndMin, setLiveEndMin] = useState<number | null>(null)

  const top = (block.start_min - START_HOUR * 60) * (HOUR_PX / 60)
  const effectiveEnd = liveEndMin ?? block.end_min
  const height = Math.max(24, (effectiveEnd - block.start_min) * (HOUR_PX / 60) - 4)
  const proj = block.project_id ? projects.find(p => p.id === block.project_id) : null
  const title = proj?.title ?? block.label ?? 'Untitled'

  // Pointer-based bottom-edge resize. Document-level listeners so the drag
  // continues even if the pointer leaves the card, and are cleaned up on
  // pointerup to avoid leaks.
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
      className={`card-hover sheet-in cursor-grab active:cursor-grabbing absolute left-16 right-2 rounded-md px-2.5 py-1.5 shadow-sm border overflow-hidden z-10 ${
        block.is_mit
          ? 'bg-blueprint text-white border-blueprint-dark'
          : 'bg-surface border-line hover:border-blueprint'
      }`}
      style={{ top: top + 2, height }}
    >
      <div className="flex items-start justify-between gap-2 h-full">
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] uppercase tracking-wider ${block.is_mit ? 'text-white/70' : 'text-ink-muted'}`}>
            {minToLabel(block.start_min)} – {minToLabel(effectiveEnd)}
            {block.is_mit && ' · MIT'}
          </p>
          {editing ? (
            <input
              autoFocus
              value={label}
              onChange={e => setLabel(e.target.value)}
              onBlur={() => { onRelabel(label); setEditing(false) }}
              onKeyDown={e => { if (e.key === 'Enter') { onRelabel(label); setEditing(false) } }}
              className="text-sm bg-transparent outline-none border-b border-current w-full"
            />
          ) : (
            <button
              onClick={() => (proj ? onOpen() : setEditing(true))}
              className="text-sm font-medium text-left block w-full truncate hover:underline"
            >
              {title}
            </button>
          )}
          {isPast && (
            <button
              onClick={onMoveToTomorrow}
              className={`mt-0.5 text-[10px] inline-flex items-center gap-0.5 hover:underline ${
                block.is_mit ? 'text-white/80' : 'text-ink-muted hover:text-blueprint'
              }`}
              title="Move to tomorrow"
            >
              <ArrowRight size={10} /> Tomorrow
            </button>
          )}
        </div>
        <button onClick={onDelete} className={`p-0.5 opacity-60 hover:opacity-100 ${block.is_mit ? 'text-white' : 'text-ink-muted hover:text-danger'}`}>
          <Trash2 size={12} />
        </button>
      </div>

      {/* Bottom resize handle — pointer events only, does not trigger drag. */}
      <div
        onPointerDown={startResize}
        onDragStart={e => e.preventDefault()}
        className="absolute left-0 right-0 bottom-0 h-1.5 cursor-ns-resize"
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
      <aside className="hidden md:flex w-64 border-l border-line flex-col overflow-hidden bg-surface/30">
        <div className="px-3 py-3 border-b border-line-light">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Unscheduled</p>
          <p className="text-[11px] text-ink-muted mt-0.5">Tap to drop into now</p>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {empty && <p className="text-[12px] text-ink-muted px-2 py-4">All caught up.</p>}
          {projects.map(p => (
            <TrayItem key={`p-${p.id}`} label={p.title} kind="project" onClick={() => onAssign('project', p)} />
          ))}
          {checklist.map(c => (
            <TrayItem key={`c-${c.id}`} label={c.title} kind="checklist" onClick={() => onAssign('checklist', c)} />
          ))}
        </div>
      </aside>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-line z-20 max-h-[50vh] flex flex-col">
        <button
          onClick={onToggle}
          className="px-4 py-2 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-ink-muted"
        >
          <span>Unscheduled ({checklist.length + projects.length})</span>
          <ChevronDown size={14} className={`chev-toggle ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="overflow-auto p-2 space-y-1 border-t border-line-light">
            {empty && <p className="text-[12px] text-ink-muted px-2 py-4">All caught up.</p>}
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
      className="w-full text-left px-2 py-1.5 rounded text-[13px] text-ink-secondary hover:bg-canvas hover:text-ink border border-transparent hover:border-line flex items-center gap-2"
    >
      <span className={`text-[9px] uppercase tracking-wider px-1 py-0.5 rounded ${
        kind === 'project' ? 'bg-blueprint-light text-blueprint' : 'bg-canvas text-ink-muted'
      }`}>{kind === 'project' ? 'proj' : 'todo'}</span>
      <span className="truncate">{label}</span>
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
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="sheet-in w-full max-w-sm bg-surface rounded-xl border border-line shadow-xl p-4" onClick={e => e.stopPropagation()}>
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted mb-1">Add block</p>
        <p className="text-sm text-ink mb-3">{minToLabel(state.start_min)} – {minToLabel(state.end_min)}</p>

        <label className="text-[11px] uppercase tracking-wider text-ink-muted">Label</label>
        <input autoFocus value={label} onChange={e => setLabel(e.target.value)}
          placeholder="What will you do?"
          className="w-full mt-1 mb-3 px-2 py-1.5 text-sm bg-canvas border border-line rounded" />

        <label className="text-[11px] uppercase tracking-wider text-ink-muted">Link to project (optional)</label>
        <select value={projectId} onChange={e => { setProjectId(e.target.value); if (e.target.value) setChecklistId('') }}
          className="w-full mt-1 mb-3 px-2 py-1.5 text-sm bg-canvas border border-line rounded">
          <option value="">— none —</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>

        <label className="text-[11px] uppercase tracking-wider text-ink-muted">Or checklist item</label>
        <select value={checklistId} onChange={e => { setChecklistId(e.target.value); if (e.target.value) setProjectId('') }}
          className="w-full mt-1 mb-4 px-2 py-1.5 text-sm bg-canvas border border-line rounded">
          <option value="">— none —</option>
          {checklist.filter(c => c.status !== 'done').map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-ink-muted hover:text-ink">Cancel</button>
          <button
            onClick={() => onSubmit({
              label: label || null,
              project_id: projectId || null,
              checklist_item_id: checklistId || null,
            })}
            className="px-3 py-1.5 text-sm bg-blueprint text-white rounded hover:bg-blueprint-dark"
          >Add</button>
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
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="sheet-in w-full max-w-md bg-surface rounded-xl border border-line shadow-xl p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <Pin size={14} className="text-blueprint" />
          <p className="text-sm font-medium text-ink">Pin your MIT</p>
        </div>
        <p className="text-[11px] text-ink-muted mb-3">One thing that makes today a win.</p>

        <div className="flex gap-2 mb-4">
          <input value={custom} onChange={e => setCustom(e.target.value)}
            placeholder="Write it yourself…"
            className="flex-1 px-2 py-1.5 text-sm bg-canvas border border-line rounded" />
          <button disabled={!custom.trim()}
            onClick={() => onPick({ label: custom.trim() })}
            className="px-3 py-1.5 text-sm bg-blueprint text-white rounded disabled:opacity-40 hover:bg-blueprint-dark">
            Pin
          </button>
        </div>

        <p className="text-[11px] uppercase tracking-wider text-ink-muted mb-2">From pipeline</p>
        <div className="max-h-40 overflow-auto mb-3 space-y-0.5">
          {todayProjects.slice(0, 12).map(p => (
            <button key={p.id} onClick={() => onPick({ project_id: p.id, label: p.title })}
              className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-canvas text-ink-secondary truncate">
              {p.title}
            </button>
          ))}
          {todayProjects.length === 0 && <p className="text-[12px] text-ink-muted px-2">No projects.</p>}
        </div>

        <p className="text-[11px] uppercase tracking-wider text-ink-muted mb-2">From checklist</p>
        <div className="max-h-40 overflow-auto space-y-0.5">
          {checklist.filter(c => c.status !== 'done').slice(0, 12).map(c => (
            <button key={c.id} onClick={() => onPick({ checklist_item_id: c.id, label: c.title })}
              className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-canvas text-ink-secondary truncate">
              {c.title}
            </button>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-ink-muted hover:text-ink">Close</button>
        </div>
      </div>
    </div>
  )
}
