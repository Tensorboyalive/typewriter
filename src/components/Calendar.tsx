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
import { Select } from './Select'
import { Eyebrow } from './editorial/Eyebrow'
import { cn } from '../lib/cn'

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
    <div className="mx-auto w-full max-w-[1280px] px-6 py-10 md:px-10 md:py-16 md:pr-36">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>the grid · schedule</Eyebrow>
          <h1
            className="serif mt-6 leading-[0.95] tracking-[-0.02em] text-ink"
            style={{ fontSize: 'clamp(2.5rem, calc(1rem + 3vw), 4rem)' }}
          >
            {format(current, 'MMMM')}{' '}
            <span className="serif-italic text-muted">{format(current, 'yyyy')}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrent(subMonths(current, 1))}
            aria-label="previous month"
            className="border border-ink/15 p-2 text-muted transition-colors hover:text-viral hover:border-viral"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => setCurrent(new Date())}
            className="mono border border-ink/15 px-4 py-2 text-[0.65rem] uppercase tracking-[0.24em] text-muted transition-colors hover:text-viral hover:border-viral"
          >
            today
          </button>
          <button
            onClick={() => setCurrent(addMonths(current, 1))}
            aria-label="next month"
            className="border border-ink/15 p-2 text-muted transition-colors hover:text-viral hover:border-viral"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Day-of-week headers — editorial mono eyebrows */}
      <div className="mt-10 grid grid-cols-7 rule-bottom pb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div
            key={d}
            className="mono text-center text-[0.58rem] uppercase tracking-[0.3em] text-muted"
          >
            {d.toLowerCase()}
          </div>
        ))}
      </div>

      {/* Month grid — hairline bordered tiles, 1px inner */}
      <div className="mt-0 grid grid-cols-7 gap-px border-l border-t border-ink/10 bg-ink/10">
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
              className={cn(
                'min-h-28 cursor-pointer border-r border-b border-ink/10 p-2 transition-colors',
                !inMonth && 'bg-paper/40 text-muted/60',
                inMonth && weekend && 'bg-paper/80',
                inMonth && !weekend && 'bg-paper',
                'hover:bg-cream',
                selected && 'bg-cream ring-2 ring-viral ring-inset',
              )}
            >
              <span
                className={cn(
                  'mono inline-flex h-6 w-6 items-center justify-center text-[0.72rem] tabular-nums',
                  today && 'bg-viral text-ink font-medium rounded-full',
                  !today && weekend && inMonth && 'text-viral',
                  !today && !weekend && inMonth && 'text-ink',
                  !today && !inMonth && 'text-muted/60',
                )}
              >
                {format(day, 'd')}
              </span>
              <div className="mt-1 space-y-1">
                {dayProjects.map(p => (
                  <button
                    key={p.id}
                    onClick={e => {
                      e.stopPropagation()
                      navigate(`/projects/${p.id}`)
                    }}
                    className="mono block w-full truncate bg-viral/90 px-1.5 py-0.5 text-left text-[0.6rem] uppercase tracking-[0.18em] text-ink transition-colors hover:bg-ink hover:text-cream"
                    title={p.title}
                  >
                    {p.title || 'untitled'}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick-add form for selected date */}
      {selectedDate && (
        <div className="mt-8 sheet-in max-w-2xl rule-top rule-bottom border-ink/10 bg-paper/60 p-6">
          <div className="flex items-baseline justify-between">
            <Eyebrow>schedule · {format(selectedDate, 'EEEE, MMM d').toLowerCase()}</Eyebrow>
            <button
              onClick={() => setSelectedDate(null)}
              aria-label="close"
              className="text-muted hover:text-ink"
            >
              <X size={15} />
            </button>
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-4">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="project title…"
              autoFocus
              className="input-underline flex-1 min-w-[200px]"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <Select
              value={newFormat}
              onChange={val => setNewFormat(val as ContentFormat)}
              options={CONTENT_FORMATS.map(f => ({ value: f.id, label: f.label }))}
            />
            <button
              onClick={handleAdd}
              className="mono inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.24em] text-cream transition hover:bg-viral hover:text-ink"
            >
              add
            </button>
          </div>

          {/* Existing projects for the selected day */}
          {getProjectsForDay(selectedDate).length > 0 && (
            <div className="mt-6 rule-top pt-5">
              <p className="mono text-[0.6rem] uppercase tracking-[0.28em] text-muted">
                on this day · click to open
              </p>
              <ul className="mt-3 divide-y divide-ink/10 rule-top">
                {getProjectsForDay(selectedDate).map(p => (
                  <li key={p.id}>
                    <button
                      onClick={() => navigate(`/projects/${p.id}`)}
                      className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-cream -mx-2 px-2"
                    >
                      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-viral" />
                      <span className="serif flex-1 truncate text-[0.98rem] text-ink">{p.title || 'untitled'}</span>
                      <span className="mono shrink-0 text-[0.58rem] uppercase tracking-[0.26em] text-muted">{p.status}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
