import { useState, useEffect, type ReactNode } from 'react'
import { Lock } from 'lucide-react'

// Simple app-level passcode gate. Both admins share one login, so this is a
// soft barrier on sensitive surfaces (Finances, Expenses) — NOT a security
// boundary. The real data is still protected by Supabase RLS.
const PASSCODE = '1613'
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

// Copy is intentionally warm & ego-safe — the PA shares this login, and the
// earlier phrasing ("Owner passcode required", "Admin access required") read
// as distrustful. These variants nod to the gate without making anyone feel
// shut out.
const COPY = {
  inline: {
    heading: 'Just for the boss',
    subline: 'Numbers nerd-out — nothing to see here ✦',
    cta: 'Verify admin',
  },
  page: {
    heading: 'Finance lounge',
    subline: "This corner's the owner's playground.",
    cta: 'Verify admin',
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

  // Reset reveal state when lock state flips
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
    <div className={`bg-surface border border-line rounded-xl shadow ${variant === 'inline' ? 'p-4 max-w-xs' : 'p-6 max-w-sm'} text-center w-full`}>
      <div className={`mx-auto rounded-lg bg-blueprint-light/60 flex items-center justify-center mb-2 ${variant === 'inline' ? 'w-8 h-8' : 'w-10 h-10'}`}>
        <Lock size={variant === 'inline' ? 14 : 16} className="text-blueprint/80" />
      </div>
      <p className={`font-medium text-ink ${variant === 'inline' ? 'text-[12px]' : 'text-sm'}`}>{copy.heading}</p>
      <p className={`text-ink-muted ${variant === 'inline' ? 'text-[10px] mt-0.5' : 'text-[12px] mt-1'}`}>{copy.subline}</p>

      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="mt-3 text-[11px] uppercase tracking-wide text-ink-muted hover:text-blueprint hover:underline transition-colors"
        >
          {copy.cta}
        </button>
      ) : (
        <div className="mt-3">
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="••••"
            className={`w-full px-2 py-1.5 text-center tracking-[0.3em] bg-canvas border rounded text-sm transition-colors ${
              error ? 'border-ink-muted' : 'border-line focus:border-blueprint'
            }`}
          />
          {error && <p className="mt-1 text-ink-muted text-[11px]">Try again</p>}
          <button onClick={submit}
            className={`mt-2 w-full py-1.5 ${variant === 'inline' ? 'text-[12px]' : 'text-sm'} bg-blueprint text-white rounded hover:bg-blueprint-dark`}>
            Unlock
          </button>
          <button
            onClick={() => { setExpanded(false); setInput(''); setError(false) }}
            className="mt-1.5 text-[11px] text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )

  if (variant === 'inline') {
    return (
      <div className="relative">
        <div className="pointer-events-none blur-md opacity-40 select-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center p-4">{Card}</div>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      <div className="absolute inset-0 pointer-events-none blur-md opacity-40 select-none overflow-hidden">
        {children}
      </div>
      <div className="relative z-10 h-full flex items-center justify-center p-6">{Card}</div>
    </div>
  )
}
