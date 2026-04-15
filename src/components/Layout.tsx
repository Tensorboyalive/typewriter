import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Home, Calendar, LayoutGrid, DollarSign, Bookmark, LogOut, Download, CheckSquare, Settings, FileOutput, Sun, Menu, X, Lock, Flame } from 'lucide-react'
import { getDayOfYear, format, subDays } from 'date-fns'
import { useStore } from '../store'
import { ChannelSwitcher } from './ChannelSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { MusicPlayer } from './MusicPlayer'
import { isUnlocked, lockAdmin } from './AdminLock'
import { useStreak } from '../lib/useStreak'

const NAV = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/today', icon: Sun, label: 'Today' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/projects', icon: LayoutGrid, label: 'Pipeline' },
  { to: '/checklist', icon: CheckSquare, label: 'Checklist' },
  { to: '/output', icon: FileOutput, label: 'Output' },
  { to: '/expenses', icon: DollarSign, label: 'Expenses' },
  { to: '/saved', icon: Bookmark, label: 'Saved' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

// Curated daily rotation — Naval, Marcus, Seneca, Munger, PG, Rubin.
// Short. Deterministic by day-of-year so the same day always shows the same.
const QUOTES: { text: string; author: string }[] = [
  { text: 'Earn with your mind, not your time.', author: 'Naval' },
  { text: 'Play long-term games with long-term people.', author: 'Naval' },
  { text: 'Read what you love until you love to read.', author: 'Naval' },
  { text: 'Specific knowledge is found by pursuing genuine curiosity.', author: 'Naval' },
  { text: 'The obstacle is the way.', author: 'Marcus' },
  { text: 'Waste no more time arguing what a good man is. Be one.', author: 'Marcus' },
  { text: 'You have power over your mind — not outside events.', author: 'Marcus' },
  { text: 'Confine yourself to the present.', author: 'Marcus' },
  { text: 'We suffer more in imagination than in reality.', author: 'Seneca' },
  { text: 'Luck is what happens when preparation meets opportunity.', author: 'Seneca' },
  { text: 'While we wait for life, life passes.', author: 'Seneca' },
  { text: 'It is not the man who has too little, but the man who craves more.', author: 'Seneca' },
  { text: 'The big money is not in the buying or selling, but in the waiting.', author: 'Munger' },
  { text: 'Compound interest is the eighth wonder.', author: 'Munger' },
  { text: 'Invert, always invert.', author: 'Munger' },
  { text: 'Take a simple idea and take it seriously.', author: 'Munger' },
  { text: 'Show up every day.', author: 'Rubin' },
  { text: 'The best art divides the audience.', author: 'Rubin' },
  { text: 'Begin where you are.', author: 'Rubin' },
  { text: 'Make something people want.', author: 'pg' },
  { text: 'Live in the future, then build what’s missing.', author: 'pg' },
  { text: 'Do things that don’t scale.', author: 'pg' },
  { text: 'Keep your identity small.', author: 'pg' },
  { text: 'Write. Often.', author: 'pg' },
  { text: 'The most important skill is learning how to learn.', author: 'Naval' },
  { text: 'Desire is a contract with yourself to be unhappy until you get it.', author: 'Naval' },
  { text: 'Be the silence between the notes.', author: 'Rubin' },
  { text: 'Every new beginning comes from some other beginning’s end.', author: 'Seneca' },
  { text: 'Patience is bitter, but its fruit is sweet.', author: 'Munger' },
  { text: 'Ship it. Then fix it.', author: 'pg' },
]

function useDailyQuote() {
  return useMemo(() => {
    const idx = (getDayOfYear(new Date()) - 1) % QUOTES.length
    return QUOTES[idx]
  }, [])
}

function PulseCard() {
  const { current, longest, byDay, persona } = useStreak()
  const personaLabel = persona === 'pa' ? 'PA' : 'YOU'
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(new Date(), 29 - i)
    const key = format(d, 'yyyy-MM-dd')
    return { d, key, count: byDay[key] ?? 0 }
  })
  const dotClass = (count: number) => {
    if (count === 0) return 'bg-ink/10'
    if (count <= 2) return 'bg-blueprint/30'
    if (count <= 5) return 'bg-blueprint/60'
    return 'bg-blueprint'
  }
  const coldStart = current <= 1
  return (
    <div className="px-4 py-3 border-t border-line">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">{personaLabel}</p>
        <div className="group relative" title={`Longest: ${longest}d`}>
          {coldStart ? (
            <span className="text-[11px] text-ink-muted">Starting fresh</span>
          ) : (
            <span className="flex items-center gap-1">
              <Flame size={12} className="text-blueprint" />
              <span className="text-blueprint font-medium text-[13px] tabular-nums">{current}</span>
              <span className="text-[11px] text-ink-muted">d streak</span>
            </span>
          )}
          <span className="pointer-events-none absolute right-0 top-full mt-1 whitespace-nowrap bg-ink text-surface text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-30">
            Longest: {longest}d
          </span>
        </div>
      </div>
      <div className="flex gap-[2px]">
        {days.map(({ key, count, d }) => (
          <span
            key={key}
            title={`${format(d, 'MMM d')} · ${count} ${count === 1 ? 'item' : 'items'}`}
            className={`w-[6px] h-[6px] rounded-[1px] ${dotClass(count)}`}
          />
        ))}
      </div>
    </div>
  )
}

