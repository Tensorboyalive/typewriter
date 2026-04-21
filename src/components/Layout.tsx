import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LogOut, Download, Menu, X, Lock, Flame } from 'lucide-react'
import { getDayOfYear, format, subDays } from 'date-fns'
import { useStore } from '../store'
import { ChannelSwitcher } from './ChannelSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { MusicPlayer } from './MusicPlayer'
import { isUnlocked, lockAdmin } from './AdminLock'
import { useStreak } from '../lib/useStreak'
import { cn } from '../lib/cn'

/**
 * Editorial sidebar + shell.
 *
 * Brand: `typewriter:studio` with orange colon — matches lucid:v2 pattern.
 * Nav items are mono-uppercase with a left-edge orange accent bar on active
 * (the .nav-item::before CSS does the heavy lifting).
 * Daily quote sits in serif-italic as the magazine "pull from the cut" moment.
 */

const NAV: { to: string; label: string }[] = [
  { to: '/',          label: 'Dashboard' },
  { to: '/today',     label: 'Today' },
  { to: '/calendar',  label: 'Calendar' },
  { to: '/projects',  label: 'Pipeline' },
  { to: '/checklist', label: 'Checklist' },
  { to: '/output',    label: 'Output' },
  { to: '/expenses',  label: 'Expenses' },
  { to: '/saved',     label: 'Saved' },
  { to: '/settings',  label: 'Settings' },
]

