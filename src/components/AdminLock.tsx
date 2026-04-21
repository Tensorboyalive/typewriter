import { useState, useEffect, type ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { cn } from '../lib/cn'

// Simple app-level passcode gate. Both admins share one login, so this is a
// soft barrier on sensitive surfaces (Finances, Expenses) — NOT a security
// boundary. The real data is still protected by Supabase RLS.
const PASSCODE = import.meta.env.VITE_ADMIN_PASSCODE || '1613'  // fallback only for dev
const STORAGE_KEY = 'tw-admin-unlock'
const EVT = 'tw-admin-unlock-change'

export const isUnlocked = () => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) === '1'
}

export const lockAdmin = () => {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(EVT))
}

export const unlockAdmin = () => {
  localStorage.setItem(STORAGE_KEY, '1')
  window.dispatchEvent(new Event(EVT))
}

// Subscribe to unlock/lock changes across components.
export function useUnlockState() {
  const [unlocked, setUnlocked] = useState(isUnlocked)
  useEffect(() => {
    const h = () => setUnlocked(isUnlocked())
    window.addEventListener(EVT, h)
    window.addEventListener('storage', h)
    return () => {
      window.removeEventListener(EVT, h)
      window.removeEventListener('storage', h)
    }
  }, [])
  return unlocked
}

// Copy intentionally warm. The PA shares this login; earlier phrasing
// ("Owner passcode required") read as distrustful. Editorial lowercasing
// on top of that stays in tone with design.md §9.
const COPY = {
  inline: {
    eyebrow: 'admin only',
    heading: 'just for the boss',
    subline: "numbers nerd-out. nothing to see here.",
    cta: 'verify admin',
  },
  page: {
    eyebrow: 'admin only',
    heading: 'finance lounge',
    subline: "this corner's the owner's playground.",
    cta: 'verify admin',
  },
}

export function AdminLock({ children, variant = 'page' }: {
  children: ReactNode
  label?: string
  variant?: 'page' | 'inline'
}) {
  const unlocked = useUnlockState()
  const [expanded, setExpanded] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!unlocked) { setExpanded(false); setInput(''); setError(false) }
  }, [unlocked])

  if (unlocked) return <>{children}</>

  const submit = () => {
    if (input === PASSCODE) {
      unlockAdmin()
    } else {
      setError(true)
      setInput('')
      setTimeout(() => setError(false), 1200)
    }
  }

  const copy = variant === 'inline' ? COPY.inline : COPY.page

  const Card = (
    <div
      className={cn(
        'relative w-full rule-top rule-bottom border-ink/10 bg-paper/80 text-center backdrop-blur-sm',
        variant === 'inline' ? 'max-w-xs px-6 py-6' : 'max-w-sm px-8 py-10',
      )}
    >
      <div
        className={cn(
          'mx-auto mb-4 flex items-center justify-center rounded-full bg-viral/15',
          variant === 'inline' ? 'h-8 w-8' : 'h-10 w-10',
        )}
      >
        <Lock size={variant === 'inline' ? 13 : 15} className="text-viral" />
      </div>
      <p className="mono text-[0.58rem] uppercase tracking-[0.28em] text-viral">{copy.eyebrow}</p>
      <p className="serif mt-3 text-[1.3rem] leading-tight text-ink">{copy.heading}</p>
      <p className="mono mt-2 text-[0.62rem] uppercase tracking-[0.24em] text-muted">{copy.subline}</p>

      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="mono mt-5 border-b border-ink/20 pb-0.5 text-[0.66rem] uppercase tracking-[0.24em] text-muted transition-colors hover:border-viral hover:text-viral"
        >
          {copy.cta}
        </button>
      ) : (
        <div className="mt-5">
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="••••"
            className={cn(
              'mono w-full border-b bg-transparent py-2 text-center text-[1rem] tracking-[0.4em] text-ink outline-none placeholder:text-ink/30 transition-colors',
              error ? 'border-danger' : 'border-ink/20 focus:border-viral',
            )}
          />
          {error && (
            <p className="mono mt-2 text-[0.58rem] uppercase tracking-[0.24em] text-danger">
              try again
            </p>
          )}
          <button
            onClick={submit}
            className="mono mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.24em] text-cream transition hover:bg-viral hover:text-ink"
          >
            unlock
          </button>
          <button
            onClick={() => { setExpanded(false); setInput(''); setError(false) }}
            className="mono mt-3 text-[0.6rem] uppercase tracking-[0.24em] text-muted hover:text-ink"
          >
            cancel
          </button>
        </div>
      )}
    </div>
  )

  if (variant === 'inline') {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none opacity-40 blur-md">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center p-4">{Card}</div>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      <div className="pointer-events-none absolute inset-0 select-none overflow-hidden opacity-40 blur-md">
        {children}
      </div>
      <div className="relative z-10 flex h-full items-center justify-center p-6">{Card}</div>
    </div>
  )
}
