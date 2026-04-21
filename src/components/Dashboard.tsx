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
import { STATUSES, CONTENT_FORMATS } from '../types'
import { Ticker } from './Ticker'
import { Eyebrow } from './editorial/Eyebrow'
import { HighlightChip } from './editorial/HighlightChip'
import { cn } from '../lib/cn'

export function Dashboard() {
  const navigate = useNavigate()
  const { channels, allProjects, allSessions, expenses, income, checklistItems, switchChannel } = useStore()

  const now = new Date()
  const hour = now.getHours()
  const greeting =
    hour < 12 ? 'good morning' : hour < 17 ? 'good afternoon' : 'good evening'

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

  // This-week delight stats
  const reelsShipped = allProjects.filter(p =>
    p.status === 'posted' && p.format === 'reel' && p.posted_at &&
    isWithinInterval(new Date(p.posted_at), { start: weekStart, end: weekEnd }),
  ).length
  const scriptsDrafted = allProjects.filter(p =>
    p.status === 'scripted' && p.updated_at &&
    isWithinInterval(new Date(p.updated_at), { start: weekStart, end: weekEnd }),
  ).length
  const tasksDone = checklistItems.filter(c =>
    c.status === 'done' && c.completed_at &&
    isWithinInterval(new Date(c.completed_at), { start: weekStart, end: weekEnd }),
  ).length
  const hoursFocused = Math.round(
    allSessions
      .filter(s => isWithinInterval(new Date(s.completed_at), { start: weekStart, end: weekEnd }))
      .reduce((sum, s) => sum + s.duration / 3600, 0),
  )

  // Upcoming deadlines across all channels
  const upcoming = allProjects
    .filter(p => p.deadline && p.status !== 'posted')
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 5)

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-10 md:px-10 md:py-16">

      {/* Hero row — editorial opening with eyebrow + serif greeting + aside eyebrow */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-9">
          <Eyebrow>{format(now, 'EEEE · MMMM d').toLowerCase()}</Eyebrow>
          <h1
            className="serif mt-6 leading-[0.95] tracking-[-0.02em] text-ink"
            style={{ fontSize: 'clamp(2.6rem, calc(1rem + 3.5vw), 4.5rem)' }}
          >
            {greeting},
            <br />
            <span className="serif-italic text-ink/80">here&apos;s the pipeline.</span>
          </h1>
          <p className="mt-6 max-w-[55ch] text-[1rem] leading-[1.55] text-muted">
            One unified view across all channels. Numbers count up when fresh data lands.
          </p>
        </div>
        <aside className="lg:col-span-3 lg:self-end">
          <div className="rule-top pt-5">
            <p className="mono text-[0.62rem] uppercase tracking-[0.28em] text-muted">
              today
            </p>
            <p className="serif mt-2 text-[2.5rem] leading-none tracking-[-0.02em] text-ink tnum">
              {postedToday}
            </p>
            <p className="mono mt-2 text-[0.62rem] uppercase tracking-[0.26em] text-muted">
              posted · across all channels
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-16 h-px bg-ink/10" />

      {/* Three-up KPI tiles — hairline card family */}
      <div className="mt-10 grid grid-cols-1 gap-px rounded-sm border border-ink/10 bg-ink/10 md:grid-cols-3">
        <div className="bg-paper p-6">
          <p className="mono text-[0.62rem] uppercase tracking-[0.28em] text-muted">
            posted today
          </p>
          <Ticker value={postedToday} className="serif mt-3 block text-[3rem] leading-none tracking-[-0.02em] text-ink tnum" />
          <p className="mono mt-3 text-[0.6rem] uppercase tracking-[0.24em] text-muted/80">
            across all channels
          </p>
        </div>

        <button
          onClick={() => navigate('/checklist')}
          className="group bg-paper p-6 text-left transition-colors hover:bg-cream"
        >
          <p className="mono text-[0.62rem] uppercase tracking-[0.28em] text-muted">
            today&apos;s checklist
          </p>
          <Ticker value={checklistPct} format={n => `${n}%`} className="serif mt-3 block text-[3rem] leading-none tracking-[-0.02em] text-ink tnum" />
          <div className="mt-3 h-[3px] w-full bg-ink/10">
            <div
              className="h-full bg-viral transition-all duration-700"
              style={{ width: `${checklistPct}%` }}
            />
          </div>
          <p className="mono mt-3 text-[0.6rem] uppercase tracking-[0.24em] text-muted/80 tnum">
            {checklistDone}/{checklistTotal} tasks
          </p>
        </button>

        <div className="bg-paper p-6">
          <p className="mono text-[0.62rem] uppercase tracking-[0.28em] text-muted">
            total pipeline
          </p>
          <Ticker value={totalProjects} className="serif mt-3 block text-[3rem] leading-none tracking-[-0.02em] text-viral tnum" />
          <p className="mono mt-3 text-[0.6rem] uppercase tracking-[0.24em] text-muted/80">
            active projects
          </p>
        </div>
      </div>

      {/* This Week row */}
      <section className="mt-10 rule-top pt-10">
        <Eyebrow>this week</Eyebrow>
        <div className="mt-6 grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
          <Stat n={reelsShipped} label="reels shipped" />
          <Stat n={scriptsDrafted} label="scripts drafted" />
          <Stat n={tasksDone} label="tasks done" />
          <Stat n={hoursFocused} label="hrs focused" />
        </div>
      </section>

      {/* Pipeline breakdown + Finances hero — 7/5 asymmetric split */}
      <section className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="flex items-baseline justify-between">
            <Eyebrow>pipeline · by channel</Eyebrow>
            <span className="serif text-[2.25rem] leading-none text-ink tnum">{totalProjects}</span>
          </div>
          <div className="mt-6 space-y-4">
            {channelStats.length === 0 && (
              <p className="mono text-[0.72rem] uppercase tracking-[0.24em] text-muted">no channels yet.</p>
            )}
            {channelStats.map(ch => {
              const maxCount = Math.max(...channelStats.map(c => c.total), 1)
              return (
                <div key={ch.id}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-[0.92rem] text-ink">{ch.name}</span>
                    <span className="mono text-[0.7rem] uppercase tracking-[0.24em] text-muted tnum">
                      {ch.total}
                    </span>
                  </div>
                  <div className="h-[3px] w-full bg-ink/10">
                    <div
                      className="h-full bg-viral transition-all duration-700"
                      style={{ width: `${(ch.total / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {/* Stage breakdown — mono ribbon */}
          {pipeline.length > 0 && (
            <div className="mt-8 flex flex-wrap items-baseline gap-x-6 gap-y-2 rule-top pt-5">
              {pipeline.map(s => (
                <div key={s.id} className="flex items-baseline gap-1.5">
                  <span className="serif text-[1.15rem] text-ink tnum">{s.count}</span>
                  <span className="mono text-[0.62rem] uppercase tracking-[0.26em] text-muted">
                    {s.label.toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
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
      </section>

      {/* Channels grid */}
      {channelStats.length > 0 && (
        <section className="mt-16 rule-top pt-10">
          <Eyebrow>channels</Eyebrow>
          <div className={cn(
            'mt-6 grid gap-px rounded-sm border border-ink/10 bg-ink/10',
            channelStats.length > 2 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-2',
          )}>
            {channelStats.map(ch => (
              <button
                key={ch.id}
                onClick={() => { switchChannel(ch.id); navigate('/projects') }}
                className="group flex flex-col items-start bg-paper p-5 text-left transition-colors hover:bg-cream"
              >
                <span className="serif text-[1.15rem] leading-tight text-ink group-hover:text-viral">
                  {ch.name}
                </span>
                {ch.handle && (
                  <span className="mono mt-1 text-[0.62rem] uppercase tracking-[0.24em] text-muted">
                    {ch.handle}
                  </span>
                )}
                <div className="mt-4 grid w-full grid-cols-2 gap-4">
                  <div>
                    <p className="mono text-[0.58rem] uppercase tracking-[0.26em] text-muted">active</p>
                    <p className="serif mt-1 text-[1.5rem] leading-none text-ink tnum">{ch.pending}</p>
                  </div>
                  <div>
                    <p className="mono text-[0.58rem] uppercase tracking-[0.26em] text-muted">this week</p>
                    <p className="serif mt-1 text-[1.5rem] leading-none text-viral tnum">{ch.postedThisWeek}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming + Quick Start — 6/6 split */}
      <section className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-2">
        <div>
          <Eyebrow>upcoming · deadlines</Eyebrow>
          <div className="mt-6">
            {upcoming.length === 0 ? (
              <p className="mono text-[0.72rem] uppercase tracking-[0.24em] text-muted">
                no upcoming deadlines.
              </p>
            ) : (
              <ul className="divide-y divide-ink/10 rule-top rule-bottom">
                {upcoming.map(p => {
                  const fmtInfo = CONTENT_FORMATS.find(f => f.id === p.format)
                  const ch = channels.find(c => c.id === p.channel_id)
                  const isOverdue = new Date(p.deadline!) < now
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() => { if (ch) switchChannel(ch.id); navigate(`/projects/${p.id}`) }}
                        className="group flex w-full items-center gap-4 py-3 text-left transition-colors hover:bg-paper/60 -mx-2 px-2"
                      >
                        {fmtInfo && (
                          <HighlightChip variant="orange" italic={false} className="mono shrink-0 text-[0.62rem] uppercase tracking-[0.22em]">
                            {fmtInfo.label}
                          </HighlightChip>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="serif text-[1rem] leading-tight text-ink group-hover:text-viral truncate">
                            {p.title}
                          </p>
                          {ch && (
                            <p className="mono mt-0.5 text-[0.6rem] uppercase tracking-[0.24em] text-muted">
                              {ch.name}
                            </p>
                          )}
                        </div>
                        <span className={cn(
                          'mono text-[0.66rem] uppercase tracking-[0.24em] tnum',
                          isOverdue ? 'text-danger' : 'text-muted',
                        )}>
                          {new Date(p.deadline!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <div>
          <Eyebrow>quick · start</Eyebrow>
          <div className="mt-6 grid grid-cols-2 gap-px rounded-sm border border-ink/10 bg-ink/10">
            {[
              { icon: Plus, label: 'new project', sub: 'active channel', to: '/projects' },
              { icon: CheckSquare, label: 'checklist', sub: 'daily ops', to: '/checklist' },
              { icon: BookOpen, label: 'saved notes', sub: 'ideas & prompts', to: '/saved' },
              { icon: CalendarClock, label: 'calendar', sub: 'schedule', to: '/calendar' },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => navigate(item.to)}
                className="group flex items-start gap-3 bg-paper p-4 text-left transition-colors hover:bg-cream"
              >
                <item.icon size={14} className="mt-0.5 text-viral shrink-0" strokeWidth={1.6} />
                <div>
                  <p className="mono text-[0.7rem] uppercase tracking-[0.22em] text-ink group-hover:text-viral">
                    {item.label}
                  </p>
                  <p className="mono mt-1 text-[0.58rem] uppercase tracking-[0.26em] text-muted">
                    {item.sub}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* This Week focus bar */}
      <section className="mt-16 rule-top pt-10">
        <Eyebrow>this week · focus</Eyebrow>
        <div className="mt-6 grid grid-cols-3 gap-8 md:gap-12">
          <Stat n={weekProjects.length} label="new projects" />
          <Stat n={todaySessions.length} label="sessions today" />
          <Stat n={Math.round(totalSessionMinutes)} label="mins focused" />
        </div>
        <div className="mt-8 rule-top pt-6">
          <p className="mono text-[0.62rem] uppercase tracking-[0.28em] text-muted">sessions · last 7 days</p>
          <div className="mt-4 flex h-20 items-end gap-3">
            {weekSessionData.map(d => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative w-full" style={{ height: 60 }}>
                  <div
                    className={cn(
                      'absolute bottom-0 w-full transition-all duration-500',
                      d.today ? 'bg-viral' : 'bg-ink/20',
                    )}
                    style={{ height: d.minutes > 0 ? `${Math.max((d.minutes / maxMinutes) * 100, 8)}%` : '0%' }}
                  />
                </div>
                <span className={cn(
                  'mono text-[0.58rem] uppercase tracking-[0.26em]',
                  d.today ? 'text-viral font-medium' : 'text-muted',
                )}>
                  {d.day.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent projects grid */}
      {allProjects.length > 0 && (
        <section className="mt-16 rule-top pt-10">
          <div className="flex items-baseline justify-between">
            <Eyebrow>recent · all channels</Eyebrow>
            <button
              onClick={() => navigate('/projects')}
              className="mono inline-flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.24em] text-muted hover:text-viral"
            >
              view pipeline <ArrowRight size={11} />
            </button>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-px rounded-sm border border-ink/10 bg-ink/10 md:grid-cols-2 lg:grid-cols-3">
            {allProjects.slice(0, 6).map(p => {
              const fmtInfo = CONTENT_FORMATS.find(f => f.id === p.format)
              const status = STATUSES.find(s => s.id === p.status)
              const ch = channels.find(c => c.id === p.channel_id)
              return (
                <button
                  key={p.id}
                  onClick={() => { if (ch) switchChannel(ch.id); navigate(`/projects/${p.id}`) }}
                  className="group flex flex-col items-start bg-paper p-4 text-left transition-colors hover:bg-cream"
                >
                  <p className="serif text-[1.05rem] leading-tight text-ink group-hover:text-viral line-clamp-2">
                    {p.title}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    {fmtInfo && (
                      <HighlightChip variant="orange" italic={false} className="mono text-[0.58rem] uppercase tracking-[0.22em]">
                        {fmtInfo.label}
                      </HighlightChip>
                    )}
                    <span className="mono text-[0.58rem] uppercase tracking-[0.26em] text-muted">
                      {status?.label.toLowerCase()}
                    </span>
                  </div>
                  {ch && (
                    <p className="mono mt-2 text-[0.58rem] uppercase tracking-[0.26em] text-muted/80">
                      {ch.name}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

// Small presentational helper — big serif numeral + mono lowercase caption.
function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <p className="serif text-[clamp(1.75rem,calc(0.5rem+2vw),2.5rem)] leading-none tracking-[-0.02em] text-ink tnum">
        {n}
      </p>
      <p className="mono mt-2 text-[0.6rem] uppercase tracking-[0.26em] text-muted">
        {label}
      </p>
    </div>
  )
}

/**
 * Editorial finances card — ink-edged, hero NET numeral in serif, segmented flow bar,
 * 14-day sparkline. Data-viz colors (success/danger) preserved per types.ts rule.
 * No donut — the Net is the hero.
 */
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
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplayNet(from + (to - from) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const id = window.setTimeout(() => setBarMounted(true), 30)
    return () => { cancelAnimationFrame(raf); clearTimeout(id) }
  }, [net])

  const total = totalEarned + totalSpent
  const incomePct = total > 0 ? (totalEarned / total) * 100 : 0
  const expensePct = total > 0 ? (totalSpent / total) * 100 : 0

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
  const sparkH = 28
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
    <div className="rule-top rule-bottom border-ink/10 bg-paper/60 p-6">
      <div className="flex items-baseline justify-between">
        <p className="mono text-[0.62rem] uppercase tracking-[0.28em] text-muted">
          finances · {format(now, 'MMMM').toLowerCase()}
        </p>
        <span className="mono text-[0.6rem] uppercase tracking-[0.28em] text-muted">net</span>
      </div>

      <div
        className="serif mt-4 leading-none tracking-[-0.02em] tnum"
        style={{ fontSize: 'clamp(2.5rem, calc(1rem + 3vw), 4rem)' }}
      >
        <span className={netPositive ? 'text-success' : 'text-danger'}>
          {netPositive ? '' : '−'}₹{displayAbs}
        </span>
      </div>

      {/* Segmented flow bar */}
      <div className="mt-6">
        <div className="relative h-[4px] overflow-hidden bg-ink/10">
          <div className="absolute inset-0 flex">
            <div
              className="h-full bg-success transition-[width] duration-[900ms] ease-out"
              style={{ width: barMounted ? `${incomePct}%` : '0%' }}
            />
            <div
              className="h-full bg-danger transition-[width] duration-[900ms] ease-out"
              style={{ width: barMounted ? `${expensePct}%` : '0%' }}
            />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-4">
          <span className="flex items-baseline gap-2 text-success">
            <TrendingUp size={11} />
            <span className="mono text-[0.8rem] tnum">₹{totalEarned.toLocaleString('en-IN')}</span>
            <span className="mono text-[0.58rem] uppercase tracking-[0.26em] text-muted">in</span>
          </span>
          <span className="flex items-baseline gap-2 text-danger">
            <TrendingDown size={11} />
            <span className="mono text-[0.8rem] tnum">₹{totalSpent.toLocaleString('en-IN')}</span>
            <span className="mono text-[0.58rem] uppercase tracking-[0.26em] text-muted">out</span>
          </span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="mt-6 rule-top pt-4">
        <div className="flex items-end gap-4">
          <svg
            width={sparkW}
            height={sparkH}
            viewBox={`0 0 ${sparkW} ${sparkH}`}
            className="shrink-0"
            aria-hidden="true"
          >
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
          <p className="mono text-[0.62rem] uppercase tracking-[0.26em] text-muted leading-tight">
            ₹{Math.abs(perDay).toLocaleString('en-IN')}/day avg
            <br />
            <span className="text-muted/70">last 14 days</span>
          </p>
        </div>
      </div>
    </div>
  )
}
