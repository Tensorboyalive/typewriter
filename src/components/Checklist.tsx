import { useState } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { Plus, ChevronLeft, ChevronRight, Circle, CheckCircle2, MinusCircle, AlertCircle, X, Wand2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useStore } from '../store'
import { CHECKLIST_CATEGORIES, type ChecklistCategory, type ChecklistStatus } from '../types'
import { supabase } from '../lib/supabase'
import { Eyebrow } from './editorial/Eyebrow'
import { cn } from '../lib/cn'

const STATUS_ICONS: Record<ChecklistStatus, typeof Circle> = {
  pending: Circle,
  done: CheckCircle2,
  skipped: MinusCircle,
  blocked: AlertCircle,
}

const STATUS_COLORS: Record<ChecklistStatus, string> = {
  pending: 'text-muted',
  done: 'text-success',
  skipped: 'text-warning',
  blocked: 'text-danger',
}

export function Checklist() {
  const { user, checklistItems, addChecklistItem, updateChecklistItem, deleteChecklistItem, projects, applyDailyTemplate, checklistTemplates } = useStore()
  const [date, setDate] = useState(new Date())
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ChecklistCategory>('custom')
  const [items, setItems] = useState(checklistItems)
  const [loading, setLoading] = useState(false)
  const [autoFilling, setAutoFilling] = useState(false)
  const [recapOpen, setRecapOpen] = useState(false)

  const dateStr = format(date, 'yyyy-MM-dd')
  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr

  const fetchForDate = async (d: Date) => {
    setDate(d)
    setLoading(true)
    const { data } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('user_id', user!.id)
      .eq('date', format(d, 'yyyy-MM-dd'))
      .order('created_at')
    setItems(data ?? [])
    setLoading(false)
  }

  const displayItems = isToday ? checklistItems : items

  const doneCount = displayItems.filter(i => i.status === 'done').length
  const totalCount = displayItems.length
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const handleAdd = async () => {
    if (!title.trim()) return
    await addChecklistItem({ title: title.trim(), category, date: dateStr })
    setTitle('')
    setAdding(false)
    if (!isToday) fetchForDate(date)
  }

  const cycleStatus = async (id: string, current: ChecklistStatus) => {
    const order: ChecklistStatus[] = ['pending', 'done', 'skipped', 'blocked']
    const next = order[(order.indexOf(current) + 1) % order.length]
    if (isToday) {
      await updateChecklistItem(id, { status: next })
    } else {
      const payload: Record<string, unknown> = { status: next }
      if (next === 'done') payload.completed_at = new Date().toISOString()
      await supabase.from('checklist_items').update(payload).eq('id', id)
      fetchForDate(date)
    }
  }

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      if (isToday) {
        await deleteChecklistItem(id)
      } else {
        await supabase.from('checklist_items').update({ archived_at: new Date().toISOString() }).eq('id', id)
        fetchForDate(date)
      }
      setDeletingId(null)
    } catch {
      setDeletingId(null)
    }
  }

  const handleApplyTemplate = async () => {
    setAutoFilling(true)
    await applyDailyTemplate(dateStr)
    const todayProjects = projects.filter(p =>
      p.scheduled_date && format(new Date(p.scheduled_date), 'yyyy-MM-dd') === dateStr
    )
    const existingTitles = new Set(displayItems.map(i => i.title))
    for (const proj of todayProjects) {
      const itemTitle = proj.format ? `${proj.title} — ${proj.format}` : proj.title
      if (existingTitles.has(itemTitle)) continue
      await addChecklistItem({ title: itemTitle, category: 'content', date: dateStr })
    }
    if (!isToday) await fetchForDate(date)
    setAutoFilling(false)
  }

  const eodDone = displayItems.filter(i => i.status === 'done').length
  const eodPending = displayItems.filter(i => i.status === 'pending').length
  const eodSkipped = displayItems.filter(i => i.status === 'skipped').length
  const eodBlocked = displayItems.filter(i => i.status === 'blocked').length

  const grouped = CHECKLIST_CATEGORIES.map(cat => ({
    ...cat,
    items: displayItems.filter(i => i.category === cat.id),
  })).filter(g => g.items.length > 0)

  const ungrouped = displayItems.filter(i => !CHECKLIST_CATEGORIES.find(c => c.id === i.category))

  return (
    <div className="mx-auto w-full max-w-[900px] px-6 py-10 md:px-10 md:py-16">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>daily ops · checklist</Eyebrow>
          <h1
            className="serif mt-6 leading-[0.95] tracking-[-0.02em] text-ink"
            style={{ fontSize: 'clamp(2.25rem, calc(1rem + 2.5vw), 3.5rem)' }}
          >
            one list, <span className="serif-italic">done by dusk.</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleApplyTemplate}
            disabled={autoFilling}
            title={`apply ${checklistTemplates.filter(t => t.is_active).length} template items + scheduled projects`}
            className="mono inline-flex items-center gap-2 border border-ink/15 px-4 py-2 text-[0.65rem] uppercase tracking-[0.24em] text-muted transition-colors hover:border-viral hover:text-viral disabled:opacity-50"
          >
            <Wand2 size={13} /> {autoFilling ? 'applying…' : 'apply template'}
          </button>
          <button
            onClick={() => setAdding(true)}
            className="mono inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.24em] text-cream transition hover:bg-viral hover:text-ink"
          >
            <Plus size={12} strokeWidth={2} /> add task
          </button>
        </div>
      </div>

      {/* Date nav + progress */}
      <div className="mt-10 rule-top rule-bottom flex flex-wrap items-center gap-x-6 gap-y-4 border-ink/10 py-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchForDate(subDays(date, 1))}
            aria-label="previous day"
            className="p-1 text-muted hover:text-viral"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <p className="serif text-[1.15rem] leading-tight text-ink">
              {isToday ? 'today' : format(date, 'EEEE').toLowerCase()}
            </p>
            <p className="mono text-[0.58rem] uppercase tracking-[0.28em] text-muted">
              {format(date, 'MMMM d, yyyy').toLowerCase()}
            </p>
          </div>
          <button
            onClick={() => fetchForDate(addDays(date, 1))}
            aria-label="next day"
            className="p-1 text-muted hover:text-viral"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex-1" />
        <div className="text-right">
          <p className="serif text-[2.25rem] leading-none text-ink tnum">{pct}%</p>
          <p className="mono mt-1 text-[0.58rem] uppercase tracking-[0.28em] text-muted tnum">
            {doneCount}/{totalCount} done
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-5 h-[3px] w-full bg-ink/10">
        <div className="h-full bg-viral transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>

      {/* Add drawer */}
      {adding && (
        <div className="mt-8 rule-bottom border-ink/10 bg-paper/60 p-6">
          <Eyebrow>new task</Eyebrow>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mono mr-2 text-[0.58rem] uppercase tracking-[0.28em] text-muted">category ·</span>
            {CHECKLIST_CATEGORIES.map(c => {
              const active = category === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    'mono inline-flex items-center gap-1.5 px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.24em] transition-colors',
                    active ? 'text-ink' : 'text-muted hover:text-ink',
                  )}
                  style={active ? { boxShadow: `inset 0 -2px 0 ${c.color}` } : undefined}
                >
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: c.color }}
                  />
                  {c.label.toLowerCase()}
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex items-end gap-3">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="task…"
              autoFocus
              className="input-underline flex-1"
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
            />
            <button
              onClick={handleAdd}
              className="mono inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.24em] text-cream transition hover:bg-viral hover:text-ink"
            >
              add
            </button>
          </div>
        </div>
      )}

      {/* States */}
      {loading && (
        <p className="mono mt-10 py-4 text-center text-[0.62rem] uppercase tracking-[0.24em] text-muted">
          loading…
        </p>
      )}

      {!loading && displayItems.length === 0 && (
        <p className="mono mt-10 py-8 text-center text-[0.7rem] uppercase tracking-[0.24em] text-muted">
          no tasks for this day.
        </p>
      )}

      {/* Grouped items */}
      <div className="mt-8 space-y-10">
        {grouped.map(group => (
          <section key={group.id}>
            <div className="mb-3 flex items-center gap-3">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: group.color }}
              />
              <Eyebrow rule={false}>{group.label.toLowerCase()}</Eyebrow>
              <span className="mono text-[0.6rem] uppercase tracking-[0.26em] text-muted tnum">
                {group.items.filter(i => i.status === 'done').length}/{group.items.length}
              </span>
            </div>
            <ul className="divide-y divide-ink/10 rule-top rule-bottom">
              {group.items.map(item => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  deleting={deletingId === item.id}
                  onCycle={() => cycleStatus(item.id, item.status as ChecklistStatus)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </ul>
          </section>
        ))}

        {ungrouped.length > 0 && (
          <section>
            <Eyebrow rule={false}>uncategorized</Eyebrow>
            <ul className="mt-3 divide-y divide-ink/10 rule-top rule-bottom">
              {ungrouped.map(item => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  deleting={deletingId === item.id}
                  onCycle={() => cycleStatus(item.id, item.status as ChecklistStatus)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* EOD Summary */}
      {displayItems.length > 0 && (
        <div className="mt-12 rule-top pt-5">
          <button
            onClick={() => setRecapOpen(!recapOpen)}
            className="mono inline-flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.28em] text-muted hover:text-ink"
          >
            {recapOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            today&apos;s recap
          </button>
          {recapOpen && (
            <div className="mt-5 grid grid-cols-4 gap-px rounded-sm border border-ink/10 bg-ink/10">
              <RecapTile n={eodDone} label="done" color="text-success" />
              <RecapTile n={eodPending} label="pending" color="text-ink" />
              <RecapTile n={eodSkipped} label="skipped" color="text-warning" />
              <RecapTile n={eodBlocked} label="blocked" color="text-danger" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ChecklistRow({ item, deleting, onCycle, onDelete }: {
  item: { id: string; title: string; status: string; skip_reason?: string | null }
  deleting: boolean
  onCycle: () => void
  onDelete: () => void
}) {
  const Icon = STATUS_ICONS[item.status as ChecklistStatus]
  const color = STATUS_COLORS[item.status as ChecklistStatus]
  const done = item.status === 'done'
  return (
    <li className="group flex items-center gap-4 py-3 -mx-2 px-2 transition-colors hover:bg-paper/60">
      <button
        onClick={onCycle}
        className={cn(color, 'transition-opacity hover:opacity-70', done && 'tick-pop')}
        aria-label="cycle status"
      >
        <Icon size={18} strokeWidth={1.6} />
      </button>
      <span className={cn(
        'serif flex-1 text-[1rem] leading-tight',
        done ? 'text-muted line-through' : 'text-ink',
      )}>
        {item.title}
      </span>
      {item.skip_reason && (
        <span className="mono text-[0.6rem] uppercase tracking-[0.24em] text-warning">
          {item.skip_reason}
        </span>
      )}
      <button
        onClick={onDelete}
        disabled={deleting}
        aria-label="delete task"
        className="p-1 text-muted opacity-0 transition-all hover:text-danger group-hover:opacity-100 disabled:opacity-100"
      >
        {deleting ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
      </button>
    </li>
  )
}

function RecapTile({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className="bg-paper p-4 text-center">
      <p className={cn('serif text-[1.75rem] leading-none tnum', color)}>{n}</p>
      <p className="mono mt-2 text-[0.58rem] uppercase tracking-[0.28em] text-muted">{label}</p>
    </div>
  )
}