export function Layout() {
  const { signOut, exportAllData } = useStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unlocked, setUnlocked] = useState(isUnlocked())
  const quote = useDailyQuote()
  useEffect(() => {
    const h = () => setUnlocked(isUnlocked())
    window.addEventListener('tw-admin-unlock-change', h)
    window.addEventListener('storage', h)
    return () => {
      window.removeEventListener('tw-admin-unlock-change', h)
      window.removeEventListener('storage', h)
    }
  }, [])

  const handleExport = async () => {
    const data = await exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `typewriter-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const Sidebar = (
    <aside className="w-56 bg-surface border-r border-line flex flex-col h-full">
      <div className="p-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-light tracking-wide text-ink">typewriter</h1>
          <p className="text-[11px] italic text-ink-muted tracking-normal mt-1">where we write</p>
        </div>
        <button onClick={() => setMobileOpen(false)}
          className="md:hidden p-1 text-ink-muted hover:text-ink" aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      <div className="px-3 pb-4 border-b border-line mb-2">
        <p className="text-[9px] uppercase tracking-[0.2em] text-ink-muted px-3 mb-1">Channel</p>
        <ChannelSwitcher canManage={true} />
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive ? 'bg-blueprint-light text-blueprint font-medium' : 'text-ink-secondary hover:bg-canvas'
              }`
            }>
            <Icon size={16} strokeWidth={1.5} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 space-y-1 border-t border-line">
        {unlocked && (
          <button onClick={lockAdmin}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ink-secondary hover:bg-canvas transition-colors w-full">
            <Lock size={16} strokeWidth={1.5} /> Lock admin
          </button>
        )}
        <button onClick={handleExport}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ink-secondary hover:bg-canvas transition-colors w-full">
          <Download size={16} strokeWidth={1.5} /> Export data
        </button>
        <button onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ink-muted hover:bg-canvas hover:text-danger transition-colors w-full">
          <LogOut size={16} strokeWidth={1.5} /> Sign out
        </button>
      </div>

      {/* Pulse — streak + 30-day activity */}
      <PulseCard />

      {/* Daily quote + sync chip */}
      <div className="px-4 py-3 border-t border-line">
        <p className="text-[11px] italic text-ink-muted leading-relaxed">“{quote.text}”</p>
        <p className="text-[10px] not-italic text-ink-muted mt-1">— {quote.author}</p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mt-3">Synced to cloud</p>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:block">{Sidebar}</div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileOpen(false)} />
          <div className="md:hidden fixed inset-y-0 left-0 z-50">{Sidebar}</div>
        </>
      )}

      <main className="flex-1 overflow-auto relative">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 h-12 bg-surface/90 backdrop-blur border-b border-line">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu"
            className="p-1.5 rounded hover:bg-canvas text-ink">
            <Menu size={18} />
          </button>
          <span className="text-sm font-light tracking-wide text-ink">typewriter</span>
          <div className="w-7" />
        </div>

        {/* Floating top-right toolbar — theme toggle + music player (desktop only) */}
        <div className="hidden md:flex fixed top-4 right-4 z-30 items-start gap-2">
          <ThemeToggle />
          <MusicPlayer />
        </div>

        <Outlet />
      </main>
    </div>
  )
}
