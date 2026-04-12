import { useState } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useStore } from '../store'
import { CONTENT_TYPES, type ContentType } from '../types'
import { Select } from './Select'

export function Calendar() {
  const { projects, addProject } = useStore()
  const [current, setCurrent] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<ContentType>('reel')

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(monthEnd),
  })

  const getProjectsForDay = (date: Date) =>
    projects.filter(p => p.scheduledDate && isSameDay(new Date(p.scheduledDate), date))

  const handleAdd = () => {
    if (!newTitle.trim() || !selectedDate) return
    addProject({
      title: newTitle.trim(),
      type: newType,
      status: 'ideation',
      scheduledDate: selectedDate.toISOString(),
      script: '',
      description: '',
    })
    setNewTitle('')
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-1">
            Calendar
          </p>
          <h2 className="text-2xl font-light text-ink">
            {format(current, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrent(subMonths(current, 1))}
            className="p-2 rounded-md hover:bg-surface border border-line text-ink-secondary"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrent(new Date())}
            className="px-3 py-2 rounded-md hover:bg-surface border border-line text-sm text-ink-secondary"
          >
            Today
          </button>
          <button
            onClick={() => setCurrent(addMonths(current, 1))}
            className="p-2 rounded-md hover:bg-surface border border-line text-ink-secondary"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div
            key={d}
            className="text-[10px] uppercase tracking-[0.2em] text-ink-muted text-center py-2"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 border-t border-l border-line rounded-lg overflow-hidden">
        {days.map(day => {
          const dayProjects = getProjectsForDay(day)
          const inMonth = isSameMonth(day, current)
          const today = isToday(day)
          const selected = selectedDate && isSameDay(day, selectedDate)

          return (
            <div
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={`min-h-28 p-2 border-r border-b border-line cursor-pointer transition-colors
                ${!inMonth ? 'bg-canvas/60 text-ink-muted' : 'bg-surface hover:bg-blueprint-light/20'}
                ${selected ? 'ring-2 ring-blueprint ring-inset' : ''}`}
            >
              <span
                className={`text-sm inline-flex items-center justify-center w-7 h-7 rounded-full
                  ${today ? 'bg-blueprint text-white font-medium' : ''}`}
              >
                {format(day, 'd')}
              </span>
              <div className="mt-1 space-y-1">
                {dayProjects.map(p => {
                  const t = CONTENT_TYPES.find(ct => ct.id === p.type)
                  return (
                    <div
                      key={p.id}
                      className="text-[11px] px-1.5 py-0.5 rounded truncate font-medium"
                      style={{
                        backgroundColor: t?.color + '18',
                        color: t?.color,
                      }}
                    >
                      {p.title}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick-add form */}
      {selectedDate && (
        <div className="mt-6 bg-surface border border-line rounded-lg p-4 max-w-lg animate-in">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Schedule for {format(selectedDate, 'EEEE, MMM d')}
            </p>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-ink-muted hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Project title..."
              autoFocus
              className="input flex-1"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <Select
              value={newType}
              onChange={val => setNewType(val as ContentType)}
              options={CONTENT_TYPES.map(t => ({ value: t.id, label: t.label, color: t.color }))}
            />
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blueprint text-white rounded-md text-sm hover:bg-blueprint-dark transition-colors"
            >
              Add
            </button>
          </div>

          {/* Show existing projects for selected day */}
          {getProjectsForDay(selectedDate).length > 0 && (
            <div className="mt-3 pt-3 border-t border-line-light space-y-1">
              {getProjectsForDay(selectedDate).map(p => {
                const t = CONTENT_TYPES.find(ct => ct.id === p.type)
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 text-sm text-ink-secondary"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: t?.color }}
                    />
                    {p.title}
                    <span className="text-[10px] uppercase tracking-wider text-ink-muted">
                      {p.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
