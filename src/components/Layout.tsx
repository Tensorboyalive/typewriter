import { NavLink, Outlet } from 'react-router-dom'
import { Home, Calendar, LayoutGrid, DollarSign, Bookmark, LogOut, Download, CheckSquare, Settings, FileOutput } from 'lucide-react'
import { useStore } from '../store'
import { ChannelSwitcher } from './ChannelSwitcher'

const NAV = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/projects', icon: LayoutGrid, label: 'Pipeline' },
  { to: '/checklist', icon: CheckSquare, label: 'Checklist' },
  { to: '/output', icon: FileOutput, label: 'Output' },
  { to: '/expenses', icon: DollarSign, label: 'Expenses' },
  { to: '/saved', icon: Bookmark, label: 'Saved' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Layout() {
  const { signOut, exportAllData } = useStore()

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

  return (
    <div className="flex h-screen">
      <aside className="w-56 bg-surface border-r border-line flex flex-col">
        <div className="p-6 pb-4">
          <h1 className="text-xl font-light tracking-wide text-ink">typewriter</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mt-1">control tower</p>
        </div>

        <div className="px-3 pb-4 border-b border-line mb-2">
          <p className="text-[9px] uppercase tracking-[0.2em] text-ink-muted px-3 mb-1">Channel</p>
          <ChannelSwitcher canManage={true} />
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
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
          <button onClick={handleExport}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ink-secondary hover:bg-canvas transition-colors w-full">
            <Download size={16} strokeWidth={1.5} /> Export data
          </button>
          <button onClick={signOut}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ink-muted hover:bg-canvas hover:text-danger transition-colors w-full">
            <LogOut size={16} strokeWidth={1.5} /> Sign out
          </button>
        </div>

        <div className="px-4 py-3 border-t border-line">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Synced to cloud</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
