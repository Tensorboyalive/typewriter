import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Link, ExternalLink } from 'lucide-react'
import { useStore } from '../store'
import { CONTENT_TYPES, STATUSES, PLATFORMS } from '../types'

export function EditorQueue() {
  const navigate = useNavigate()
  const { user, projects, updateProject } = useStore()
  const [deliveryInput, setDeliveryInput] = useState<Record<string, string>>({})

  const myProjects = projects
    .filter(p => p.assigned_to === user?.id)
    .sort((a, b) => {
      if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      if (a.deadline) return -1
      if (b.deadline) return 1
      return 0
    })

  const pending = myProjects.filter(p => p.status !== 'posted')
  const done = myProjects.filter(p => p.status === 'posted')

  const submitDelivery = async (projectId: string) => {
    const link = deliveryInput[projectId]?.trim()
    if (!link) return
    await updateProject(projectId, {
      delivery_link: link,
      delivered_at: new Date().toISOString(),
      status: 'in_edit',
    })
    setDeliveryInput(prev => ({ ...prev, [projectId]: '' }))
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-1">Your Work</p>
          <h2 className="text-2xl font-light text-ink">Editor Queue</h2>
        </div>
        <div className="flex items-center gap-2 text-ink-muted">
          <ClipboardList size={16} />
          <span className="text-sm tabular-nums">{pending.length} pending</span>
        </div>
      </div>

      {pending.length === 0 && done.length === 0 && (
        <p className="text-sm text-ink-muted py-8 text-center">No tasks assigned to you yet.</p>
      )}

      {pending.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-3">Active</p>
          <div className="space-y-2">
            {pending.map(p => {
              const typeInfo = CONTENT_TYPES.find(t => t.id === p.type)
              const statusInfo = STATUSES.find(s => s.id === p.status)
              const platformInfo = PLATFORMS.find(pl => pl.id === p.platform)
              const isOverdue = p.deadline && new Date(p.deadline) < new Date()

              return (
                <div key={p.id} className="bg-surface border border-line rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate(`/projects/${p.id}`)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="text-sm font-medium text-ink truncate hover:text-blueprint transition-colors">
                        {p.title || 'Untitled'}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                          style={{ backgroundColor: typeInfo?.color + '18', color: typeInfo?.color }}
                        >
                          {typeInfo?.label}
                        </span>
                        {platformInfo && (
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                            style={{ backgroundColor: platformInfo.color + '18', color: platformInfo.color }}
                          >
                            {platformInfo.label}
                          </span>
                        )}
                        <span className="text-[9px] text-ink-muted uppercase tracking-wider">
                          {statusInfo?.label}
                        </span>
                        {p.deadline && (
                          <span className={`text-[9px] ${isOverdue ? 'text-danger font-medium' : 'text-ink-muted'}`}>
                            Due {new Date(p.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Inline delivery submission */}
                  {(p.status === 'assigned' || (p.status === 'in_edit' && !p.delivery_link)) && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-line-light">
                      <div className="relative flex-1">
                        <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                        <input
                          value={deliveryInput[p.id] ?? ''}
                          onChange={e => setDeliveryInput(prev => ({ ...prev, [p.id]: e.target.value }))}
                          placeholder="Paste delivery link..."
                          className="w-full text-sm bg-canvas border border-line rounded-md pl-8 pr-3 py-1.5 text-ink"
                          onKeyDown={e => { if (e.key === 'Enter') submitDelivery(p.id) }}
                        />
                      </div>
                      <button
                        onClick={() => submitDelivery(p.id)}
                        disabled={!deliveryInput[p.id]?.trim()}
                        className="px-3 py-1.5 bg-blueprint text-white rounded-md text-sm disabled:opacity-40 hover:bg-blueprint-dark transition-colors"
                      >
                        Submit
                      </button>
                    </div>
                  )}

                  {p.delivery_link && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-line-light">
                      <ExternalLink size={12} className="text-success shrink-0" />
                      <a
                        href={p.delivery_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-success truncate hover:underline"
                      >
                        {p.delivery_link}
                      </a>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {done.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-3">Completed</p>
          <div className="space-y-1.5">
            {done.map(p => {
              const typeInfo = CONTENT_TYPES.find(t => t.id === p.type)
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="w-full flex items-center gap-3 bg-surface border border-line rounded-md px-4 py-2.5 text-left hover:shadow-sm transition-shadow"
                >
                  <p className="text-sm text-ink-muted flex-1 truncate line-through">{p.title}</p>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                    style={{ backgroundColor: typeInfo?.color + '18', color: typeInfo?.color }}
                  >
                    {typeInfo?.label}
                  </span>
                  <span className="text-[9px] text-success uppercase tracking-wider">Posted</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
