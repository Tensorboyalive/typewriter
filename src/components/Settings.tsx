import { useState, useEffect } from 'react'
import { UserCog, Users, Hash, Trash2, Plus, Save, ListChecks } from 'lucide-react'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { CHECKLIST_CATEGORIES, type ChecklistCategory } from '../types'
import type { UserRole } from '../types'

const ROLES: { id: UserRole; label: string; description: string }[] = [
  { id: 'admin', label: 'Admin', description: 'Full access — manages team, channels, finances' },
  { id: 'pa', label: 'PA', description: 'Pipeline, content bank, checklist, saved notes' },
  { id: 'editor', label: 'Editor', description: 'Pipeline access only — assigned tasks' },
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

  // Fetch team members
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
            return {
              ...tm,
              profile: prof,
              email: null,
            } as TeamMemberRow
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
      // Refresh the local team list
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

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this team member?')) return
    await supabase.from('team_members').delete().eq('id', memberId)
    setTeamMembers(prev => prev.filter(m => m.id !== memberId))
  }

  const handleChangeRole = async (memberId: string, newRole: UserRole) => {
    await supabase.from('team_members').update({ role: newRole }).eq('id', memberId)
    setTeamMembers(prev => prev.map(m => (m.id === memberId ? { ...m, role: newRole } : m)))
  }

  const currentRole = ROLES.find(r => r.id === userRole)

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-1">Settings</p>
        <h2 className="text-2xl font-light text-ink">Account & Team</h2>
      </div>

      {/* Profile */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <UserCog size={16} className="text-ink-muted" />
          <h3 className="text-sm font-medium text-ink uppercase tracking-[0.1em]">Your Profile</h3>
        </div>
        <div className="bg-surface border border-line rounded-lg p-4 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Display name</p>
            <input
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              placeholder="Your name..."
              className="input w-full"
            />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Email</p>
            <p className="text-sm text-ink-secondary">{user?.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Your role</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-ink capitalize">{currentRole?.label}</span>
              <span className="text-[11px] text-ink-muted">— {currentRole?.description}</span>
            </div>
          </div>
          <button
            onClick={handleSaveProfile}
            className="flex items-center gap-2 px-4 py-2 bg-blueprint text-white rounded-md text-sm hover:bg-blueprint-dark transition-colors"
          >
            <Save size={14} />
            {savedProfile ? 'Saved!' : 'Save profile'}
          </button>
        </div>
      </section>

      {/* Channel settings (admin only for editing) */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Hash size={16} className="text-ink-muted" />
          <h3 className="text-sm font-medium text-ink uppercase tracking-[0.1em]">Channel Settings</h3>
        </div>
        <div className="bg-surface border border-line rounded-lg p-4 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Channel name</p>
            <input
              value={channelName}
              onChange={e => setChannelName(e.target.value)}
              disabled={!isAdmin}
              className="input w-full disabled:opacity-50"
            />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Handle</p>
            <input
              value={channelHandle}
              onChange={e => setChannelHandle(e.target.value)}
              disabled={!isAdmin}
              placeholder="@handle"
              className="input w-full disabled:opacity-50"
            />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">Niche</p>
            <input
              value={channelNiche}
              onChange={e => setChannelNiche(e.target.value)}
              disabled={!isAdmin}
              placeholder="e.g. Tech, Finance, Lifestyle"
              className="input w-full disabled:opacity-50"
            />
          </div>
          {isAdmin && (
            <button
              onClick={handleSaveChannel}
              className="flex items-center gap-2 px-4 py-2 bg-blueprint text-white rounded-md text-sm hover:bg-blueprint-dark transition-colors"
            >
              <Save size={14} />
              {savedChannel ? 'Saved!' : 'Save channel'}
            </button>
          )}
          {!isAdmin && (
            <p className="text-[10px] text-ink-muted">Only admins can edit channel settings.</p>
          )}
        </div>
      </section>

      {/* Team Members */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-ink-muted" />
          <h3 className="text-sm font-medium text-ink uppercase tracking-[0.1em]">Team Members</h3>
        </div>

        {/* Role legend */}
        <div className="bg-canvas border border-line rounded-lg p-3 mb-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-2">Role permissions</p>
          <div className="space-y-1.5">
            {ROLES.map(r => (
              <div key={r.id} className="flex items-center gap-2">
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  r.id === 'admin' ? 'bg-blueprint/15 text-blueprint' :
                  r.id === 'pa' ? 'bg-warning/15 text-warning' :
                  'bg-success/15 text-success'
                }`}>
                  {r.label}
                </span>
                <span className="text-[11px] text-ink-muted">{r.description}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-line rounded-lg p-4">
          {teamLoading ? (
            <p className="text-sm text-ink-muted py-4 text-center">Loading team...</p>
          ) : teamMembers.length === 0 ? (
            <p className="text-sm text-ink-muted py-4 text-center">No team members yet. You're the only one here.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {teamMembers.map(member => (
                <div key={member.id} className="flex items-center gap-3 px-3 py-2.5 bg-canvas border border-line rounded-md">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink font-medium">
                      {member.profile?.display_name || 'Unnamed'}
                      {member.user_id === user?.id && (
                        <span className="text-[10px] text-ink-muted ml-2">(you)</span>
                      )}
                    </p>
                  </div>
                  {isAdmin && member.user_id !== user?.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={e => handleChangeRole(member.id, e.target.value as UserRole)}
                        className="text-[11px] bg-transparent border border-line rounded px-2 py-1 text-ink"
                      >
                        {ROLES.map(r => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-1 rounded text-ink-muted hover:text-danger hover:bg-danger-light transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      member.role === 'admin' ? 'bg-blueprint/15 text-blueprint' :
                      member.role === 'pa' ? 'bg-warning/15 text-warning' :
                      'bg-success/15 text-success'
                    }`}>
                      {member.role}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {isAdmin && (
            <div className="pt-3 border-t border-line">
              <p className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-2">Invite member</p>
              <div className="flex gap-2">
                <input
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="Email address..."
                  className="input flex-1"
                />
                <div className="flex gap-1">
                  {ROLES.filter(r => r.id !== 'admin').map(r => (
                    <button
                      key={r.id}
                      onClick={() => setInviteRole(r.id)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                        inviteRole === r.id
                          ? 'border-blueprint bg-blueprint/10 text-blueprint'
                          : 'border-line text-ink-secondary'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim() || inviting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blueprint text-white rounded-md text-sm disabled:opacity-50"
                >
                  <Plus size={14} /> {inviting ? 'Inviting...' : 'Invite'}
                </button>
              </div>
              {channels.length > 1 && (
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inviteAllChannels}
                    onChange={e => setInviteAllChannels(e.target.checked)}
                    className="rounded border-line text-blueprint"
                  />
                  <span className="text-[11px] text-ink-secondary">
                    Add to all channels ({channels.filter(c => c.user_id === user?.id).length})
                  </span>
                </label>
              )}
              {inviteError && (
                <p className="text-[11px] text-danger mt-2">{inviteError}</p>
              )}
              {inviteSuccess && (
                <p className="text-[11px] text-success mt-2">Team member added successfully!</p>
              )}
              <p className="text-[10px] text-ink-muted mt-2">
                The invited user must already have a Typewriter account.
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

      {/* Active channels overview */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Hash size={16} className="text-ink-muted" />
          <h3 className="text-sm font-medium text-ink uppercase tracking-[0.1em]">Your Channels</h3>
        </div>
        <div className="space-y-1.5">
          {channels.map(ch => (
            <div
              key={ch.id}
              className={`flex items-center gap-3 bg-surface border rounded-md px-4 py-2.5 ${
                ch.id === activeChannel?.id ? 'border-blueprint/40' : 'border-line'
              }`}
            >
              <p className="text-sm text-ink font-medium flex-1">{ch.name}</p>
              {ch.handle && <span className="text-[11px] text-ink-muted">@{ch.handle}</span>}
              {ch.id === activeChannel?.id && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blueprint/15 text-blueprint font-medium uppercase tracking-wider">
                  Active
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ─── Template Manager Sub-Component ──────────────────────
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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template item?')) return
    await onDelete(id)
  }

  const toggleActive = async (id: string, current: boolean) => {
    await onUpdate(id, { is_active: !current })
  }

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <ListChecks size={16} className="text-ink-muted" />
        <h3 className="text-sm font-medium text-ink uppercase tracking-[0.1em]">Daily Checklist Template</h3>
      </div>
      <p className="text-[11px] text-ink-muted mb-3">
        These items are added to your checklist when you tap "Apply Template". Toggle items on/off without deleting.
      </p>
      <div className="bg-surface border border-line rounded-lg p-4">
        {templates.length === 0 && !adding && (
          <p className="text-sm text-ink-muted text-center py-4">No template items yet.</p>
        )}
        <div className="space-y-1.5 mb-3">
          {templates.map(tmpl => {
            const cat = CHECKLIST_CATEGORIES.find(c => c.id === tmpl.category)
            return (
              <div key={tmpl.id} className="flex items-center gap-3 px-3 py-2 bg-canvas border border-line rounded-md group">
                <button
                  onClick={() => toggleActive(tmpl.id, tmpl.is_active)}
                  className={`w-4 h-4 rounded border-2 transition-colors ${tmpl.is_active ? 'bg-success border-success' : 'border-line'}`}
                />
                <span className={`flex-1 text-sm ${tmpl.is_active ? 'text-ink' : 'text-ink-muted line-through'}`}>
                  {tmpl.title}
                </span>
                {cat && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: cat.color + '18', color: cat.color }}>
                    {cat.label}
                  </span>
                )}
                <button
                  onClick={() => handleDelete(tmpl.id)}
                  className="p-1 rounded text-ink-muted hover:text-danger hover:bg-danger-light opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>

        {adding ? (
          <div className="border-t border-line pt-3">
            <div className="flex gap-2 mb-2 flex-wrap">
              {CHECKLIST_CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                    category === c.id ? 'border-transparent text-white' : 'border-line text-ink-secondary'
                  }`}
                  style={category === c.id ? { backgroundColor: c.color } : {}}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Template item title..."
                autoFocus
                className="input flex-1"
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
              />
              <button onClick={handleAdd} className="px-3 py-1.5 bg-blueprint text-white rounded-md text-sm">Add</button>
              <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-sm text-ink-muted hover:text-ink">Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 text-sm text-ink-muted hover:text-blueprint transition-colors"
          >
            <Plus size={14} /> Add template item
          </button>
        )}
      </div>
    </section>
  )
}
