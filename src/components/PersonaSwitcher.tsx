import { User, Users } from 'lucide-react'
import { useStore } from '../store'
import { PERSONAS } from '../types'
import { cn } from '../lib/cn'

// Since both admins share a single login, persona is an app-level toggle
// that tags MIT + time blocks. Stored in localStorage via the store.
export function PersonaSwitcher() {
  const { persona, setPersona } = useStore()
  return (
    <div className="mono inline-flex rounded-full border border-ink/15 p-0.5 text-[0.62rem] uppercase tracking-[0.24em]">
      {PERSONAS.map(p => {
        const active = persona === p.id
        const Icon = p.id === 'you' ? User : Users
        return (
          <button
            key={p.id}
            onClick={() => setPersona(p.id)}
            aria-pressed={active}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors',
              active ? 'bg-ink text-cream' : 'text-muted hover:text-ink',
            )}
            title={`switch to ${p.label}`}
          >
            <Icon size={11} strokeWidth={1.8} />
            {p.label.toLowerCase()}
          </button>
        )
      })}
    </div>
  )
}
