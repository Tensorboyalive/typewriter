import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pin, PinOff, Trash2, Search, Loader2 } from 'lucide-react'
import { useStore } from '../store'
import { NOTE_LABELS, type NoteLabel } from '../types'
import { Eyebrow } from './editorial/Eyebrow'
import { cn } from '../lib/cn'

export function Saved() {
  const navigate = useNavigate()
  const { notes, addNote, updateNote, deleteNote } = useStore()

  const [filter, setFilter] = useState<NoteLabel | 'all'>('all')
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
    <div className="mx-auto w-full max-w-[1100px] px-6 py-10 md:px-10 md:py-16">
      {/* Editorial header — eyebrow + serif display H1 + CTA right */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        <div className="md:col-span-8">
          <Eyebrow>the studio · notebook</Eyebrow>
          <h1
            className="serif mt-6 leading-[0.95] tracking-[-0.02em] text-ink"
            style={{ fontSize: 'clamp(2.5rem, calc(1rem + 3vw), 4rem)' }}
          >
            your <span className="serif-italic">notes</span>,<br />
            unarchived.
          </h1>
        </div>
        <div className="md:col-span-4 md:self-end md:flex md:justify-end">
          <button
            onClick={handleNewNote}
            className="mono inline-flex items-center gap-3 rounded-full bg-ink px-6 py-3.5 text-[0.72rem] uppercase tracking-[0.24em] text-cream transition hover:bg-viral hover:text-ink"
          >
            <Plus size={13} strokeWidth={2} /> new note
          </button>
        </div>
      </div>

      {/* Filter rail */}
      <div className="mt-10 rule-top rule-bottom flex flex-col gap-4 border-ink/10 py-5 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-[360px] flex-1">
          <Search size={13} className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="search notes…"
            className="mono w-full border-0 border-b border-ink/15 bg-transparent py-2 pl-5 text-[0.85rem] placeholder:text-muted/60 focus:border-viral focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'mono px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.24em] transition-colors',
              filter === 'all' ? 'bg-ink text-cream' : 'text-muted hover:text-ink',
            )}
          >
            all
          </button>
          {NOTE_LABELS.map(l => {
            const active = filter === l.id
            return (
              <button
                key={l.id}
                onClick={() => setFilter(active ? 'all' : l.id)}
                className={cn(
                  'mono inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.24em] transition-colors',
                  active ? 'text-ink' : 'text-muted hover:text-ink',
                )}
                style={active ? { boxShadow: `inset 0 -2px 0 ${l.color}` } : undefined}
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: l.color }}
                />
                {l.label.toLowerCase()}
              </button>
            )
          })}
        </div>
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="py-24 text-center">
          <p className="mono text-[0.7rem] uppercase tracking-[0.26em] text-muted">
            {search || filter !== 'all' ? 'no notes match your filter' : 'no notes yet. start with new note.'}
          </p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-ink/10 rule-top rule-bottom">
          {sorted.map(note => {
            const labelInfo = NOTE_LABELS.find(l => l.id === note.label)
            return (
              <li key={note.id}>
                <div
                  onClick={() => navigate(`/saved/${note.id}`)}
                  className="stagger-in group relative flex cursor-pointer items-start gap-6 py-5 pr-2 transition-colors hover:bg-paper/60 -mx-2 px-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      {labelInfo && (
                        <span className="mono inline-flex items-center gap-1.5 text-[0.58rem] uppercase tracking-[0.26em] text-muted">
                          <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: labelInfo.color }}
                          />
                          {labelInfo.label.toLowerCase()}
                        </span>
                      )}
                      {note.pinned && (
                        <span className="mono inline-flex items-center gap-1 text-[0.58rem] uppercase tracking-[0.26em] text-viral">
                          <Pin size={9} /> pinned
                        </span>
                      )}
                      <span className="mono text-[0.58rem] uppercase tracking-[0.26em] text-muted/80">
                        {timeAgo(note.updated_at)}
                      </span>
                    </div>
                    {note.title ? (
                      <p className="serif mt-2 text-[1.25rem] leading-tight text-ink group-hover:text-viral">
                        {note.title}
                      </p>
                    ) : (
                      <p className="serif-italic mt-2 text-[1.15rem] leading-tight text-muted">
                        untitled
                      </p>
                    )}
                    {note.content && (
                      <p className="mt-1.5 max-w-[78ch] truncate text-[0.92rem] leading-snug text-muted">
                        {note.content}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-start gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        updateNote(note.id, { pinned: !note.pinned })
                      }}
                      aria-label={note.pinned ? 'unpin note' : 'pin note'}
                      className="p-2 text-muted hover:text-viral"
                    >
                      {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                    </button>
                    <button
                      onClick={async e => {
                        e.stopPropagation()
                        setDeletingId(note.id)
                        try {
                          await deleteNote(note.id)
                          setDeletingId(null)
                        } catch { setDeletingId(null) }
                      }}
                      disabled={deletingId === note.id}
                      aria-label="delete note"
                      className="p-2 text-muted hover:text-danger disabled:opacity-60"
                    >
                      {deletingId === note.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
