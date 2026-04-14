import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, CalendarClock, Radio } from 'lucide-react'
import { useStore } from '../store'
import { CONTENT_TYPES, CONTENT_FORMATS, STATUSES, type ProjectStatus, type ContentFormat } from '../types'
import { Select } from './Select'
import { Timer } from './Timer'

export function ScriptEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projects, updateProject, deleteProject, channels, switchChannel } = useStore()
  const project = projects.find(p => p.id === id)

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

  const handleChannelChange = async (newChannelId: string) => {
    if (newChannelId === project.channel_id) return
    await updateProject(project.id, { channel_id: newChannelId })
    // Jump to the destination channel so the project remains visible.
    switchChannel(newChannelId)
    navigate('/projects')
  }

  const wordCount = project.script.trim()
    ? project.script.trim().split(/\s+/).length
    : 0

  return (
    <div className="h-full flex flex-col bg-canvas">
      {/* Header bar */}
      <div className="flex items-center justify-between px-8 py-4 md:pr-40 border-b border-line bg-surface/90 backdrop-blur-sm">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={() => navigate('/projects')}
            className="p-2 rounded-md hover:bg-canvas text-ink-secondary transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <input
              value={project.title}
              onChange={e => updateProject(project.id, { title: e.target.value })}
              className="text-xl font-light text-ink bg-transparent border-none focus:outline-none w-full"
              placeholder="Project title..."
            />
            <div className="flex items-center gap-3 mt-1 flex-wrap">
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
                  updateProject(project.id, { status: val as ProjectStatus })
                }
                options={STATUSES.map(s => ({ value: s.id, label: s.label }))}
                compact
              />
              {/* Content-format segmented control */}
              <div className="flex items-center gap-1">
                {CONTENT_FORMATS.map(f => {
                  const active = project.format === f.id
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => updateProject(project.id, { format: f.id as ContentFormat })}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] border transition-colors ${
                        active
                          ? 'bg-blueprint-light text-blueprint border-blueprint'
                          : 'bg-canvas border-line text-ink-secondary hover:border-blueprint/40'
                      }`}
                    >
                      {f.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
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

      {/* Inline meta bar — scheduled date, channel, deadline */}
      <div className="px-8 py-3 border-b border-line bg-surface/60 flex items-center gap-6 flex-wrap">
        <label className="flex items-center gap-2 text-[11px]">
          <CalendarClock size={13} className="text-ink-muted" />
          <span className="uppercase tracking-[0.15em] text-ink-muted">Scheduled</span>
          <input
            type="date"
            value={project.scheduled_date?.split('T')[0] ?? ''}
            onChange={e =>
              updateProject(project.id, {
                scheduled_date: e.target.value || null,
              })
            }
            className="bg-transparent border border-line rounded px-2 py-1 text-ink text-[12px] focus:outline-none focus:border-blueprint"
          />
        </label>

        <label className="flex items-center gap-2 text-[11px]">
          <Radio size={13} className="text-ink-muted" />
          <span className="uppercase tracking-[0.15em] text-ink-muted">Channel</span>
          <select
            value={project.channel_id}
            onChange={e => handleChannelChange(e.target.value)}
            className="bg-transparent border border-line rounded px-2 py-1 text-ink text-[12px] focus:outline-none focus:border-blueprint"
          >
            {channels.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-[11px]">
          <CalendarClock size={13} className="text-ink-muted" />
          <span className="uppercase tracking-[0.15em] text-ink-muted">Deadline</span>
          <input
            type="date"
            value={project.deadline?.split('T')[0] ?? ''}
            onChange={e =>
              updateProject(project.id, {
                deadline: e.target.value ? new Date(e.target.value).toISOString() : null,
              })
            }
            className="bg-transparent border border-line rounded px-2 py-1 text-ink text-[12px] focus:outline-none focus:border-blueprint"
          />
        </label>

        <span className="ml-auto text-[10px] uppercase tracking-[0.15em] text-ink-muted tabular-nums">
          {wordCount} words
        </span>
      </div>

      {/* Script editor — fills remaining viewport */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-10 h-full">
          <textarea
            value={project.script}
            onChange={e => updateProject(project.id, { script: e.target.value })}
            placeholder={`Start writing your script here...\n\nThink about:\n\u2022 Hook — First 3 seconds\n\u2022 Story — The main content\n\u2022 CTA — What should they do?`}
            className="w-full h-full min-h-[60vh] bg-transparent text-ink leading-relaxed resize-none focus:outline-none text-[16px]"
          />
        </div>
      </div>
    </div>
  )
}
