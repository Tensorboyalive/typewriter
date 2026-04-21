import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Pin, PinOff, FileDown, Edit3, Eye } from 'lucide-react'
import { useStore } from '../store'
import { NOTE_LABELS, type NoteLabel } from '../types'
import { LinkifiedText } from './LinkifiedText'
import { exportNoteToPdf } from '../lib/exportPdf'
import { cn } from '../lib/cn'

export function NoteEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { notes, updateNote, deleteNote } = useStore()

  const note = notes.find(n => n.id === id)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [label, setLabel] = useState<NoteLabel>('Idea')
  const [mode, setMode] = useState<'edit' | 'read'>('edit')
  const [exporting, setExporting] = useState(false)

  const handleDownloadPdf = async () => {
    if (!note) return
    setExporting(true)
    try {
      // Merge stored note metadata with local unsaved edits so Download PDF
      // never outputs stale content if the user hasn't blurred yet.
      await exportNoteToPdf({ ...note, title, content })
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      setLabel(note.label)
    }
  }, [note])

  if (!note) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 md:px-10">
        <button
          onClick={() => navigate('/saved')}
          className="mono inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.24em] text-muted hover:text-viral"
        >
          <ArrowLeft size={13} /> back to saved
        </button>
        <p className="mono mt-8 text-[0.72rem] uppercase tracking-[0.24em] text-muted">
          note not found.
        </p>
      </div>
    )
  }

  const save = () => {
    updateNote(note.id, { title, content, label })
  }

  const handleDelete = () => {
    deleteNote(note.id)
    navigate('/saved')
  }

  return (
    <div className="mx-auto max-w-[780px] px-6 py-10 md:px-10 md:py-14">
      {/* Top rail — back link + mode toggle + actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => { save(); navigate('/saved') }}
          className="mono inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.24em] text-muted hover:text-viral"
        >
          <ArrowLeft size={13} /> back to saved
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-ink/15 p-0.5">
            <button
              type="button"
              onClick={() => setMode('edit')}
              aria-pressed={mode === 'edit'}
              className={cn(
                'mono inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.24em] transition-colors',
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
                'mono inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.24em] transition-colors',
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
            onClick={() => updateNote(note.id, { pinned: !note.pinned })}
            aria-label={note.pinned ? 'unpin' : 'pin'}
            className={cn(
              'p-2 transition-colors',
              note.pinned ? 'text-viral' : 'text-muted hover:text-ink',
            )}
          >
            {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
          <button
            onClick={handleDelete}
            aria-label="delete"
            className="p-2 text-muted hover:text-danger transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Label row */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <span className="mono mr-1 text-[0.58rem] uppercase tracking-[0.28em] text-muted">label ·</span>
        {NOTE_LABELS.map(l => {
          const active = label === l.id
          return (
            <button
              key={l.id}
              onClick={() => { setLabel(l.id); updateNote(note.id, { label: l.id }) }}
              className={cn(
                'mono inline-flex items-center gap-1.5 px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.24em] transition-colors',
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

      {/* Title — serif display input */}
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        onBlur={save}
        placeholder="title (optional)"
        className="serif mt-10 w-full bg-transparent text-[clamp(2rem,calc(1rem+2vw),3rem)] leading-[1.05] tracking-[-0.02em] text-ink outline-none placeholder:text-ink/25"
      />

      <div className="mt-6 h-px bg-ink/10" />

      {/* Body — serif reading surface for read mode, Inter for edit ergonomics */}
      {mode === 'edit' ? (
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onBlur={save}
          placeholder="write your note…"
          rows={20}
          className="mt-8 w-full resize-none bg-transparent text-[1.02rem] leading-[1.7] text-ink outline-none placeholder:text-ink/30"
        />
      ) : (
        <div className="serif mt-8 min-h-[20rem] text-[1.2rem] leading-[1.6] text-ink">
          {content.trim() ? (
            <LinkifiedText text={content} />
          ) : (
            <p className="serif-italic text-muted">nothing written yet.</p>
          )}
        </div>
      )}

      <p className="mono mt-10 text-[0.58rem] uppercase tracking-[0.28em] text-muted/70">
        auto-saved on blur
      </p>
    </div>
  )
}
