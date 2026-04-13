import { useState } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { Plus, ChevronLeft, ChevronRight, Circle, CheckCircle2, MinusCircle, AlertCircle, X, Wand2, ChevronDown, ChevronUp } from 'lucide-react'
import { useStore } from '../store'
import { CHECKLIST_CATEGORIES, type ChecklistCategory, type ChecklistStatus } from '../types'
import { supabase } from '../lib/supabase'

const STATUS_ICONS: Record<ChecklistStatus, typeof Circle> = {
  pending: Circle,
  done: CheckCircle2,
  skipped: MinusCircle,
  blocked: AlertCircle,
}

const STATUS_COLORS: Record<ChecklistStatus, string> = {
  pending: 'text-ink-muted',
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

  // Fetch items for selected date
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

  // Use store items for today, fetch for other dates
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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this checklist item?')) return
    if (isToday) {
      await deleteChecklistItem(id)
    } else {
      await supabase.from('checklist_items').update({ archived_at: new Date().toISOString() }).eq('id', id)
      fetchForDate(date)
    }
  }

  const handleApplyTemplate = async () => {
    setAutoFilling(true)
    await applyDailyTemplate(dateStr)
    // Also add project-based items
    const todayProjects = projects.filter(p =>
      p.scheduled_date && format(new Date(p.scheduled_date), 'yyyy-MM-dd') === dateStr
    )
    const existingTitles = new Set(displayItems.map(i => i.title))
    for (const proj of todayProjects) {
      const title = `${proj.title} — ${proj.type}`
      if (existingTitles.has(title)) continue
      await addChecklistItem({ title, category: 'content', date: dateStr })
    }
    if (!isToday) await fetchForDate(date)
    setAutoFilling(false)
  }

  // EOD Summary calculations
  const eodDone = displayItems.filter(i => i.status === 'done').length
  const eodPending = displayItems.filter(i => i.status === 'pending').length
  const eodSkipped = displayItems.filter(i => i.status === 'skipped').length
  const eodBlocked = displayItems.filter(i => i.status === 'blocked').length

  const grouped = CHECKLIST_CATEGORIES.map(cat => ({
    ...cat,
    items: displayItems.filter(i => i.category === cat.id),
  })).filter(g => g.items.length > 0)

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-1">Daily Ops</p>
          <h2 className="text-2xl font-light text-ink">Checklist</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleApplyTemplate}
            disabled={autoFilling}
            className="flex items-center gap-2 px-3 py-2 border border-line text-ink-secondary rounded-md text-sm hover:bg-canvas transition-colors disabled:opacity-50"
            title={`Apply ${checklistTemplates.filter(t => t.is_active).length} template items + scheduled projects`}
          >
            <Wand2 size={14} /> {autoFilling ? 'Applying...' : 'Apply Template'}
          </button>
          <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-blueprint text-white rounded-md text-sm hover:bg-blueprint-dark transition-colors">
            <Plus size={16} /> Add Task
          </button>
        </div>
      </div>

      {/* Date nav + progress */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => fetchForDate(subDays(date, 1))} className="p-1 rounded hover:bg-canvas text-ink-muted"><ChevronLeft size={18} /></button>
        <div className="text-center">
          <p className="text-sm font-medium text-ink">{isToday ? 'Today' : format(date, 'EEEE')}</p>
          <p className="text-[10px] text-ink-muted">{format(date, 'MMMM d, yyyy')}</p>
        </div>
        <button onClick={() => fetchForDate(addDays(date, 1))} className="p-1 rounded hover:bg-canvas text-ink-muted"><ChevronRight size={18} /></button>
        <div className="flex-1" />
        <div className="text-right">
          <p className="text-2xl font-light text-ink tabular-nums">{pct}%</p>
          <p className="text-[10px] text-ink-muted">{doneCount}/{totalCount} done</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-canvas rounded-full overflow-hidden mb-6">
        <div className="h-full bg-success rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      {adding && (
        <div className="mb-4 bg-surface border border-line rounded-lg p-4">
          <div className="flex gap-2 mb-3 flex-wrap">
            {CHECKLIST_CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${category === c.id ? 'border-transparent text-white' : 'border-line text-ink-secondary'}`}
                style={category === c.id ? { backgroundColor: c.color } : {}}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task..." autoFocus
              className="input flex-1" onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }} />
            <button onClick={handleAdd} className="px-4 py-2 bg-blueprint text-white rounded-md text-sm">Add</button>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-ink-muted py-4 text-center">Loading...</p>}

      {!loading && displayItems.length === 0 && (
        <p className="text-sm text-ink-muted py-8 text-center">No tasks for this day.</p>
      )}

      {/* Grouped items */}
      {grouped.map(group => (
        <div key={group.id} className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">{group.label}</p>
            <span className="text-[10px] text-ink-muted">{group.items.filter(i => i.status === 'done').length}/{group.items.length}</span>
          </div>
          <div className="space-y-1">
            {group.items.map(item => {
              const Icon = STATUS_ICONS[item.status as ChecklistStatus]
              const color = STATUS_COLORS[item.status as ChecklistStatus]
              return (
                <div key={item.id} className="flex items-center gap-3 bg-surface border border-line rounded-md px-3 py-2.5 group hover:shadow-sm transition-shadow">
                  <button onClick={() => cycleStatus(item.id, item.status as ChecklistStatus)} className={`${color} hover:opacity-70 transition-opacity`}>
                    <Icon size={18} />
                  </button>
                  <span className={`flex-1 text-sm ${item.status === 'done' ? 'line-through text-ink-muted' : 'text-ink'}`}>
                    {item.title}
                  </span>
                  {item.skip_reason && <span className="text-[10px] text-warning">{item.skip_reason}</span>}
                  <button onClick={() => handleDelete(item.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger-light text-ink-muted hover:text-danger transition-all">
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Ungrouped (if any items don't match categories) */}
      {displayItems.filter(i => !CHECKLIST_CATEGORIES.find(c => c.id === i.category)).length > 0 && (
        <div className="mb-4">
          {displayItems.filter(i => !CHECKLIST_CATEGORIES.find(c => c.id === i.category)).map(item => {
            const Icon = STATUS_ICONS[item.status as ChecklistStatus]
            const color = STATUS_COLORS[item.status as ChecklistStatus]
            return (
              <div key={item.id} className="flex items-center gap-3 bg-surface border border-line rounded-md px-3 py-2.5 group">
                <button onClick={() => cycleStatus(item.id, item.status as ChecklistStatus)} className={color}>
                  <Icon size={18} />
                </button>
                <span className={`flex-1 text-sm ${item.status === 'done' ? 'line-through text-ink-muted' : 'text-ink'}`}>{item.title}</span>
                <button onClick={() => handleDelete(item.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger-light text-ink-muted hover:text-danger">
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* EOD Summary */}
      {displayItems.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <button
            onClick={() => setRecapOpen(!recapOpen)}
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-ink-muted hover:text-ink transition-colors"
          >
            {recapOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Today's Recap
          </button>
          {recapOpen && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              <div className="bg-success/10 border border-success/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-light text-success tabular-nums">{eodDone}</p>
                <p className="text-[10px] text-success uppercase tracking-wider">Done</p>
              </div>
              <div className="bg-canvas border border-line rounded-lg p-3 text-center">
                <p className="text-2xl font-light text-ink tabular-nums">{eodPending}</p>
                <p className="text-[10px] text-ink-muted uppercase tracking-wider">Pending</p>
              </div>
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-light text-warning tabular-nums">{eodSkipped}</p>
                <p className="text-[10px] text-warning uppercase tracking-wider">Skipped</p>
              </div>
              <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-light text-danger tabular-nums">{eodBlocked}</p>
                <p className="text-[10px] text-danger uppercase tracking-wider">Blocked</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
