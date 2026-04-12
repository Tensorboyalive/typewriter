import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Sparkles } from 'lucide-react'
import { useStore } from '../store'
import { CONTENT_TYPES, STATUSES, type ProjectStatus } from '../types'
import { Select } from './Select'
import { Timer } from './Timer'
import { Repurposer } from './Repurposer'

export function ScriptEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projects, updateProject, deleteProject } = useStore()
  const project = projects.find(p => p.id === id)
  const [showRepurposer, setShowRepurposer] = useState(false)

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
              {project.scheduledDate && (
                <span className="text-[10px] text-ink-muted">
                  {new Date(project.scheduledDate).toLocaleDateString('en-US', {
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
          {project.script.trim().length > 20 && (
            <button
              onClick={() => setShowRepurposer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blueprint/10 text-blueprint rounded-md text-[11px] uppercase tracking-[0.1em] font-medium hover:bg-blueprint/20 transition-colors"
            >
              <Sparkles size={13} />
              Repurpose
            </button>
          )}
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

      <div className="flex-1 max-w-3xl mx-auto w-full px-8 py-10">
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
          className="w-full min-h-[500px] bg-transparent text-ink leading-relaxed resize-none focus:outline-none text-[15px]"
        />
      </div>

      <Repurposer
        script={project.script}
        title={project.title}
        contentType={project.type}
        isOpen={showRepurposer}
        onClose={() => setShowRepurposer(false)}
      />
    </div>
  )
}
