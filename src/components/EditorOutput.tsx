import { useState } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { Plus, ChevronLeft, ChevronRight, ExternalLink, Trash2, X } from 'lucide-react'
import { useStore } from '../store'

export function EditorOutput() {
  const { user, editorOutputs, addEditorOutput, deleteEditorOutput, teamMembers, channels, activeChannel } = useStore()
  const [date, setDate] = useState(new Date())
  const [adding, setAdding] = useState(false)
  const [desc, setDesc] = useState('')
  const [link, setLink] = useState('')
  const [outputChannelId, setOutputChannelId] = useState<string>(activeChannel?.id ?? '')

  // Short channel tag — first token or first 4 chars.
  const channelTag = (id: string) => {
    const ch = channels.find(c => c.id === id)
    if (!ch) return '—'
    const name = ch.name.trim()
    const first = name.split(/[\s/_-]+/)[0]
    return (first || name).slice(0, 6).toUpperCase()
  }

  const dateStr = format(date, 'yyyy-MM-dd')
  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr

  const dayOutputs = editorOutputs.filter(o => o.date === dateStr)

  // Group by user for team visibility
  const byUser = dayOutputs.reduce<Record<string, typeof dayOutputs>>((acc, o) => {
    const key = o.user_id
    if (!acc[key]) acc[key] = []
    acc[key].push(o)
    return acc
  }, {})

  const handleAdd = async () => {
    if (!desc.trim()) return
    // `addEditorOutput` writes against active channel in the store. If the
    // user picked a different channel via the dropdown, switch active first
    // so the row lands on the right channel. (Active channel is global app
    // state — switching back is cheap and matches existing conventions.)
    await addEditorOutput({
      description: desc.trim(),
      live_link: link.trim() || null,
      date: dateStr,
      channel_id: outputChannelId || undefined,
    })
    setDesc('')
    setLink('')
    setAdding(false)
  }

  const handleDelete = async (id: string) => {
    await deleteEditorOutput(id)
  }

  const getUserName = (userId: string) => {
    if (userId === user?.id) return 'You'
    const member = teamMembers.find(m => m.user_id === userId)
    return member?.profile_name || 'Team Member'
  }

  const totalToday = dayOutputs.length
  const myOutputs = dayOutputs.filter(o => o.user_id === user?.id).length

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-1">Daily Log</p>
          <h2 className="text-2xl font-light text-ink">Output</h2>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blueprint text-white rounded-md text-sm hover:bg-blueprint-dark transition-colors"
        >
          <Plus size={16} /> Log Output
        </button>
      </div>

      {/* Date nav */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => setDate(subDays(date, 1))} className="p-1 rounded hover:bg-canvas text-ink-muted">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm font-medium text-ink">{isToday ? 'Today' : format(date, 'EEEE')}</p>
          <p className="text-[10px] text-ink-muted">{format(date, 'MMMM d, yyyy')}</p>
        </div>
        <button onClick={() => setDate(addDays(date, 1))} className="p-1 rounded hover:bg-canvas text-ink-muted">
          <ChevronRight size={18} />
        </button>
        <div className="flex-1" />
        <div className="text-right">
          <p className="text-2xl font-light text-ink tabular-nums">{totalToday}</p>
          <p className="text-[10px] text-ink-muted">{myOutputs} by you</p>
        </div>
      </div>

      {/* Quick add form */}
      {adding && (
        <div className="mb-6 bg-surface border border-line rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Log what you did today</p>
            <button onClick={() => setAdding(false)} className="text-ink-muted hover:text-ink"><X size={16} /></button>
          </div>
          <input
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="What did you deliver? e.g. Edited TMG reel — podcast clip"
            autoFocus
            className="input w-full mb-3"
            onKeyDown={e => { if (e.key === 'Enter' && desc.trim()) handleAdd() }}
          />
          <div className="flex gap-2">
            <input
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="Live link (optional) — https://..."
              className="input flex-1"
            />
            <select
              value={outputChannelId}
              onChange={e => setOutputChannelId(e.target.value)}
              className="input"
              title="Channel"
            >
              {channels.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button onClick={handleAdd} className="px-4 py-2 bg-blueprint text-white rounded-md text-sm">
              Add
            </button>
          </div>
        </div>
      )}

      {/* Output entries grouped by user */}
      {Object.keys(byUser).length === 0 && !adding && (
        <div className="text-center py-20">
          <p className="text-ink-muted text-sm">No output logged for this day yet.</p>
        </div>
      )}

      {Object.entries(byUser).map(([userId, outputs]) => (
        <div key={userId} className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-blueprint/15 flex items-center justify-center">
              <span className="text-[10px] font-medium text-blueprint">{getUserName(userId).charAt(0).toUpperCase()}</span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">{getUserName(userId)}</p>
            <span className="text-[10px] text-ink-muted">{outputs.length} items</span>
          </div>
          <div className="space-y-1.5">
            {outputs.map(output => (
              <div key={output.id} className="flex items-start gap-3 bg-surface border border-line rounded-md px-4 py-3 group relative">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink pr-14">{output.description}</p>
                  <p className="text-[10px] text-ink-muted mt-0.5">
                    {format(new Date(output.created_at), 'h:mm a')}
                  </p>
                </div>
                <span
                  className="absolute top-2 right-3 text-[9px] font-medium px-1.5 py-0.5 rounded bg-blueprint-light/60 text-blueprint tracking-wider"
                  title={channels.find(c => c.id === output.channel_id)?.name || ''}
                >
                  {channelTag(output.channel_id)}
                </span>
                <div className="flex items-center gap-2 shrink-0 mt-6">
                  {output.live_link && (
                    <a
                      href={output.live_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 text-[10px] text-blueprint hover:underline"
                    >
                      <ExternalLink size={12} /> Live
                    </a>
                  )}
                  {output.user_id === user?.id && (
                    <button
                      onClick={() => handleDelete(output.id)}
                      className="p-1 rounded text-ink-muted hover:text-danger hover:bg-danger-light opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
