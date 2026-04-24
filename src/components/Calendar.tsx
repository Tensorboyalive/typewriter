import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { CONTENT_FORMATS, type ContentFormat } from '../types'
import { STATUS_VISUAL } from '../lib/statusColors'
import { Select } from './Select'

export function Calendar() {
  const navigate = useNavigate()
  const { projects, addProject } = useStore()
  const [current, setCurrent] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newFormat, setNewFormat] = useState<ContentFormat>('reel')

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(monthEnd),
  })

  const getProjectsForDay = (date: Date) =>
    projects.filter(p => p.scheduled_date && isSameDay(new Date(p.scheduled_date), date))

  const handleAdd = () => {
    if (!newTitle.trim() || !selectedDate) return
    addProject({
      title: newTitle.trim(),
      format: newFormat,
      status: 'idea',
      scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
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
          const weekend = day.getDay() === 0 || day.getDay() === 6

          return (
            <div
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={`min-h-28 p-2 border-r border-b border-line cursor-pointer transition-colors
                ${!inMonth ? 'bg-ink/[0.04] dark:bg-ink/[0.08] text-ink-muted' : weekend ? 'bg-ink/[0.04] dark:bg-ink/[0.08] hover:bg-blueprint-light/20' : 'bg-surface hover:bg-blueprint-light/20'}
                ${selected ? 'ring-2 ring-blueprint ring-inset' : ''}`}
            >
              <span
                className={`text-sm inline-flex items-center justify-center w-7 h-7 rounded-full
                  ${today ? 'bg-blueprint text-white font-medium' : weekend && inMonth ? 'text-blueprint' : ''}`}
              >
                {format(day, 'd')}
              </span>
              <div className="mt-1 space-y-1">
                {dayProjects.map(p => {
                  const visual = STATUS_VISUAL[p.status]
                  return (
                    <button
                      key={p.id}
                      onClick={e => {
                        e.stopPropagation()
                        navigate(`/projects/${p.id}`)
                      }}
                      aria-label={`${p.title} \u2014 ${visual.ariaLabel}`}
                      className="flex items-center gap-1.5 w-full text-left text-[11px] px-1.5 py-0.5 rounded truncate font-medium hover:ring-1 hover:ring-blueprint transition-all bg-surface border border-line text-ink"
                      title={`${p.title} \u00b7 ${visual.label}`}
                    >
                      <span
                        aria-hidden="true"
                        className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: visual.tokenVar }}
                      />
                      <span className="truncate">{p.title}</span>
                    </button>
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
              value={newFormat}
              onChange={val => setNewFormat(val as ContentFormat)}
              options={CONTENT_FORMATS.map(f => ({ value: f.id, label: f.label }))}
            />
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blueprint text-white rounded-md text-sm hover:bg-blueprint-dark transition-colors"
            >
              Add
            </button>
          </div>

          {/* Show existing projects for selected day — click to open */}
          {getProjectsForDay(selectedDate).length > 0 && (
            <div className="mt-3 pt-3 border-t border-line-light space-y-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-1">
                On this day — click to open
              </p>
              {getProjectsForDay(selectedDate).map(p => {
                const visual = STATUS_VISUAL[p.status]
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="w-full flex items-center gap-2 text-sm text-ink-secondary text-left px-2 py-1.5 rounded-md hover:bg-canvas border border-transparent hover:border-line transition-all"
                  >
                    <span
                      aria-hidden="true"
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: visual.tokenVar }}
                    />
                    <span className="flex-1 truncate">{p.title}</span>
                    <span className="text-[10px] uppercase tracking-wider text-ink-muted shrink-0">{visual.label}</span>
                  </button>
                )
              })}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