// Curated daily rotation — Naval, Marcus, Seneca, Munger, PG, Rubin.
// Deterministic by day-of-year so the same day always shows the same.
const QUOTES: { text: string; author: string }[] = [
  { text: 'Earn with your mind, not your time.', author: 'Naval' },
  { text: 'Play long-term games with long-term people.', author: 'Naval' },
  { text: 'Read what you love until you love to read.', author: 'Naval' },
  { text: 'Specific knowledge is found by pursuing genuine curiosity.', author: 'Naval' },
  { text: 'The obstacle is the way.', author: 'Marcus' },
  { text: 'Waste no more time arguing what a good man is. Be one.', author: 'Marcus' },
  { text: 'You have power over your mind, not outside events.', author: 'Marcus' },
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
  { text: 'Live in the future, then build what\u2019s missing.', author: 'pg' },
  { text: 'Do things that don\u2019t scale.', author: 'pg' },
  { text: 'Keep your identity small.', author: 'pg' },
  { text: 'Write. Often.', author: 'pg' },
  { text: 'The most important skill is learning how to learn.', author: 'Naval' },
  { text: 'Desire is a contract with yourself to be unhappy until you get it.', author: 'Naval' },
  { text: 'Be the silence between the notes.', author: 'Rubin' },
  { text: 'Every new beginning comes from some other beginning\u2019s end.', author: 'Seneca' },
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
  const personaLabel = persona === 'pa' ? 'pa' : 'you'
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(new Date(), 29 - i)
    const key = format(d, 'yyyy-MM-dd')
    return { d, key, count: byDay[key] ?? 0 }
  })
  const dotClass = (count: number) => {
    if (count === 0) return 'bg-ink/10'
    if (count <= 2) return 'bg-viral/30'
    if (count <= 5) return 'bg-viral/60'
    return 'bg-viral'
  }
  const coldStart = current <= 1
  return (
    <div className="px-5 py-4 border-t border-ink/10">
      <div className="mb-3 flex items-center justify-between">
        <span className="mono text-[0.6rem] uppercase tracking-[0.28em] text-muted">
          {personaLabel} · 30 days
        </span>
        <div className="group relative" title={`Longest: ${longest}d`}>
          {coldStart ? (
            <span className="mono text-[0.62rem] uppercase tracking-[0.24em] text-muted">starting fresh</span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Flame size={11} className={`text-viral ${current > 0 ? 'flame-breath' : ''}`} />
              <span className="mono text-[0.8rem] font-medium text-viral tnum">{current}d</span>
            </span>
          )}
          <span className="pointer-events-none absolute right-0 top-full mt-1 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[0.62rem] text-cream opacity-0 transition-opacity group-hover:opacity-100 z-30">
            longest · {longest}d
          </span>
        </div>
      </div>
      <div className="flex gap-[2px]">
        {days.map(({ key, count, d }) => (
          <span
            key={key}
            title={`${format(d, 'MMM d')} · ${count} ${count === 1 ? 'item' : 'items'}`}
            className={`h-[7px] w-[7px] rounded-[1px] ${dotClass(count)}`}
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
  const location = useLocation()

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
    <aside className="flex h-full w-60 flex-col border-r border-ink/10 bg-paper">
      {/* Brand block */}
      <div className="flex items-start justify-between px-5 pb-4 pt-6">
        <div>
          <h1 className="serif text-[1.75rem] leading-none tracking-[-0.02em] text-ink">
            typewriter<span className="text-viral">:</span>studio
          </h1>
          <p className="mono mt-2 text-[0.6rem] uppercase tracking-[0.28em] text-muted">
            where the pipeline lives
          </p>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="p-1 text-muted hover:text-ink md:hidden"
          aria-label="close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Channel picker */}
      <div className="mb-3 border-b border-ink/10 px-4 pb-4">
        <p className="mono mb-2 px-1 text-[0.58rem] uppercase tracking-[0.3em] text-muted">
          channel
        </p>
        <ChannelSwitcher canManage={true} />
      </div>

      {/* Nav */}
      <nav
        className="flex-1 space-y-0.5 overflow-auto px-3"
        aria-label="primary"
      >
        {NAV.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'nav-item mono flex items-center gap-3 px-3 py-2.5 text-[0.7rem] uppercase tracking-[0.22em] transition-colors',
                isActive
                  ? 'is-active text-ink font-medium'
                  : 'text-muted hover:text-ink',
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer actions */}
      <div className="space-y-0.5 border-t border-ink/10 p-3">
        {unlocked && (
          <button
            onClick={lockAdmin}
            className="mono flex w-full items-center gap-3 px-3 py-2 text-[0.68rem] uppercase tracking-[0.22em] text-muted hover:text-ink transition-colors"
          >
            <Lock size={13} strokeWidth={1.5} /> lock admin
          </button>
        )}
        <button
          onClick={handleExport}
          className="mono flex w-full items-center gap-3 px-3 py-2 text-[0.68rem] uppercase tracking-[0.22em] text-muted hover:text-ink transition-colors"
        >
          <Download size={13} strokeWidth={1.5} /> export data
        </button>
        <button
          onClick={signOut}
          className="mono flex w-full items-center gap-3 px-3 py-2 text-[0.68rem] uppercase tracking-[0.22em] text-muted hover:text-danger transition-colors"
        >
          <LogOut size={13} strokeWidth={1.5} /> sign out
        </button>
      </div>

      {/* Streak pulse */}
      <PulseCard />

      {/* Daily quote — serif-italic editorial pullquote in miniature */}
      <div className="border-t border-ink/10 px-5 py-4">
        <p className="serif-italic text-[0.95rem] leading-[1.35] text-ink/85">
          &ldquo;{quote.text}&rdquo;
        </p>
        <p className="mono mt-2 text-[0.56rem] uppercase tracking-[0.3em] text-muted">
          · {quote.author}
        </p>
        <p className="mono mt-4 text-[0.56rem] uppercase tracking-[0.3em] text-muted/70">
          synced to cloud
        </p>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-cream text-ink">
      {/* Desktop sidebar */}
      <div className="hidden md:block">{Sidebar}</div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink/40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">{Sidebar}</div>
        </>
      )}

      <main className="relative flex-1 overflow-auto">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-ink/10 bg-paper/90 px-4 backdrop-blur md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="open menu"
            className="p-1.5 text-ink hover:bg-cream rounded"
          >
            <Menu size={18} />
          </button>
          <span className="serif text-[0.95rem] text-ink">
            typewriter<span className="text-viral">:</span>studio
          </span>
          <div className="w-7" />
        </div>

        {/* Floating top-right toolbar — theme + music */}
        <div className="fixed right-4 top-4 z-30 hidden items-start gap-2 md:flex">
          <ThemeToggle />
          <MusicPlayer />
        </div>

        <div key={location.pathname} className="route-fade">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
