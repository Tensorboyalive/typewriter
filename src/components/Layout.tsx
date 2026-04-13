import { NavLink, Outlet } from 'react-router-dom'
import { Home, Calendar, LayoutGrid, DollarSign, Bookmark, LogOut, Download, Library, CheckSquare, Settings, ClipboardList, FileOutput, Handshake, Eye } from 'lucide-react'
import { useStore } from '../store'
import { ChannelSwitcher } from './ChannelSwitcher'
import type { UserRole } from '../types'

const NAV_ALL = [
  { to: '/', icon: Home, label: 'Home', roles: ['admin', 'pa', 'editor'] },
  { to: '/calendar', icon: Calendar, label: 'Calendar', roles: ['admin', 'pa', 'editor'] },
  { to: '/projects', icon: LayoutGrid, label: 'Pipeline', roles: ['admin', 'pa'] },
  { to: '/queue', icon: ClipboardList, label: 'My Queue', roles: ['editor'] },
  { to: '/bank', icon: Library, label: 'Content Bank', roles: ['admin', 'pa'] },
  { to: '/checklist', icon: CheckSquare, label: 'Checklist', roles: ['admin', 'pa'] },
  { to: '/output', icon: FileOutput, label: 'Output', roles: ['admin', 'pa', 'editor'] },
  { to: '/deals', icon: Handshake, label: 'Deals', roles: ['admin'] },
  { to: '/expenses', icon: DollarSign, label: 'Expenses', roles: ['admin'] },
  { to: '/saved', icon: Bookmark, label: 'Saved', roles: ['admin', 'pa'] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['admin', 'pa', 'editor'] },
]

const VIEW_AS_ROLES: { id: UserRole | 'self'; label: string }[] = [
  { id: 'self', label: 'Your View' },
  { id: 'pa', label: 'PA View' },
  { id: 'editor', label: 'Editor View' },
]

export function Layout() {
  const { signOut, exportAllData, userRole, effectiveRole, viewAs, setViewAs } = useStore()
  const isPreviewMode = viewAs !== 'self'
  const NAV = NAV_ALL.filter(n => n.roles.includes(effectiveRole))

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
          <ChannelSwitcher canManage={userRole === 'admin'} />
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
          {/* View As — admin only */}
          {userRole === 'admin' && (
            <div className="mb-1">
              <p className="text-[9px] uppercase tracking-[0.2em] text-ink-muted px-3 mb-1">
                <Eye size={10} className="inline mr-1" />View as
              </p>
              <div className="flex gap-1 px-1">
                {VIEW_AS_ROLES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setViewAs(r.id)}
                    className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                      viewAs === r.id
                        ? 'border-blueprint bg-blueprint/10 text-blueprint font-medium'
                        : 'border-line text-ink-muted hover:text-ink-secondary'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {userRole === 'admin' && !isPreviewMode && (
            <button onClick={handleExport}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ink-secondary hover:bg-canvas transition-colors w-full">
              <Download size={16} strokeWidth={1.5} /> Export data
            </button>
          )}
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
        {isPreviewMode && (
          <div className="bg-warning/10 border-b border-warning/20 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-warning" />
              <span className="text-[11px] text-warning font-medium uppercase tracking-wider">
                Preview: {viewAs === 'pa' ? 'PA' : 'Editor'} view
              </span>
              <span className="text-[10px] text-warning/70">— This is what your {viewAs === 'pa' ? 'PA sees' : 'editors see'}. Data is still your own.</span>
            </div>
            <button
              onClick={() => setViewAs('self')}
              className="text-[11px] px-2.5 py-1 rounded-full bg-warning/20 text-warning hover:bg-warning/30 transition-colors font-medium"
            >
              Exit preview
            </button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
