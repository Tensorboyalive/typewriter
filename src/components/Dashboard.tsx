import { useEffect, useState } from 'react'
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
  subDays,
} from 'date-fns'
import { Plus, ArrowRight, CheckSquare, BookOpen, CalendarClock, TrendingUp, TrendingDown } from 'lucide-react'
import { useStore } from '../store'
import { AdminLock } from './AdminLock'
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

      {/* Pipeline (per-channel horizontal bars) + Finances donut */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-surface border border-line rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Pipeline by channel</p>
            <span className="text-3xl font-light text-ink tabular-nums">{totalProjects}</span>
          </div>
          <div className="space-y-3">
            {channelStats.length === 0 && (
              <p className="text-[11px] text-ink-muted">No channels yet.</p>
            )}
            {channelStats.map(ch => {
              const maxCount = Math.max(...channelStats.map(c => c.total), 1)
              return (
                <div key={ch.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-ink-secondary truncate pr-2">{ch.name}</span>
                    <span className="text-[11px] text-ink-muted tabular-nums">{ch.total}</span>
                  </div>
                  <div className="h-2 bg-canvas rounded overflow-hidden">
                    <div className="h-full bg-blueprint rounded transition-all"
                      style={{ width: `${(ch.total / maxCount) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          {/* Secondary: stage breakdown, subtle */}
          <div className="mt-5 pt-4 border-t border-line-light flex items-center gap-4 flex-wrap">
            {pipeline.map(s => (
              <div key={s.id} className="flex items-baseline gap-1.5">
                <span className="text-sm font-light text-ink tabular-nums">{s.count}</span>
                <span className="text-[10px] uppercase tracking-wider text-ink-muted">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <AdminLock variant="inline">
          <FinancesHero
            totalEarned={totalEarned}
            totalSpent={totalSpent}
            net={net}
            income={income}
            expenses={expenses}
            now={now}
          />
        </AdminLock>
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

// Editorial, celebratory finances card. No donut — the Net is the hero.
// - animated count-up for Net
// - segmented flow bar (green/red) proportional to income/expenses
// - mini 14-day net sparkline
// No chart libraries, tiny bundle footprint.
function FinancesHero({
  totalEarned, totalSpent, net, income, expenses, now,
}: {
  totalEarned: number
  totalSpent: number
  net: number
  income: { date: string; amount: number }[]
  expenses: { date: string; amount: number }[]
  now: Date
}) {
  // Count-up animation for the Net number
  const [displayNet, setDisplayNet] = useState(0)
  const [barMounted, setBarMounted] = useState(false)
  useEffect(() => {
    const start = performance.now()
    const duration = 900
    const from = 0
    const to = net
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplayNet(from + (to - from) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // small delay so the bar animates in after mount
    const id = window.setTimeout(() => setBarMounted(true), 30)
    return () => { cancelAnimationFrame(raf); clearTimeout(id) }
  }, [net])

  const total = totalEarned + totalSpent
  const incomePct = total > 0 ? (totalEarned / total) * 100 : 0
  const expensePct = total > 0 ? (totalSpent / total) * 100 : 0

  // Sparkline: net per day for last 14 days
  const days: { date: Date; net: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = subDays(now, i)
    const inc = income
      .filter(x => isSameDay(new Date(x.date), d))
      .reduce((s, x) => s + x.amount, 0)
    const exp = expenses
      .filter(x => isSameDay(new Date(x.date), d))
      .reduce((s, x) => s + x.amount, 0)
    days.push({ date: d, net: inc - exp })
  }
  const trending = days.length >= 2 && days[days.length - 1].net >= days[0].net
  const sparkW = 180
  const sparkH = 24
  const values = days.map(d => d.net)
  const minV = Math.min(...values, 0)
  const maxV = Math.max(...values, 0)
  const range = maxV - minV || 1
  const sparkPoints = days
    .map((d, i) => {
      const x = (i / Math.max(1, days.length - 1)) * sparkW
      const y = sparkH - ((d.net - minV) / range) * sparkH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const daysElapsed = Math.max(1, now.getDate())
  const perDay = Math.round(net / daysElapsed)
  const netPositive = net >= 0
  const displayAbs = Math.abs(Math.round(displayNet)).toLocaleString('en-IN')

  return (
    <div className="bg-surface border border-line rounded-xl p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Finances · {format(now, 'MMMM')}</p>
        <span className="text-[10px] text-ink-muted uppercase tracking-wider">net</span>
      </div>

      {/* Hero NET */}
      <div
        className="text-[clamp(2rem,4vw,3.5rem)] font-extralight tracking-tight leading-none"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        <span className={netPositive ? 'text-success' : 'text-danger'}>
          {netPositive ? '' : '−'}₹{displayAbs}
        </span>
      </div>

      {/* Segmented flow bar */}
      <div className="mt-5">
        <div className="relative h-3 rounded-full bg-canvas overflow-hidden border border-line-light">
          <div className="absolute inset-0 flex">
            <div
              className="h-full bg-gradient-to-r from-success/80 to-success transition-[width] duration-[900ms] ease-out"
              style={{ width: barMounted ? `${incomePct}%` : '0%' }}
            />
            <div
              className="h-full bg-gradient-to-r from-danger to-danger/80 transition-[width] duration-[900ms] ease-out"
              style={{ width: barMounted ? `${expensePct}%` : '0%' }}
            />
          </div>
          {/* gloss */}
          <div className="absolute inset-x-0 top-0 h-px bg-white/20 pointer-events-none" />
        </div>
        <div className="mt-3 flex items-center justify-between gap-4 text-[11px]">
          <span className="flex items-center gap-1.5 text-success">
            <TrendingUp size={12} />
            <span className="tabular-nums">₹{totalEarned.toLocaleString('en-IN')}</span>
            <span className="text-ink-muted uppercase tracking-wider text-[10px]">in</span>
          </span>
          <span className="flex items-center gap-1.5 text-danger">
            <TrendingDown size={12} />
            <span className="tabular-nums">₹{totalSpent.toLocaleString('en-IN')}</span>
            <span className="text-ink-muted uppercase tracking-wider text-[10px]">out</span>
          </span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="mt-4 pt-4 border-t border-line-light">
        <div className="flex items-end gap-3">
          <svg width={sparkW} height={sparkH} viewBox={`0 0 ${sparkW} ${sparkH}`}
            className="shrink-0" aria-hidden="true">
            <polyline
              fill="none"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={sparkPoints}
              className={trending ? 'text-success' : 'text-danger'}
              stroke="currentColor"
            />
          </svg>
          <p className="text-[11px] text-ink-muted leading-tight">
            ₹{Math.abs(perDay).toLocaleString('en-IN')}/day avg
            <br />
            <span className="text-[10px]">last 14 days</span>
          </p>
        </div>
      </div>
    </div>
  )
}
