import { useState } from 'react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { Plus, GripVertical } from 'lucide-react'
import { useStore } from '../store'
import { STATUSES, CONTENT_TYPES, type ContentType, type ProjectStatus } from '../types'
import { Select } from './Select'

export function Kanban() {
  const { projects, updateProject, addProject } = useStore()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<ContentType>('reel')
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const newStatus = result.destination.droppableId as ProjectStatus
    updateProject(result.draggableId, { status: newStatus })
  }

  const handleAdd = () => {
    if (!newTitle.trim()) return
    addProject({
      title: newTitle.trim(),
      type: newType,
      status: 'ideation',
      scheduledDate: new Date(newDate).toISOString(),
      script: '',
      description: '',
    })
    setNewTitle('')
    setAdding(false)
  }

  return (
    <div className="p-8 h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-1">
            Projects
          </p>
          <h2 className="text-2xl font-light text-ink">Content Pipeline</h2>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blueprint text-white rounded-md text-sm hover:bg-blueprint-dark transition-colors"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {adding && (
        <div className="mb-6 bg-surface border border-line rounded-lg p-4 max-w-lg">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-3">
            New project
          </p>
          <div className="flex gap-2 flex-wrap">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Project title..."
              autoFocus
              className="input flex-1 min-w-[180px]"
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') setAdding(false)
              }}
            />
            <Select
              value={newType}
              onChange={val => setNewType(val as ContentType)}
              options={CONTENT_TYPES.map(t => ({ value: t.id, label: t.label, color: t.color }))}
            />
            <input
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              type="date"
              className="input"
            />
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blueprint text-white rounded-md text-sm"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 pb-4">
          {STATUSES.map(status => {
            const col = projects.filter(p => p.status === status.id)
            return (
              <div key={status.id} className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    {status.label}
                  </p>
                  <span className="text-[10px] bg-canvas text-ink-muted px-1.5 py-0.5 rounded-full">
                    {col.length}
                  </span>
                </div>
                <Droppable droppableId={status.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 min-h-40 p-2 rounded-lg border border-dashed transition-colors
                        ${snapshot.isDraggingOver ? 'border-blueprint bg-blueprint-light/30' : 'border-line-light bg-canvas/30'}`}
                    >
                      {col.map((project, index) => {
                        const typeInfo = CONTENT_TYPES.find(
                          t => t.id === project.type,
                        )
                        return (
                          <Draggable
                            key={project.id}
                            draggableId={project.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                onClick={() =>
                                  navigate(`/projects/${project.id}`)
                                }
                                className={`bg-surface border border-line rounded-md p-3 cursor-pointer group transition-shadow
                                  ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blueprint' : 'hover:shadow-sm'}`}
                              >
                                <div className="flex items-start justify-between">
                                  <p className="text-sm text-ink font-medium leading-snug">
                                    {project.title}
                                  </p>
                                  <div
                                    {...provided.dragHandleProps}
                                    className="text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity ml-2 mt-0.5"
                                  >
                                    <GripVertical size={14} />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                    style={{
                                      backgroundColor: typeInfo?.color + '18',
                                      color: typeInfo?.color,
                                    }}
                                  >
                                    {typeInfo?.label}
                                  </span>
                                  {project.scheduledDate && (
                                    <span className="text-[10px] text-ink-muted">
                                      {new Date(
                                        project.scheduledDate,
                                      ).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        )
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>
    </div>
  )
}
