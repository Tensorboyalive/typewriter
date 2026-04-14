import { useNavigate } from 'react-router-dom'
import {
  format,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  isToday,
  isSameDay,
  eachDayOfInterval,
} from 'date-fns'
import { Plus, ArrowRight, CheckSquare, BookOpen, CalendarClock } from 'lucide-react'
import { useStore } from '../store'
import { STATUSES, CONTENT_TYPES } from '../types'

export function Dashboard() {
  const navigate = useNavigate()
  const { channels, allProjects, allSessions, expenses, income, checklistItems, switchChannel } = useStore()

  const now = new Date()
  const hour = now.getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const monthExpenses = expenses.filter(e =>
    isWithinInterval(new Date(e.date), { start: monthStart, end: monthEnd }),
  )
  const monthIncome = income.filter(i =>
    isWithinInterval(new Date(i.date), { start: monthStart, end: monthEnd }),
  )
  const totalEarned = monthIncome.reduce((sum, i) => sum + i.amount, 0)
  const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0)
  const net = totalEarned - totalSpent

  const pipeline = STATUSES.map(s => ({
    ...s,
    count: allProjects.filter(p => p.status === s.id).length,
  }))
  const totalProjects = allProjects.length

  const weekStart = startOfWeek(now)
  const weekEnd = endOfWeek(now)
  const weekProjects = allProjects.filter(p =>
    isWithinInterval(new Date(p.created_at), { start: weekStart, end: weekEnd }),
  )

  const todaySessions = allSessions.filter(s => isToday(new Date(s.completed_at)))
  const totalSessionMinutes = todaySessions.reduce((sum, s) => sum + s.duration / 60, 0)

  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const weekSessionData = weekDays.map(day => ({
    day: format(day, 'EEE'),
    today: isToday(day),
    minutes: allSessions.filter(s => isSameDay(new Date(s.completed_at), day)).reduce((sum, s) => sum + s.duration / 60, 0),
  }))
  const maxMinutes = Math.max(...weekSessionData.map(d => d.minutes), 1)

  const checklistDone = checklistItems.filter(c => c.status === 'done').length
  const checklistTotal = checklistItems.length
  const checklistPct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0
  const postedToday = allProjects.filter(p => p.posted_at && isToday(new Date(p.posted_at))).length

  // Per-channel breakdown
  const channelStats = channels.map(ch => {
    const chProjects = allProjects.filter(p => p.channel_id === ch.id)
    return {
      ...ch,
      total: chProjects.length,
      pending: chProjects.filter(p => p.status !== 'posted').length,
      postedThisWeek: chProjects.filter(p => p.posted_at && isWithinInterval(new Date(p.posted_at), { start: weekStart, end: weekEnd })).length,
    }
  })

  // Upcoming deadlines across all channels
  const upcoming = allProjects
    .filter(p => p.deadline && p.status !== 'posted')
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 5)

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-10">
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-2">
          {format(now, 'EEEE, MMMM d')}
        </p>
        <h1 className="text-4xl font-light text-ink">{greeting}</h1>
        <p className="text-[11px] text-ink-muted mt-2">Unified view across all channels</p>
      </div>

      {/* Top metrics: Posted today + Checklist + Pipeline total */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-surface border border-line rounded-lg p-5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Posted Today</p>
          <p className="text-3xl font-light text-ink tabular-nums">{postedToday}</p>
          <p className="text-[10px] text-ink-muted mt-1">across all channels</p>
        </div>
        <button onClick={() => navigate('/checklist')} className="bg-surface border border-line rounded-lg p-5 text-left hover:shadow-sm transition-shadow">
          <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Today's Checklist</p>
          <p className="text-3xl font-light text-ink tabular-nums">{checklistPct}%</p>
          <div className="h-1.5 bg-canvas rounded-full overflow-hidden mt-2">
            <div className="h-full bg-success rounded-full transition-all" style={{ width: `${checklistPct}%` }} />
          </div>
          <p className="text-[10px] text-ink-muted mt-1">{checklistDone}/{checklistTotal} tasks</p>
        </button>
        <div className="bg-surface border border-line rounded-lg p-5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Total Pipeline</p>
          <p className="text-3xl font-light text-blueprint tabular-nums">{totalProjects}</p>
          <p className="text-[10px] text-ink-muted mt-1">active projects</p>
        </div>
      </div>

      {/* Pipeline + Finances */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-surface border border-line rounded-lg p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Pipeline (all channels)</p>
            <span className="text-3xl font-light text-ink tabular-nums">{totalProjects}</span>
          </div>
          <div className="space-y-3">
            {pipeline.map(s => (
              <div key={s.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-ink-secondary">{s.label}</span>
                  <span className="text-[11px] text-ink-muted tabular-nums">{s.count}</span>
                </div>
                <div className="h-1.5 bg-canvas rounded-full overflow-hidden">
                  <div className="h-full bg-blueprint rounded-full transition-all"
                    style={{ width: totalProjects > 0 ? `${(s.count / totalProjects) * 100}%` : '0%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-line rounded-lg p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-5">Finances (this month)</p>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Income</p>
              <p className="text-3xl font-light text-success tabular-nums">₹{totalEarned.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Expenses</p>
              <p className="text-3xl font-light text-danger tabular-nums">₹{totalSpent.toLocaleString('en-IN')}</p>
            </div>
            <div className="pt-3 border-t border-line-light">
              <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Net</p>
              <p className={`text-3xl font-light tabular-nums ${net >= 0 ? 'text-success' : 'text-danger'}`}>
                {net >= 0 ? '+' : '-'}₹{Math.abs(net).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Per-channel breakdown */}
      {channelStats.length > 0 && (
        <div className="bg-surface border border-line rounded-lg p-6 mb-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-4">Channels</p>
          <div className={`grid gap-3 ${channelStats.length > 2 ? 'grid-cols-4' : 'grid-cols-2'}`}>
            {channelStats.map(ch => (
              <button key={ch.id} onClick={() => { switchChannel(ch.id); navigate('/projects') }}
                className="text-left p-4 rounded-md border border-line hover:border-blueprint hover:shadow-sm transition-all group">
                <p className="text-sm font-medium text-ink group-hover:text-blueprint transition-colors">{ch.name}</p>
                {ch.handle && <p className="text-[10px] text-ink-muted">{ch.handle}</p>}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-ink-muted">Active</p>
                    <p className="text-lg font-light text-ink tabular-nums">{ch.pending}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-ink-muted">This week</p>
                    <p className="text-lg font-light text-blueprint tabular-nums">{ch.postedThisWeek}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming + Quick Start + Sessions */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-surface border border-line rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              <CalendarClock size={12} className="inline mr-1" />
              Upcoming Deadlines
            </p>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-[11px] text-ink-muted">No upcoming deadlines.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map(p => {
                const typeInfo = CONTENT_TYPES.find(t => t.id === p.type)
                const ch = channels.find(c => c.id === p.channel_id)
                const isOverdue = new Date(p.deadline!) < now
                return (
                  <button key={p.id} onClick={() => { if (ch) switchChannel(ch.id); navigate(`/projects/${p.id}`) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-line hover:border-blueprint transition-all text-left">
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0"
                      style={{ backgroundColor: typeInfo?.color + '18', color: typeInfo?.color }}
                    >
                      {typeInfo?.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink truncate">{p.title}</p>
                      {ch && <p className="text-[10px] text-ink-muted">{ch.name}</p>}
                    </div>
                    <span className={`text-[10px] tabular-nums ${isOverdue ? 'text-danger font-medium' : 'text-ink-muted'}`}>
                      {new Date(p.deadline!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-surface border border-line rounded-lg p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-4">Quick Start</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Plus, label: 'New Project', sub: 'Active channel', to: '/projects' },
              { icon: CheckSquare, label: 'Checklist', sub: 'Daily ops', to: '/checklist' },
              { icon: BookOpen, label: 'Saved Notes', sub: 'Ideas & prompts', to: '/saved' },
              { icon: CalendarClock, label: 'Calendar', sub: 'Schedule', to: '/calendar' },
            ].map(item => (
              <button key={item.label} onClick={() => navigate(item.to)}
                className="flex items-center gap-3 p-3 rounded-md border border-line hover:border-blueprint hover:bg-blueprint-light/30 transition-all text-left group">
                <item.icon size={16} className="text-blueprint shrink-0" />
                <div>
                  <p className="text-sm text-ink group-hover:text-blueprint transition-colors">{item.label}</p>
                  <p className="text-[10px] text-ink-muted">{item.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* This Week + Sessions Chart */}
      <div className="bg-surface border border-line rounded-lg p-6 mb-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-4">This Week</p>
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div>
            <p className="text-2xl font-light text-ink tabular-nums">{weekProjects.length}</p>
            <p className="text-[10px] text-ink-muted uppercase tracking-wider">New Projects</p>
          </div>
          <div>
            <p className="text-2xl font-light text-ink tabular-nums">{todaySessions.length}</p>
            <p className="text-[10px] text-ink-muted uppercase tracking-wider">Sessions Today</p>
          </div>
          <div>
            <p className="text-2xl font-light text-ink tabular-nums">{Math.round(totalSessionMinutes)}</p>
            <p className="text-[10px] text-ink-muted uppercase tracking-wider">Mins Focused</p>
          </div>
        </div>
        <div className="pt-4 border-t border-line-light">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-3">Sessions</p>
          <div className="flex items-end gap-2 h-16">
            {weekSessionData.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full relative" style={{ height: 48 }}>
                  <div className={`absolute bottom-0 w-full rounded-sm transition-all ${d.today ? 'bg-blueprint' : 'bg-line'}`}
                    style={{ height: d.minutes > 0 ? `${Math.max((d.minutes / maxMinutes) * 100, 8)}%` : '0%' }} />
                </div>
                <span className={`text-[9px] uppercase tracking-wider ${d.today ? 'text-blueprint font-medium' : 'text-ink-muted'}`}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Projects across all channels */}
      {allProjects.length > 0 && (
        <div className="bg-surface border border-line rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Recent Projects (all channels)</p>
            <button onClick={() => navigate('/projects')} className="flex items-center gap-1 text-[11px] text-blueprint hover:underline">
              View pipeline <ArrowRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {allProjects.slice(0, 6).map(p => {
              const t = CONTENT_TYPES.find(ct => ct.id === p.type)
              const status = STATUSES.find(s => s.id === p.status)
              const ch = channels.find(c => c.id === p.channel_id)
              return (
                <button key={p.id} onClick={() => { if (ch) switchChannel(ch.id); navigate(`/projects/${p.id}`) }}
                  className="text-left p-3 rounded-md border border-line hover:border-blueprint hover:shadow-sm transition-all group">
                  <p className="text-sm text-ink font-medium truncate group-hover:text-blueprint transition-colors">{p.title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: t?.color + '18', color: t?.color }}>
                      {t?.label}
                    </span>
                    <span className="text-[9px] text-ink-muted uppercase tracking-wider">{status?.label}</span>
                  </div>
                  {ch && <p className="text-[9px] text-ink-muted mt-1">{ch.name}</p>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
