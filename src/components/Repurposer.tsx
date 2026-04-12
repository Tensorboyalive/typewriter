import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Copy, Check, Sparkles, Loader2, RefreshCw } from 'lucide-react'

interface RepurposerProps {
  script: string
  title: string
  contentType: string
  isOpen: boolean
  onClose: () => void
}

const FORMAT_ICONS: Record<string, string> = {
  'Tweet Thread': '\ud83d\udc26',
  'Carousel Slides': '\ud83d\udcf1',
  'YouTube Short': '\ud83c\udfac',
  'Podcast Talking Points': '\ud83c\udf99\ufe0f',
  'Newsletter Blurb': '\ud83d\udce7',
}

export function Repurposer({ script, title, contentType, isOpen, onClose }: RepurposerProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const generate = useCallback(async () => {
    setContent('')
    setError('')
    setLoading(true)
    setDone(false)

    abortRef.current = new AbortController()

    try {
      const response = await fetch('/api/repurpose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, title, contentType }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(err.error || `HTTP ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done: readerDone, value } = await reader.read()
        if (readerDone) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            setDone(true)
            setLoading(false)
            return
          }
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.text) setContent(prev => prev + parsed.text)
          } catch {
            // partial chunk, skip
          }
        }
      }

      setDone(true)
      setLoading(false)
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }, [script, title, contentType])

  useEffect(() => {
    if (isOpen && !content && !loading && !done && !error) {
      generate()
    }
  }, [isOpen, content, loading, done, error, generate])

  useEffect(() => {
    if (scrollRef.current && loading) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [content, loading])

  const handleClose = () => {
    abortRef.current?.abort()
    setContent('')
    setLoading(false)
    setDone(false)
    setError('')
    onClose()
  }

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  // Parse sections from content
  const sections = content
    .split(/(?=^## )/m)
    .filter(s => s.trim())
    .map(section => {
      const lines = section.trim().split('\n')
      const headerLine = lines[0]
      const isHeader = headerLine.startsWith('## ')
      const name = isHeader ? headerLine.replace('## ', '') : ''
      const body = isHeader ? lines.slice(1).join('\n').trim() : section.trim()
      return { name, body, raw: section.trim() }
    })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-ink/20 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-xl bg-surface border-l border-line shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blueprint/10 flex items-center justify-center">
              <Sparkles size={14} className="text-blueprint" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-ink leading-none">
                Content Repurposer
              </h3>
              <p className="text-[10px] text-ink-muted mt-0.5">
                One script &rarr; five platforms
              </p>
            </div>
            {loading && (
              <Loader2 size={14} className="text-blueprint animate-spin ml-1" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {done && (
              <button
                onClick={() => copyText(content, 'all')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.15em] text-blueprint border border-blueprint/30 rounded-md hover:bg-blueprint-light transition-colors"
              >
                {copied === 'all' ? <Check size={11} /> : <Copy size={11} />}
                {copied === 'all' ? 'Copied' : 'Copy all'}
              </button>
            )}
            {(done || error) && (
              <button
                onClick={generate}
                className="p-1.5 rounded-md hover:bg-canvas text-ink-muted hover:text-blueprint transition-colors"
                title="Regenerate"
              >
                <RefreshCw size={14} />
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-1.5 rounded-md hover:bg-canvas text-ink-muted transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
                <X size={18} className="text-danger" />
              </div>
              <p className="text-sm text-ink-secondary">{error}</p>
              <button
                onClick={generate}
                className="text-blueprint text-sm hover:underline"
              >
                Try again
              </button>
            </div>
          ) : content ? (
            <div className="space-y-6">
              {sections.map((section, i) =>
                section.name ? (
                  <div key={i} className="group">
                    <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-line-light">
                      <h4 className="text-[11px] uppercase tracking-[0.15em] font-medium text-ink flex items-center gap-2">
                        <span>{FORMAT_ICONS[section.name] || '\u2728'}</span>
                        {section.name}
                      </h4>
                      {done && (
                        <button
                          onClick={() => copyText(section.body, section.name)}
                          className="opacity-0 group-hover:opacity-100 text-ink-muted hover:text-blueprint transition-all"
                          title="Copy section"
                        >
                          {copied === section.name ? (
                            <Check size={13} className="text-success" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="text-[13px] text-ink-secondary leading-relaxed whitespace-pre-wrap pl-1">
                      {section.body}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="text-[13px] text-ink-secondary leading-relaxed whitespace-pre-wrap">
                    {section.body}
                  </div>
                ),
              )}
              {loading && (
                <div className="flex items-center gap-2 py-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blueprint animate-pulse" />
                  <span className="text-[10px] text-ink-muted uppercase tracking-widest">
                    Generating...
                  </span>
                </div>
              )}
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-line" />
                <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-blueprint border-t-transparent animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted mb-1">
                  Repurposing your script
                </p>
                <p className="text-[10px] text-ink-muted/60">
                  Claude is transforming it into 5 formats...
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-line bg-canvas/50">
          <p className="text-[10px] text-ink-muted text-center tracking-[0.1em]">
            Powered by Claude &middot; AI-generated content &mdash; review before posting
          </p>
        </div>
      </div>
    </div>
  )
}
