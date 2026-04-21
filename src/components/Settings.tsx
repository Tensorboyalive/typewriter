import { useState, useEffect } from 'react'
import { UserCog, Users, Hash, Trash2, Plus, Save, ListChecks, Loader2 } from 'lucide-react'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { CHECKLIST_CATEGORIES, type ChecklistCategory } from '../types'
import type { UserRole } from '../types'
import { Eyebrow } from './editorial/Eyebrow'
import { cn } from '../lib/cn'

const ROLES: { id: UserRole; label: string; description: string }[] = [
  { id: 'admin', label: 'Admin', description: 'Full access. Manages team, channels, finances.' },
  { id: 'pa', label: 'PA', description: 'Pipeline, content bank, checklist, saved notes.' },
  { id: 'editor', label: 'Editor', description: 'Pipeline access only. Assigned tasks.' },
]

interface TeamMemberRow {
  id: string
  user_id: string
  channel_id: string
  role: UserRole
  profile: { display_name: string; avatar_url: string | null } | null
  email: string | null
}

export function Settings() {
  const { user, userRole, profile, activeChannel, updateChannel, channels, inviteTeamMember, checklistTemplates, addChecklistTemplate, updateChecklistTemplate, deleteChecklistTemplate } = useStore()
  const [channelName, setChannelName] = useState(activeChannel?.name ?? '')
  const [channelHandle, setChannelHandle] = useState(activeChannel?.handle ?? '')
  const [channelNiche, setChannelNiche] = useState(activeChannel?.niche ?? '')
  const [profileName, setProfileName] = useState(profile?.display_name ?? '')
  const [savedProfile, setSavedProfile] = useState(false)
  const [savedChannel, setSavedChannel] = useState(false)

  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('editor')
  const [inviteAllChannels, setInviteAllChannels] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [teamLoading, setTeamLoading] = useState(true)

  const isAdmin = userRole === 'admin'

  useEffect(() => {
    setChannelName(activeChannel?.name ?? '')
    setChannelHandle(activeChannel?.handle ?? '')
    setChannelNiche(activeChannel?.niche ?? '')
  }, [activeChannel])

  useEffect(() => {
    setProfileName(profile?.display_name ?? '')
  }, [profile])

  useEffect(() => {
    if (!activeChannel) return
    ;(async () => {
      setTeamLoading(true)
      const { data } = await supabase
        .from('team_members')
        .select('id, user_id, channel_id, role')
        .eq('channel_id', activeChannel.id)

      if (data) {
        const rows: TeamMemberRow[] = await Promise.all(
          data.map(async (tm: { id: string; user_id: string; channel_id: string; role: string }) => {
            const { data: prof } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('id', tm.user_id)
              .single()
            return { ...tm, profile: prof, email: null } as TeamMemberRow
          })
        )
        setTeamMembers(rows)
      }
      setTeamLoading(false)
    })()
  }, [activeChannel])

  const handleSaveProfile = async () => {
    if (!user) return
    await supabase.from('profiles').update({ display_name: profileName, updated_at: new Date().toISOString() }).eq('id', user.id)
    setSavedProfile(true)
    setTimeout(() => setSavedProfile(false), 1500)
  }

  const handleSaveChannel = async () => {
    if (!activeChannel) return
    await updateChannel(activeChannel.id, { name: channelName, handle: channelHandle, niche: channelNiche })
    setSavedChannel(true)
    setTimeout(() => setSavedChannel(false), 1500)
  }

  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !activeChannel) return
    setInviting(true)
    setInviteError(null)
    setInviteSuccess(false)

    const { error } = await inviteTeamMember(inviteEmail.trim(), inviteRole, inviteAllChannels)
    if (error) {
      setInviteError(error)
    } else {
      setInviteSuccess(true)
      setInviteEmail('')
      const { data } = await supabase
        .from('team_members')
        .select('id, user_id, channel_id, role')
        .eq('channel_id', activeChannel.id)
      if (data) {
        const rows: TeamMemberRow[] = await Promise.all(
          data.map(async (tm: { id: string; user_id: string; channel_id: string; role: string }) => {
            const { data: prof } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('id', tm.user_id)
              .single()
            return { ...tm, profile: prof, email: null } as TeamMemberRow
          })
        )
        setTeamMembers(rows)
      }
      setTimeout(() => setInviteSuccess(false), 3000)
    }
    setInviting(false)
  }

  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null)

  const handleRemoveMember = async (memberId: string) => {
    setDeletingMemberId(memberId)
    try {
      await supabase.from('team_members').delete().eq('id', memberId)
      setTeamMembers(prev => prev.filter(m => m.id !== memberId))
      setDeletingMemberId(null)
    } catch { setDeletingMemberId(null) }
  }

  const handleChangeRole = async (memberId: string, newRole: UserRole) => {
    await supabase.from('team_members').update({ role: newRole }).eq('id', memberId)
    setTeamMembers(prev => prev.map(m => (m.id === memberId ? { ...m, role: newRole } : m)))
  }

  const currentRole = ROLES.find(r => r.id === userRole)

  const roleBadge = (role: UserRole) => {
    const color =
      role === 'admin' ? 'text-viral bg-viral/15' :
      role === 'pa' ? 'text-warning bg-warning/15' :
      'text-success bg-success/15'
    return `mono inline-flex items-center px-2 py-0.5 text-[0.56rem] uppercase tracking-[0.24em] ${color}`
  }

  return (
    <div className="mx-auto w-full max-w-[900px] px-6 py-10 md:px-10 md:py-16 space-y-14">
      {/* Header */}
      <div>
        <Eyebrow>settings · account & team</Eyebrow>
        <h1
          className="serif mt-6 leading-[0.95] tracking-[-0.02em] text-ink"
          style={{ fontSize: 'clamp(2.25rem, calc(1rem + 2.5vw), 3.25rem)' }}
        >
          the <span className="serif-italic">controls.</span>
        </h1>
      </div>

      {/* Profile */}
      <section>
        <div className="mb-5 flex items-center gap-3">
          <UserCog size={14} className="text-muted" />
          <Eyebrow rule={false}>your profile</Eyebrow>
        </div>
        <div className="rule-top rule-bottom border-ink/10 bg-paper/60 px-6 py-6 space-y-5">
          <FieldRow label="display name">
            <input
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              placeholder="your name…"
              className="input-underline"
            />
          </FieldRow>
          <FieldRow label="email">
            <p className="text-[0.95rem] text-ink">{user?.email ?? '·'}</p>
          </FieldRow>
          <FieldRow label="your role">
            <div className="flex flex-wrap items-center gap-3">
              <span className={roleBadge(userRole)}>{currentRole?.label}</span>
              <span className="text-[0.82rem] text-muted">{currentRole?.description}</span>
            </div>
          </FieldRow>
          <button
            onClick={handleSaveProfile}
            className="mono inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.24em] text-cream transition hover:bg-viral hover:text-ink"
          >
            <Save size={12} /> {savedProfile ? 'saved.' : 'save profile'}
          </button>
        </div>
      </section>

      {/* Channel settings */}
      <section>
        <div className="mb-5 flex items-center gap-3">
          <Hash size={14} className="text-muted" />
          <Eyebrow rule={false}>channel settings</Eyebrow>
        </div>
        <div className="rule-top rule-bottom border-ink/10 bg-paper/60 px-6 py-6 space-y-5">
          <FieldRow label="channel name">
            <input
              value={channelName}
              onChange={e => setChannelName(e.target.value)}
              disabled={!isAdmin}
              className="input-underline disabled:opacity-50"
            />
          </FieldRow>
          <FieldRow label="handle">
            <input
              value={channelHandle}
              onChange={e => setChannelHandle(e.target.value)}
              disabled={!isAdmin}
              placeholder="@handle"
              className="input-underline disabled:opacity-50"
            />
          </FieldRow>
          <FieldRow label="niche">
            <input
              value={channelNiche}
              onChange={e => setChannelNiche(e.target.value)}
              disabled={!isAdmin}
              placeholder="e.g. tech, finance, lifestyle"
              className="input-underline disabled:opacity-50"
            />
          </FieldRow>
          {isAdmin ? (
            <button
              onClick={handleSaveChannel}
              className="mono inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.24em] text-cream transition hover:bg-viral hover:text-ink"
            >
              <Save size={12} /> {savedChannel ? 'saved.' : 'save channel'}
            </button>
          ) : (
            <p className="mono text-[0.6rem] uppercase tracking-[0.24em] text-muted">
              only admins can edit channel settings.
            </p>
          )}
        </div>
      </section>

      {/* Team members */}
      <section>
        <div className="mb-5 flex items-center gap-3">
          <Users size={14} className="text-muted" />
          <Eyebrow rule={false}>team members</Eyebrow>
        </div>

        {/* Role legend */}
        <div className="mb-5 rule-top rule-bottom border-ink/10 px-5 py-4">
          <Eyebrow rule={false}>role permissions</Eyebrow>
          <div className="mt-3 space-y-2">
            {ROLES.map(r => (
              <div key={r.id} className="flex flex-wrap items-center gap-3">
                <span className={roleBadge(r.id)}>{r.label}</span>
                <span className="text-[0.8rem] text-muted">{r.description}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rule-top rule-bottom border-ink/10 bg-paper/60 px-6 py-6">
          {teamLoading ? (
            <p className="mono py-4 text-center text-[0.62rem] uppercase tracking-[0.24em] text-muted">
              loading team…
            </p>
          ) : teamMembers.length === 0 ? (
            <p className="mono py-4 text-center text-[0.62rem] uppercase tracking-[0.24em] text-muted">
              no team members yet. you&apos;re the only one here.
            </p>
          ) : (
            <ul className="mb-5 divide-y divide-ink/10 rule-top rule-bottom">
              {teamMembers.map(member => (
                <li key={member.id} className="flex items-center gap-4 py-3 -mx-2 px-2">
                  <div className="min-w-0 flex-1">
                    <p className="serif text-[1rem] leading-tight text-ink">
                      {member.profile?.display_name || 'unnamed'}
                      {member.user_id === user?.id && (
                        <span className="mono ml-2 text-[0.58rem] uppercase tracking-[0.26em] text-muted">(you)</span>
                      )}
                    </p>
                  </div>
                  {isAdmin && member.user_id !== user?.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={e => handleChangeRole(member.id, e.target.value as UserRole)}
                        className="mono border-b border-ink/20 bg-transparent py-1 text-[0.7rem] uppercase tracking-[0.22em] text-ink outline-none focus:border-viral"
                      >
                        {ROLES.map(r => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={deletingMemberId === member.id}
                        aria-label="remove member"
                        className="p-1 text-muted hover:text-danger disabled:opacity-100"
                      >
                        {deletingMemberId === member.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  ) : (
                    <span className={roleBadge(member.role)}>{member.role}</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {isAdmin && (
            <div className="rule-top pt-5">
              <Eyebrow rule={false}>invite member</Eyebrow>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <input
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="email address…"
                  className="input-underline min-w-[220px] flex-1"
                />
                <div className="flex gap-1">
                  {ROLES.filter(r => r.id !== 'admin').map(r => {
                    const active = inviteRole === r.id
                    return (
                      <button
                        key={r.id}
                        onClick={() => setInviteRole(r.id)}
                        className={cn(
                          'mono px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.24em] transition-colors',
                          active ? 'bg-viral text-ink' : 'text-muted hover:text-ink',
                        )}
                      >
                        {r.label.toLowerCase()}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim() || inviting}
                  className="mono inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.24em] text-cream transition hover:bg-viral hover:text-ink disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Plus size={12} /> {inviting ? 'inviting…' : 'invite'}
                </button>
              </div>
              {channels.length > 1 && (
                <label className="mt-4 flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={inviteAllChannels}
                    onChange={e => setInviteAllChannels(e.target.checked)}
                    className="h-3.5 w-3.5 accent-viral"
                  />
                  <span className="mono text-[0.6rem] uppercase tracking-[0.26em] text-muted">
                    add to all channels ({channels.filter(c => c.user_id === user?.id).length})
                  </span>
                </label>
              )}
              {inviteError && (
                <p role="alert" className="mono mt-3 text-[0.7rem] text-danger">{inviteError}</p>
              )}
              {inviteSuccess && (
                <p className="mono mt-3 text-[0.62rem] uppercase tracking-[0.24em] text-success">
                  team member added successfully.
                </p>
              )}
              <p className="mono mt-3 text-[0.58rem] uppercase tracking-[0.26em] text-muted/80">
                the invited user must already have a typewriter account.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Daily Checklist Templates */}
      {(userRole === 'admin' || userRole === 'pa') && (
        <TemplateManager
          templates={checklistTemplates}
          onAdd={addChecklistTemplate}
          onUpdate={updateChecklistTemplate}
          onDelete={deleteChecklistTemplate}
        />
      )}

      {/* Channels overview */}
      <section>
        <div className="mb-5 flex items-center gap-3">
          <Hash size={14} className="text-muted" />
          <Eyebrow rule={false}>your channels</Eyebrow>
        </div>
        <ul className="divide-y divide-ink/10 rule-top rule-bottom">
          {channels.map(ch => {
            const active = ch.id === activeChannel?.id
            return (
              <li key={ch.id} className={cn(
                'flex items-center gap-4 py-3 -mx-2 px-2',
                active && 'bg-paper/60',
              )}>
                <p className="serif flex-1 truncate text-[1.02rem] text-ink">{ch.name}</p>
                {ch.handle && (
                  <span className="mono text-[0.6rem] uppercase tracking-[0.24em] text-muted">@{ch.handle}</span>
                )}
                {active && (
                  <span className="mono bg-viral px-2 py-0.5 text-[0.56rem] uppercase tracking-[0.26em] text-ink">
                    active
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mono text-[0.58rem] uppercase tracking-[0.28em] text-muted">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

// ─── Template Manager ─────────────────────────────────────────
function TemplateManager({
  templates,
  onAdd,
  onUpdate,
  onDelete,
}: {
  templates: { id: string; title: string; category: string; is_active: boolean; sort_order: number }[]
  onAdd: (t: { title: string; category: string; sort_order?: number }) => Promise<any>
  onUpdate: (id: string, updates: any) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ChecklistCategory>('content')

  const handleAdd = async () => {
    if (!title.trim()) return
    await onAdd({ title: title.trim(), category, sort_order: templates.length })
    setTitle('')
    setAdding(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    await onUpdate(id, { is_active: !current })
  }

  return (
    <section>
      <div className="mb-5 flex items-center gap-3">
        <ListChecks size={14} className="text-muted" />
        <Eyebrow rule={false}>daily checklist template</Eyebrow>
      </div>
      <p className="mono mb-4 text-[0.6rem] uppercase tracking-[0.26em] text-muted">
        items added when you tap apply template. toggle on/off without deleting.
      </p>
      <div className="rule-top rule-bottom border-ink/10 bg-paper/60 px-6 py-6">
        {templates.length === 0 && !adding && (
          <p className="mono py-4 text-center text-[0.62rem] uppercase tracking-[0.24em] text-muted">
            no template items yet.
          </p>
        )}
        <ul className="divide-y divide-ink/10 rule-top rule-bottom">
          {templates.map(tmpl => {
            const cat = CHECKLIST_CATEGORIES.find(c => c.id === tmpl.category)
            return (
              <li key={tmpl.id} className="group flex items-center gap-4 py-3 -mx-2 px-2">
                <button
                  onClick={() => toggleActive(tmpl.id, tmpl.is_active)}
                  aria-pressed={tmpl.is_active}
                  className={cn(
                    'h-3.5 w-3.5 rounded-sm border-2 transition-colors',
                    tmpl.is_active ? 'bg-success border-success' : 'border-ink/30',
                  )}
                />
                <span className={cn(
                  'serif flex-1 text-[0.98rem] leading-tight',
                  tmpl.is_active ? 'text-ink' : 'text-muted line-through',
                )}>
                  {tmpl.title}
                </span>
                {cat && (
                  <span
                    className="mono inline-flex items-center gap-1.5 px-2 py-0.5 text-[0.56rem] uppercase tracking-[0.24em]"
                    style={{ color: cat.color }}
                  >
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: cat.color }} />
                    {cat.label.toLowerCase()}
                  </span>
                )}
                <button
                  onClick={() => onDelete(tmpl.id)}
                  aria-label="delete template item"
                  className="p-1 text-muted opacity-0 hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            )
          })}
        </ul>

        {adding ? (
          <div className="mt-5 rule-top pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono mr-2 text-[0.58rem] uppercase tracking-[0.28em] text-muted">category ·</span>
              {CHECKLIST_CATEGORIES.map(c => {
                const active = category === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={cn(
                      'mono inline-flex items-center gap-1.5 px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.24em] transition-colors',
                      active ? 'text-ink' : 'text-muted hover:text-ink',
                    )}
                    style={active ? { boxShadow: `inset 0 -2px 0 ${c.color}` } : undefined}
                  >
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
                    {c.label.toLowerCase()}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex items-end gap-3">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="template item title…"
                autoFocus
                className="input-underline flex-1"
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
              />
              <button
                onClick={handleAdd}
                className="mono inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.24em] text-cream transition hover:bg-viral hover:text-ink"
              >
                add
              </button>
              <button
                onClick={() => setAdding(false)}
                className="mono text-[0.68rem] uppercase tracking-[0.24em] text-muted hover:text-ink"
              >
                cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mono mt-5 inline-flex items-center gap-2 text-[0.66rem] uppercase tracking-[0.24em] text-muted hover:text-viral"
          >
            <Plus size={12} /> add template item
          </button>
        )}
      </div>
    </section>
  )
}
