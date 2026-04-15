import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Pin, PinOff, FileDown, Edit3, Eye } from 'lucide-react'
import { useStore } from '../store'
import { NOTE_LABELS, type NoteLabel } from '../types'
import { LinkifiedText } from './LinkifiedText'
import { exportNoteToPdf } from '../lib/exportPdf'

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
      <div className="p-8">
        <button onClick={() => navigate('/saved')} className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-4">
          <ArrowLeft size={16} /> Back to Saved
        </button>
        <p className="text-ink-muted">Note not found.</p>
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
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => { save(); navigate('/saved') }} className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft size={16} /> Back to Saved
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-line bg-canvas p-0.5">
            <button
              type="button"
              onClick={() => setMode('edit')}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors ${
                mode === 'edit'
                  ? 'bg-blueprint text-white'
                  : 'text-ink-muted hover:bg-canvas'
              }`}
              aria-pressed={mode === 'edit'}
            >
              <Edit3 size={12} /> Edit
            </button>
            <button
              type="button"
              onClick={() => setMode('read')}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors ${
                mode === 'read'
                  ? 'bg-blueprint text-white'
                  : 'text-ink-muted hover:bg-canvas'
              }`}
              aria-pressed={mode === 'read'}
            >
              <Eye size={12} /> Read
            </button>
          </div>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={exporting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-line text-[12px] text-ink-secondary hover:text-blueprint hover:border-blueprint/40 transition-colors disabled:opacity-50"
          >
            <FileDown size={14} /> {exporting ? 'Exporting…' : 'Download PDF'}
          </button>
          <button onClick={() => updateNote(note.id, { pinned: !note.pinned })}
            className={`p-2 rounded-md transition-colors ${note.pinned ? 'text-blueprint bg-blueprint-light' : 'text-ink-muted hover:bg-canvas'}`}>
            {note.pinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
          <button onClick={handleDelete} className="p-2 rounded-md text-ink-muted hover:text-danger hover:bg-danger-light transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {NOTE_LABELS.map(l => (
          <button key={l.id} onClick={() => { setLabel(l.id); updateNote(note.id, { label: l.id }) }}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${label === l.id ? 'border-transparent text-white' : 'border-line text-ink-secondary'}`}
            style={label === l.id ? { backgroundColor: l.color } : {}}>
            {l.label}
          </button>
        ))}
      </div>

      <input value={title} onChange={e => setTitle(e.target.value)} onBlur={save}
        placeholder="Title (optional)" className="w-full text-2xl font-light text-ink bg-transparent outline-none mb-4 placeholder:text-ink-muted/50" />

      {mode === 'edit' ? (
        <textarea value={content} onChange={e => setContent(e.target.value)} onBlur={save}
          placeholder="Write your note..." rows={20}
          className="w-full text-sm text-ink bg-transparent outline-none resize-none leading-relaxed placeholder:text-ink-muted/50" />
      ) : (
        <div className="w-full text-sm text-ink leading-relaxed min-h-[20rem]">
          {content.trim() ? (
            <LinkifiedText text={content} />
          ) : (
            <p className="text-ink-muted italic">Nothing written yet.</p>
          )}
        </div>
      )}

      <p className="text-[10px] text-ink-muted mt-4">Auto-saved on blur</p>
    </div>
  )
}
