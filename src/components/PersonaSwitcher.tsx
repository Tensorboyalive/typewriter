import { User, Users } from 'lucide-react'
import { useStore } from '../store'
import { PERSONAS } from '../types'

// Since both admins share a single login, persona is an app-level toggle
// that tags MIT + time blocks. Stored in localStorage via the store.
export function PersonaSwitcher() {
  const { persona, setPersona } = useStore()
  return (
    <div className="inline-flex rounded-md border border-line bg-surface p-0.5 text-[11px]">
      {PERSONAS.map(p => {
        const active = persona === p.id
        const Icon = p.id === 'you' ? User : Users
        return (
          <button
            key={p.id}
            onClick={() => setPersona(p.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              active ? 'bg-blueprint text-white' : 'text-ink-secondary hover:text-ink'
            }`}
            title={`Switch to ${p.label}`}
          >
            <Icon size={12} strokeWidth={1.8} />
            {p.label}
          </button>
        )
      })}
    </div>
  )
}
