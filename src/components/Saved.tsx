import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pin, PinOff, Trash2, Search } from 'lucide-react'
import { useStore } from '../store'
import { NOTE_LABELS, type NoteLabel } from '../types'

export function Saved() {
  const navigate = useNavigate()
  const { notes, addNote, updateNote, deleteNote } = useStore()

  const [filter, setFilter] = useState<NoteLabel | 'all'>('all')
  const [search, setSearch] = useState('')

  const handleNewNote = async () => {
    const note = await addNote({ title: '', content: '', label: 'Idea' })
    if (note) navigate(`/saved/${note.id}`)
  }

  const filtered = notes
    .filter(n => filter === 'all' || n.label === filter)
    .filter(n => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    })

  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-1">Saved</p>
          <h2 className="text-2xl font-light text-ink">Your Notes</h2>
        </div>
        <button
          onClick={handleNewNote}
          className="flex items-center gap-2 px-4 py-2 bg-blueprint text-white rounded-md text-sm hover:bg-blueprint-dark transition-colors"
        >
          <Plus size={16} /> New Note
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="input w-full pl-9 text-sm"
          />
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
              filter === 'all' ? 'bg-ink text-white' : 'text-ink-secondary hover:bg-canvas'
            }`}
          >
            All
          </button>
          {NOTE_LABELS.map(l => (
            <button
              key={l.id}
              onClick={() => setFilter(filter === l.id ? 'all' : l.id)}
              className="px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors"
              style={{
                backgroundColor: filter === l.id ? l.color + '18' : undefined,
                color: filter === l.id ? l.color : undefined,
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-ink-muted text-sm">
            {search || filter !== 'all' ? 'No notes match your filter' : 'No notes yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {sorted.map(note => {
            const labelInfo = NOTE_LABELS.find(l => l.id === note.label)
            return (
              <div
                key={note.id}
                onClick={() => navigate(`/saved/${note.id}`)}
                className={`flex items-center gap-3 bg-surface border rounded-md px-4 py-3 cursor-pointer group transition-all hover:shadow-sm hover:border-blueprint/40 ${
                  note.pinned ? 'border-blueprint/30' : 'border-line'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{
                        backgroundColor: labelInfo?.color + '18',
                        color: labelInfo?.color,
                      }}
                    >
                      {labelInfo?.label}
                    </span>
                    {note.pinned && <Pin size={10} className="text-blueprint" />}
                    <span className="text-[10px] text-ink-muted">{timeAgo(note.updated_at)}</span>
                  </div>
                  {note.title && (
                    <p className="text-sm font-medium text-ink mb-0.5 truncate">{note.title}</p>
                  )}
                  {note.content && (
                    <p className="text-[13px] text-ink-secondary truncate">{note.content}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      updateNote(note.id, { pinned: !note.pinned })
                    }}
                    className="p-1.5 rounded text-ink-muted hover:text-blueprint"
                  >
                    {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      if (confirm('Delete this note?')) deleteNote(note.id)
                    }}
                    className="p-1.5 rounded text-ink-muted hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
