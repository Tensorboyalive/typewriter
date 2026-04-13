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
import { Plus, ArrowRight, Library, CheckSquare, BookOpen, CalendarClock } from 'lucide-react'
import { useStore } from '../store'
import { STATUSES, CONTENT_TYPES } from '../types'

export function Dashboard() {
  const navigate = useNavigate()
  const { user, userRole, projects, expenses, income, sessions, bankItems, checklistItems } = useStore()

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
    count: projects.filter(p => p.status === s.id).length,
  }))
  const totalProjects = projects.length

  const weekStart = startOfWeek(now)
  const weekEnd = endOfWeek(now)
  const weekProjects = projects.filter(p =>
    isWithinInterval(new Date(p.created_at), { start: weekStart, end: weekEnd }),
  )

  const todaySessions = sessions.filter(s => isToday(new Date(s.completed_at)))
  const totalSessionMinutes = todaySessions.reduce((sum, s) => sum + s.duration / 60, 0)

  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const weekSessionData = weekDays.map(day => ({
    day: format(day, 'EEE'),
    today: isToday(day),
    minutes: sessions.filter(s => isSameDay(new Date(s.completed_at), day)).reduce((sum, s) => sum + s.duration / 60, 0),
  }))
  const maxMinutes = Math.max(...weekSessionData.map(d => d.minutes), 1)

  // Control Tower metrics
  const bankReady = bankItems.filter(b => b.status === 'approved').length
  const checklistDone = checklistItems.filter(c => c.status === 'done').length
  const checklistTotal = checklistItems.length
  const checklistPct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0
  const postedToday = projects.filter(p => p.posted_at && isToday(new Date(p.posted_at))).length

  // Editor-specific metrics
  const myProjects = projects.filter(p => p.assigned_to === user?.id)
  const myPending = myProjects.filter(p => p.status !== 'posted')
  const myUpcoming = myPending
    .filter(p => p.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 5)

  // PA-specific: editor delivery stats
  const assignedProjects = projects.filter(p => p.assigned_to)
  const deliveredProjects = projects.filter(p => p.delivery_link)

  // ─── Editor Dashboard ──────────────────────────
  if (userRole === 'editor') {
    return (
      <div className="p-8 max-w-5xl">
        <div className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-2">
            {format(now, 'EEEE, MMMM d')}
          </p>
          <h1 className="text-4xl font-light text-ink">{greeting}</h1>
        </div>

        {/* My Tasks summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <button onClick={() => navigate('/queue')} className="bg-surface border border-line rounded-lg p-5 text-left hover:shadow-sm transition-shadow">
            <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">My Tasks</p>
            <p className="text-3xl font-light text-ink tabular-nums">{myPending.length}</p>
            <p className="text-[10px] text-ink-muted mt-1">pending assignments</p>
          </button>
          <div className="bg-surface border border-line rounded-lg p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Delivered</p>
            <p className="text-3xl font-light text-success tabular-nums">
              {myProjects.filter(p => p.delivery_link).length}
            </p>
            <p className="text-[10px] text-ink-muted mt-1">of {myProjects.length} total</p>
          </div>
          <div className="bg-surface border border-line rounded-lg p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Focus Today</p>
            <p className="text-3xl font-light text-ink tabular-nums">{Math.round(totalSessionMinutes)}</p>
            <p className="text-[10px] text-ink-muted mt-1">minutes focused</p>
          </div>
        </div>

        {/* Upcoming deadlines */}
        {myUpcoming.length > 0 && (
          <div className="bg-surface border border-line rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                <CalendarClock size={12} className="inline mr-1" />
                Upcoming Deadlines
              </p>
              <button onClick={() => navigate('/queue')} className="flex items-center gap-1 text-[11px] text-blueprint hover:underline">
                View queue <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-2">
              {myUpcoming.map(p => {
                const typeInfo = CONTENT_TYPES.find(t => t.id === p.type)
                const isOverdue = new Date(p.deadline!) < now
                return (
                  <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-line hover:border-blueprint transition-all text-left">
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0"
                      style={{ backgroundColor: typeInfo?.color + '18', color: typeInfo?.color }}
                    >
                      {typeInfo?.label}
                    </span>
                    <p className="text-sm text-ink flex-1 truncate">{p.title}</p>
                    <span className={`text-[10px] tabular-nums ${isOverdue ? 'text-danger font-medium' : 'text-ink-muted'}`}>
                      {new Date(p.deadline!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Sessions chart */}
        <div className="bg-surface border border-line rounded-lg p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-3">Sessions This Week</p>
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
    )
  }

  // ─── PA Dashboard ──────────────────────────────
  if (userRole === 'pa') {
    return (
      <div className="p-8 max-w-5xl">
        <div className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-2">
            {format(now, 'EEEE, MMMM d')}
          </p>
          <h1 className="text-4xl font-light text-ink">{greeting}</h1>
        </div>

        {/* Score + Checklist + Bank */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-surface border border-line rounded-lg p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Posted Today</p>
            <p className="text-3xl font-light text-ink tabular-nums">{postedToday}</p>
            <p className="text-[10px] text-ink-muted mt-1">of {projects.filter(p => p.status !== 'posted').length + postedToday} total pipeline</p>
          </div>
          <button onClick={() => navigate('/checklist')} className="bg-surface border border-line rounded-lg p-5 text-left hover:shadow-sm transition-shadow">
            <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Today's Checklist</p>
            <p className="text-3xl font-light text-ink tabular-nums">{checklistPct}%</p>
            <div className="h-1.5 bg-canvas rounded-full overflow-hidden mt-2">
              <div className="h-full bg-success rounded-full transition-all" style={{ width: `${checklistPct}%` }} />
            </div>
            <p className="text-[10px] text-ink-muted mt-1">{checklistDone}/{checklistTotal} tasks</p>
          </button>
          <button onClick={() => navigate('/bank')} className="bg-surface border border-line rounded-lg p-5 text-left hover:shadow-sm transition-shadow">
            <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Content Bank</p>
            <p className="text-3xl font-light text-blueprint tabular-nums">{bankReady}</p>
            <p className="text-[10px] text-ink-muted mt-1">approved & ready to post</p>
          </button>
        </div>

        {/* Pipeline + Editor Status */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-surface border border-line rounded-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Pipeline</p>
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
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-5">Editor Status</p>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Assigned</p>
                <p className="text-3xl font-light text-blueprint tabular-nums">{assignedProjects.length}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Delivered</p>
                <p className="text-3xl font-light text-success tabular-nums">{deliveredProjects.length}</p>
              </div>
              <div className="pt-3 border-t border-line-light">
                <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Completion rate</p>
                <p className="text-3xl font-light text-ink tabular-nums">
                  {assignedProjects.length > 0 ? Math.round((deliveredProjects.length / assignedProjects.length) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Start + This Week */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-surface border border-line rounded-lg p-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-4">Quick Start</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Plus, label: 'New Project', sub: 'Content pipeline', to: '/projects' },
                { icon: Library, label: 'Content Bank', sub: 'Pre-written posts', to: '/bank' },
                { icon: CheckSquare, label: 'Checklist', sub: 'Daily ops', to: '/checklist' },
                { icon: BookOpen, label: 'Saved Notes', sub: 'Ideas & prompts', to: '/saved' },
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

          <div className="bg-surface border border-line rounded-lg p-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-4">This Week</p>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div>
                <p className="text-2xl font-light text-ink tabular-nums">{weekProjects.length}</p>
                <p className="text-[10px] text-ink-muted uppercase tracking-wider">New Projects</p>
              </div>
              <div>
                <p className="text-2xl font-light text-ink tabular-nums">{todaySessions.length}</p>
                <p className="text-[10px] text-ink-muted uppercase tracking-wider">Sessions</p>
              </div>
              <div>
                <p className="text-2xl font-light text-ink tabular-nums">{Math.round(totalSessionMinutes)}</p>
                <p className="text-[10px] text-ink-muted uppercase tracking-wider">Mins Focused</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Projects */}
        {projects.length > 0 && (
          <div className="bg-surface border border-line rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Recent Projects</p>
              <button onClick={() => navigate('/projects')} className="flex items-center gap-1 text-[11px] text-blueprint hover:underline">
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {projects.slice(0, 6).map(p => {
                const t = CONTENT_TYPES.find(ct => ct.id === p.type)
                const status = STATUSES.find(s => s.id === p.status)
                return (
                  <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
                    className="text-left p-3 rounded-md border border-line hover:border-blueprint hover:shadow-sm transition-all group">
                    <p className="text-sm text-ink font-medium truncate group-hover:text-blueprint transition-colors">{p.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: t?.color + '18', color: t?.color }}>
                        {t?.label}
                      </span>
                      <span className="text-[9px] text-ink-muted uppercase tracking-wider">{status?.label}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Admin Dashboard (full) ────────────────────
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-10">
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-2">
          {format(now, 'EEEE, MMMM d')}
        </p>
        <h1 className="text-4xl font-light text-ink">{greeting}</h1>
      </div>

      {/* Score + Checklist + Bank */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-surface border border-line rounded-lg p-5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Posted Today</p>
          <p className="text-3xl font-light text-ink tabular-nums">{postedToday}</p>
          <p className="text-[10px] text-ink-muted mt-1">of {projects.filter(p => p.status !== 'posted').length + postedToday} total pipeline</p>
        </div>
        <button onClick={() => navigate('/checklist')} className="bg-surface border border-line rounded-lg p-5 text-left hover:shadow-sm transition-shadow">
          <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Today's Checklist</p>
          <p className="text-3xl font-light text-ink tabular-nums">{checklistPct}%</p>
          <div className="h-1.5 bg-canvas rounded-full overflow-hidden mt-2">
            <div className="h-full bg-success rounded-full transition-all" style={{ width: `${checklistPct}%` }} />
          </div>
          <p className="text-[10px] text-ink-muted mt-1">{checklistDone}/{checklistTotal} tasks</p>
        </button>
        <button onClick={() => navigate('/bank')} className="bg-surface border border-line rounded-lg p-5 text-left hover:shadow-sm transition-shadow">
          <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Content Bank</p>
          <p className="text-3xl font-light text-blueprint tabular-nums">{bankReady}</p>
          <p className="text-[10px] text-ink-muted mt-1">approved & ready to post</p>
        </button>
      </div>

      {/* Pipeline + Revenue */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-surface border border-line rounded-lg p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Pipeline</p>
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
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-5">Finances</p>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Income this month</p>
              <p className="text-3xl font-light text-success tabular-nums">₹{totalEarned.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Expenses this month</p>
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

      {/* Quick Start + This Week */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-surface border border-line rounded-lg p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-4">Quick Start</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Plus, label: 'New Project', sub: 'Content pipeline', to: '/projects' },
              { icon: Library, label: 'Content Bank', sub: 'Pre-written posts', to: '/bank' },
              { icon: CheckSquare, label: 'Checklist', sub: 'Daily ops', to: '/checklist' },
              { icon: BookOpen, label: 'Saved Notes', sub: 'Ideas & prompts', to: '/saved' },
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

        <div className="bg-surface border border-line rounded-lg p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-4">This Week</p>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <p className="text-2xl font-light text-ink tabular-nums">{weekProjects.length}</p>
              <p className="text-[10px] text-ink-muted uppercase tracking-wider">New Projects</p>
            </div>
            <div>
              <p className="text-2xl font-light text-ink tabular-nums">{todaySessions.length}</p>
              <p className="text-[10px] text-ink-muted uppercase tracking-wider">Sessions</p>
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
      </div>

      {/* Recent Projects */}
      {projects.length > 0 && (
        <div className="bg-surface border border-line rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Recent Projects</p>
            <button onClick={() => navigate('/projects')} className="flex items-center gap-1 text-[11px] text-blueprint hover:underline">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {projects.slice(0, 6).map(p => {
              const t = CONTENT_TYPES.find(ct => ct.id === p.type)
              const status = STATUSES.find(s => s.id === p.status)
              return (
                <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
                  className="text-left p-3 rounded-md border border-line hover:border-blueprint hover:shadow-sm transition-all group">
                  <p className="text-sm text-ink font-medium truncate group-hover:text-blueprint transition-colors">{p.title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: t?.color + '18', color: t?.color }}>
                      {t?.label}
                    </span>
                    <span className="text-[9px] text-ink-muted uppercase tracking-wider">{status?.label}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
