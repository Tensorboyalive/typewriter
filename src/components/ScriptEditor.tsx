import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, ChevronDown, ChevronRight, Users, Link, CalendarClock } from 'lucide-react'
import { useStore } from '../store'
import { CONTENT_TYPES, STATUSES, type ProjectStatus } from '../types'
import { Select } from './Select'
import { Timer } from './Timer'

export function ScriptEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projects, updateProject, deleteProject, teamMembers } = useStore()
  const project = projects.find(p => p.id === id)
  const [teamOpen, setTeamOpen] = useState(
    () => !!(project?.assigned_to || project?.delivery_link || project?.posted_link)
  )

  if (!project) {
    return (
      <div className="p-8">
        <p className="text-ink-muted">Project not found.</p>
        <button
          onClick={() => navigate('/projects')}
          className="mt-2 text-blueprint text-sm hover:underline"
        >
          &larr; Back to projects
        </button>
      </div>
    )
  }

  const typeInfo = CONTENT_TYPES.find(t => t.id === project.type)
  const canAssign = true
  const canEditDelivery = true
  const canEditPosted = true

  const handleAssign = (userId: string) => {
    const updates: Partial<typeof project> = { assigned_to: userId || null }
    if (userId && project.status === 'idea') updates.status = 'assigned'
    if (userId && project.status === 'scripted') updates.status = 'assigned'
    updateProject(project.id, updates)
  }

  const handleDeliveryLink = (link: string) => {
    const updates: Partial<typeof project> = { delivery_link: link || null }
    if (link && project.status === 'assigned') {
      updates.status = 'in_edit'
      updates.delivered_at = new Date().toISOString()
    }
    updateProject(project.id, updates)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-8 py-4 border-b border-line bg-surface/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/projects')}
            className="p-2 rounded-md hover:bg-canvas text-ink-secondary transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <input
              value={project.title}
              onChange={e =>
                updateProject(project.id, { title: e.target.value })
              }
              className="text-xl font-light text-ink bg-transparent border-none focus:outline-none w-full"
              placeholder="Project title..."
            />
            <div className="flex items-center gap-3 mt-1">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{
                  backgroundColor: typeInfo?.color + '18',
                  color: typeInfo?.color,
                }}
              >
                {typeInfo?.label}
              </span>
              <Select
                value={project.status}
                onChange={val =>
                  updateProject(project.id, {
                    status: val as ProjectStatus,
                  })
                }
                options={STATUSES.map(s => ({ value: s.id, label: s.label }))}
                compact
              />
              {project.scheduled_date && (
                <span className="text-[10px] text-ink-muted">
                  {new Date(project.scheduled_date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Timer />
          <button
            onClick={() => {
              deleteProject(project.id)
              navigate('/projects')
            }}
            className="p-2 rounded-md hover:bg-danger-light text-ink-muted hover:text-danger transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-8 py-10 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            Script
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted tabular-nums">
            {project.script.trim()
              ? project.script.trim().split(/\s+/).length
              : 0}{' '}
            words
          </p>
        </div>
        <textarea
          value={project.script}
          onChange={e =>
            updateProject(project.id, { script: e.target.value })
          }
          placeholder={`Start writing your script here...\n\nThink about:\n\u2022 Hook \u2014 First 3 seconds\n\u2022 Story \u2014 The main content\n\u2022 CTA \u2014 What should they do?`}
          className="w-full min-h-[400px] bg-transparent text-ink leading-relaxed resize-none focus:outline-none text-[15px]"
        />

        {/* Team & Delivery — collapsible */}
        <div className="mt-8 border-t border-line pt-6">
          <button
            onClick={() => setTeamOpen(!teamOpen)}
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-ink-muted hover:text-ink transition-colors mb-4"
          >
            {teamOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Users size={14} />
            Team & Delivery
          </button>

          {teamOpen && (
            <div className="grid grid-cols-2 gap-4">
              {/* Assign to */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Assigned to</p>
                {canAssign ? (
                  <select
                    value={project.assigned_to ?? ''}
                    onChange={e => handleAssign(e.target.value)}
                    className="w-full text-sm bg-surface border border-line rounded-md px-3 py-2 text-ink"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map(tm => (
                      <option key={tm.user_id} value={tm.user_id}>
                        {tm.profile_name} ({tm.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-ink-secondary py-2">
                    {teamMembers.find(tm => tm.user_id === project.assigned_to)?.profile_name ?? 'Unassigned'}
                  </p>
                )}
              </div>

              {/* Deadline */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">
                  <CalendarClock size={12} className="inline mr-1" />
                  Deadline
                </p>
                {canAssign ? (
                  <input
                    type="date"
                    value={project.deadline?.split('T')[0] ?? ''}
                    onChange={e => updateProject(project.id, {
                      deadline: e.target.value ? new Date(e.target.value).toISOString() : null
                    })}
                    className="w-full text-sm bg-surface border border-line rounded-md px-3 py-2 text-ink"
                  />
                ) : (
                  <p className="text-sm text-ink-secondary py-2">
                    {project.deadline
                      ? new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'No deadline'}
                  </p>
                )}
              </div>

              {/* Delivery link */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">
                  <Link size={12} className="inline mr-1" />
                  Delivery link
                </p>
                {canEditDelivery ? (
                  <input
                    type="url"
                    value={project.delivery_link ?? ''}
                    onChange={e => handleDeliveryLink(e.target.value)}
                    placeholder="Paste Drive/Dropbox link..."
                    className="w-full text-sm bg-surface border border-line rounded-md px-3 py-2 text-ink"
                  />
                ) : (
                  <p className="text-sm text-ink-secondary py-2 truncate">
                    {project.delivery_link || 'Not submitted'}
                  </p>
                )}
              </div>

              {/* Posted link */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">
                  <Link size={12} className="inline mr-1" />
                  Posted link
                </p>
                {canEditPosted ? (
                  <input
                    type="url"
                    value={project.posted_link ?? ''}
                    onChange={e => {
                      const link = e.target.value
                      const updates: Partial<typeof project> = { posted_link: link || null }
                      if (link && !project.posted_at) {
                        updates.posted_at = new Date().toISOString()
                        updates.status = 'posted'
                      }
                      updateProject(project.id, updates)
                    }}
                    placeholder="Paste published URL..."
                    className="w-full text-sm bg-surface border border-line rounded-md px-3 py-2 text-ink"
                  />
                ) : (
                  <p className="text-sm text-ink-secondary py-2 truncate">
                    {project.posted_link || 'Not posted'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
