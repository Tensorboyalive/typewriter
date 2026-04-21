import { useState } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { Plus, ChevronLeft, ChevronRight, ExternalLink, Trash2, X, Loader2 } from 'lucide-react'
import { useStore } from '../store'
import { LinkifiedText } from './LinkifiedText'
import { Eyebrow } from './editorial/Eyebrow'

const safeHref = (url?: string | null): string | undefined => {
  if (!url) return undefined
  try {
    const { protocol } = new URL(url)
    return protocol === 'https:' || protocol === 'http:' ? url : undefined
  } catch { return undefined }
}

export function EditorOutput() {
  const { user, editorOutputs, addEditorOutput, deleteEditorOutput, teamMembers, channels, activeChannel } = useStore()
  const [date, setDate] = useState(new Date())
  const [adding, setAdding] = useState(false)
  const [desc, setDesc] = useState('')
  const [link, setLink] = useState('')
  const [outputChannelId, setOutputChannelId] = useState<string>(activeChannel?.id ?? '')
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
    setDeletingId(id)
    try {
      await deleteEditorOutput(id)
      setDeletingId(null)
    } catch {
      setDeletingId(null)
    }
  }

  const getUserName = (userId: string) => {
    if (userId === user?.id) return 'you'
    const member = teamMembers.find(m => m.user_id === userId)
    return (member?.profile_name || 'team member').toLowerCase()
  }

  const totalToday = dayOutputs.length
  const myOutputs = dayOutputs.filter(o => o.user_id === user?.id).length

  return (
    <div className="mx-auto w-full max-w-[900px] px-6 py-10 md:px-10 md:py-16">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>daily log · output</Eyebrow>
          <h1
            className="serif mt-6 leading-[0.95] tracking-[-0.02em] text-ink"
            style={{ fontSize: 'clamp(2.25rem, calc(1rem + 2.5vw), 3.5rem)' }}
          >
            what <span className="serif-italic">shipped</span>, today.
          </h1>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="mono inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.24em] text-cream transition hover:bg-viral hover:text-ink"
        >
          <Plus size={12} strokeWidth={2} /> log output
        </button>
      </div>

      {/* Date nav */}
      <div className="mt-10 rule-top rule-bottom flex flex-wrap items-center gap-x-6 gap-y-4 border-ink/10 py-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate(subDays(date, 1))}
            aria-label="previous day"
            className="p-1 text-muted hover:text-viral"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <p className="serif text-[1.15rem] leading-tight text-ink">
              {isToday ? 'today' : format(date, 'EEEE').toLowerCase()}
            </p>
            <p className="mono text-[0.58rem] uppercase tracking-[0.28em] text-muted">
              {format(date, 'MMMM d, yyyy').toLowerCase()}
            </p>
          </div>
          <button
            onClick={() => setDate(addDays(date, 1))}
            aria-label="next day"
            className="p-1 text-muted hover:text-viral"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex-1" />
        <div className="text-right">
          <p className="serif text-[2rem] leading-none text-ink tnum">{totalToday}</p>
          <p className="mono mt-1 text-[0.58rem] uppercase tracking-[0.28em] text-muted tnum">
            {myOutputs} by you
          </p>
        </div>
      </div>

      {/* Add drawer */}
      {adding && (
        <div className="mt-8 rule-bottom border-ink/10 bg-paper/60 p-6">
          <div className="flex items-center justify-between">
            <Eyebrow>log what you did today</Eyebrow>
            <button
              onClick={() => setAdding(false)}
              aria-label="close"
              className="text-muted hover:text-ink"
            >
              <X size={15} />
            </button>
          </div>
          <input
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="what did you deliver? e.g. edited tmg reel — podcast clip"
            autoFocus
            className="input-underline mt-4"
            onKeyDown={e => { if (e.key === 'Enter' && desc.trim()) handleAdd() }}
          />
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <input
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="live link (optional) — https://…"
              className="input-underline flex-1 min-w-[220px]"
            />
            <select
              value={outputChannelId}
              onChange={e => setOutputChannelId(e.target.value)}
              title="Channel"
              className="mono border-b border-ink/20 bg-transparent py-2 text-[0.85rem] text-ink outline-none focus:border-viral"
            >
              {channels.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              className="mono inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.24em] text-cream transition hover:bg-viral hover:text-ink"
            >
              log it
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {Object.keys(byUser).length === 0 && !adding && (
        <p className="mono mt-10 py-16 text-center text-[0.7rem] uppercase tracking-[0.26em] text-muted">
          no output logged for this day yet.
        </p>
      )}

      {/* Grouped entries */}
      <div className="mt-10 space-y-10">
        {Object.entries(byUser).map(([userId, outputs]) => (
          <section key={userId}>
            <div className="mb-3 flex items-center gap-3">
              <span className="mono flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-viral/15 text-[0.7rem] uppercase text-viral">
                {getUserName(userId).charAt(0).toUpperCase()}
              </span>
              <Eyebrow rule={false}>{getUserName(userId)}</Eyebrow>
              <span className="mono text-[0.6rem] uppercase tracking-[0.26em] text-muted tnum">
                {outputs.length} items
              </span>
            </div>
            <ul className="divide-y divide-ink/10 rule-top rule-bottom">
              {outputs.map(output => (
                <li key={output.id} className="group relative flex items-start gap-4 py-4 -mx-2 px-2 transition-colors hover:bg-paper/60">
                  <div className="min-w-0 flex-1 pr-20">
                    <p className="serif text-[1.02rem] leading-[1.45] text-ink">
                      <LinkifiedText text={output.description} preserveWhitespace={false} />
                    </p>
                    <p className="mono mt-2 text-[0.58rem] uppercase tracking-[0.26em] text-muted tnum">
                      {format(new Date(output.created_at), 'h:mm a')}
                    </p>
                  </div>
                  <span
                    className="mono absolute right-2 top-4 bg-viral/15 px-1.5 py-0.5 text-[0.56rem] uppercase tracking-[0.22em] text-viral"
                    title={channels.find(c => c.id === output.channel_id)?.name || ''}
                  >
                    {channelTag(output.channel_id)}
                  </span>
                  <div className="mt-10 flex shrink-0 items-center gap-3">
                    {output.live_link && (() => {
                      const href = safeHref(output.live_link)
                      return href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="mono inline-flex items-center gap-1 text-[0.58rem] uppercase tracking-[0.26em] text-viral hover:underline"
                        >
                          <ExternalLink size={11} /> live
                        </a>
                      ) : (
                        <span
                          className="mono inline-flex items-center gap-1 text-[0.58rem] uppercase tracking-[0.26em] text-muted"
                          title="Invalid or unsafe link"
                        >
                          <ExternalLink size={11} /> live
                        </span>
                      )
                    })()}
                    {output.user_id === user?.id && (
                      <button
                        onClick={() => handleDelete(output.id)}
                        disabled={deletingId === output.id}
                        aria-label="delete output"
                        className="p-1 text-muted opacity-0 transition-all hover:text-danger group-hover:opacity-100 disabled:opacity-100"
                      >
                        {deletingId === output.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
