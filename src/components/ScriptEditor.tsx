import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, CalendarClock, Radio, FileDown, Edit3, Eye } from 'lucide-react'
import { useStore } from '../store'
import { CONTENT_FORMATS, STATUSES, type ProjectStatus, type ContentFormat } from '../types'
import { Select } from './Select'
import { Timer } from './Timer'
import { LinkifiedText } from './LinkifiedText'
import { exportScriptToPdf } from '../lib/exportPdf'
import { cn } from '../lib/cn'

export function ScriptEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projects, updateProject, deleteProject, channels, switchChannel } = useStore()
  const project = projects.find(p => p.id === id)

  const [mode, setMode] = useState<'edit' | 'read'>('edit')
  const [exporting, setExporting] = useState(false)

  const handleDownloadPdf = async () => {
    if (!project) return
    setExporting(true)
    try {
      await exportScriptToPdf(project)
    } finally {
      setExporting(false)
    }
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 md:px-10">
        <button
          onClick={() => navigate('/projects')}
          className="mono inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.24em] text-muted hover:text-viral"
        >
          <ArrowLeft size={13} /> back to pipeline
        </button>
        <p className="mono mt-8 text-[0.72rem] uppercase tracking-[0.24em] text-muted">
          project not found.
        </p>
      </div>
    )
  }

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
    <div className="flex h-full flex-col bg-cream">
      {/* Top rail: back + title + status + format chips + actions */}
      <div className="rule-bottom border-ink/10 bg-paper/70 px-6 py-4 backdrop-blur-sm md:px-10 md:pr-36">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/projects')}
            aria-label="back to pipeline"
            className="mt-2 p-1 text-muted hover:text-viral shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <input
              value={project.title}
              onChange={e => updateProject(project.id, { title: e.target.value })}
              className="serif w-full bg-transparent text-[clamp(1.5rem,calc(1rem+1vw),2.25rem)] leading-[1.05] tracking-[-0.02em] text-ink outline-none placeholder:text-ink/30"
              placeholder="untitled project"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Select
                value={project.status}
                onChange={val => updateProject(project.id, { status: val as ProjectStatus })}
                options={STATUSES.map(s => ({ value: s.id, label: s.label }))}
                compact
              />
              {/* Content-format segmented control — editorial chip treatment */}
              <div className="flex items-center gap-1.5">
                {CONTENT_FORMATS.map(f => {
                  const active = project.format === f.id
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => updateProject(project.id, { format: f.id as ContentFormat })}
                      className={cn(
                        'mono px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.24em] transition-colors',
                        active ? 'bg-viral text-ink' : 'text-muted hover:text-ink',
                      )}
                    >
                      {f.label.toLowerCase()}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <Timer />
            <div className="flex items-center rounded-full border border-ink/15 p-0.5">
              <button
                type="button"
                onClick={() => setMode('edit')}
                aria-pressed={mode === 'edit'}
                className={cn(
                  'mono inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.24em] transition-colors',
                  mode === 'edit' ? 'bg-ink text-cream' : 'text-muted hover:text-ink',
                )}
              >
                <Edit3 size={11} /> edit
              </button>
              <button
                type="button"
                onClick={() => setMode('read')}
                aria-pressed={mode === 'read'}
                className={cn(
                  'mono inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.24em] transition-colors',
                  mode === 'read' ? 'bg-ink text-cream' : 'text-muted hover:text-ink',
                )}
              >
                <Eye size={11} /> read
              </button>
            </div>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={exporting}
              className="mono inline-flex items-center gap-1.5 border-b border-ink/20 px-1 pb-1 text-[0.62rem] uppercase tracking-[0.24em] text-muted transition-colors hover:border-viral hover:text-viral disabled:opacity-50"
            >
              <FileDown size={12} /> {exporting ? 'exporting…' : 'download pdf'}
            </button>
            <button
              onClick={() => { deleteProject(project.id); navigate('/projects') }}
              aria-label="delete project"
              className="p-2 text-muted hover:text-danger transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Inline meta bar — scheduled / channel / deadline / word count */}
      <div className="rule-bottom flex flex-wrap items-center gap-x-8 gap-y-3 border-ink/10 bg-paper/30 px-6 py-3 md:px-10">
        <MetaField icon={CalendarClock} label="scheduled">
          <input
            type="date"
            value={project.scheduled_date?.split('T')[0] ?? ''}
            onChange={e => updateProject(project.id, { scheduled_date: e.target.value || null })}
            className="mono bg-transparent text-[0.75rem] text-ink outline-none border-b border-transparent hover:border-ink/20 focus:border-viral tnum"
          />
        </MetaField>

        <MetaField icon={Radio} label="channel">
          <select
            value={project.channel_id}
            onChange={e => handleChannelChange(e.target.value)}
            className="mono bg-transparent text-[0.75rem] text-ink outline-none border-b border-transparent hover:border-ink/20 focus:border-viral"
          >
            {channels.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </MetaField>

        <MetaField icon={CalendarClock} label="deadline">
          <input
            type="date"
            value={project.deadline?.split('T')[0] ?? ''}
            onChange={e => updateProject(project.id, { deadline: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="mono bg-transparent text-[0.75rem] text-ink outline-none border-b border-transparent hover:border-ink/20 focus:border-viral tnum"
          />
        </MetaField>

        <span className="mono ml-auto text-[0.6rem] uppercase tracking-[0.26em] text-muted tnum">
          {wordCount} words
        </span>
      </div>

      {/* Script body */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[780px] px-6 py-12 md:px-10 md:py-16">
          {mode === 'edit' ? (
            <textarea
              value={project.script}
              onChange={e => updateProject(project.id, { script: e.target.value })}
              placeholder={`start writing your script here…\n\nthink about:\n\u00B7 hook \u2014 first 3 seconds\n\u00B7 story \u2014 the main content\n\u00B7 cta \u2014 what should they do?`}
              className="min-h-[60vh] w-full resize-none bg-transparent text-[1.02rem] leading-[1.7] text-ink outline-none placeholder:text-ink/30"
            />
          ) : (
            <div className="serif min-h-[60vh] text-[1.2rem] leading-[1.6] text-ink">
              {project.script.trim() ? (
                <LinkifiedText text={project.script} />
              ) : (
                <p className="serif-italic text-muted">nothing written yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetaField({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="mono inline-flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.26em] text-muted">
      <Icon size={12} />
      <span>{label}</span>
      {children}
    </label>
  )
}
