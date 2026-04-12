import { NavLink, Outlet } from 'react-router-dom'
import { Home, Calendar, LayoutGrid, DollarSign } from 'lucide-react'

const NAV = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/projects', icon: LayoutGrid, label: 'Projects' },
  { to: '/expenses', icon: DollarSign, label: 'Expenses' },
]

export function Layout() {
  return (
    <div className="flex h-screen">
      <aside className="w-56 bg-surface border-r border-line flex flex-col">
        <div className="p-6 pb-8">
          <h1 className="text-xl font-light tracking-wide text-ink">typewriter</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mt-1">
            content studio
          </p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-blueprint-light text-blueprint font-medium'
                    : 'text-ink-secondary hover:bg-canvas'
                }`
              }
            >
              <Icon size={18} strokeWidth={1.5} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-line">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            All data saved locally
          </p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
