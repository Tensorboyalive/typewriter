import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import type { Channel, Project, Expense, Income, TimerSession, Note, ContentBankItem, ChecklistItem, UserRole, Profile, Deal, ChecklistTemplate, EditorOutput } from './types'

interface TeamMemberWithProfile {
  id: string
  user_id: string
  channel_id: string
  role: UserRole
  profile_name: string
  profile_email: string | null
}

interface StoreContextType {
  user: User | null
  userRole: UserRole
  profile: Profile | null
  authLoading: boolean
  signIn: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>

  channels: Channel[]
  activeChannel: Channel | null
  switchChannel: (id: string) => void
  addChannel: (c: { name: string; handle: string; niche: string }) => Promise<Channel | null>
  updateChannel: (id: string, updates: Partial<Channel>) => Promise<void>
  deleteChannel: (id: string) => Promise<void>

  teamMembers: TeamMemberWithProfile[]
  inviteTeamMember: (email: string, role: UserRole, allChannels?: boolean) => Promise<{ error: string | null }>
  refreshTeamMembers: () => Promise<void>

  projects: Project[]
  expenses: Expense[]
  income: Income[]
  sessions: TimerSession[]
  conversionRate: number
  dataLoading: boolean

  addProject: (p: { title: string; type: string; status: string; platform?: string; scheduled_date?: string | null; script?: string; description?: string }) => Promise<Project | null>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  addExpense: (e: { project_id?: string | null; description: string; amount: number; category: string; date: string }) => Promise<void>
  deleteExpense: (id: string) => Promise<void>

  addIncome: (i: { project_id?: string | null; description: string; amount: number; source: string; date: string }) => Promise<void>
  deleteIncome: (id: string) => Promise<void>

  addSession: (s: { duration: number; completed_at: string }) => Promise<void>

  notes: Note[]
  addNote: (n: { title: string; content: string; label: string }) => Promise<Note | null>
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>
  deleteNote: (id: string) => Promise<void>

  bankItems: ContentBankItem[]
  addBankItem: (item: { platform: string; content_text: string; scheduled_date?: string | null }) => Promise<ContentBankItem | null>
  updateBankItem: (id: string, updates: Partial<ContentBankItem>) => Promise<void>
  deleteBankItem: (id: string) => Promise<void>

  checklistItems: ChecklistItem[]
  addChecklistItem: (item: { title: string; category: string; date: string; is_recurring?: boolean }) => Promise<ChecklistItem | null>
  updateChecklistItem: (id: string, updates: Partial<ChecklistItem>) => Promise<void>
  deleteChecklistItem: (id: string) => Promise<void>

  deals: Deal[]
  addDeal: (d: { company: string; contact_name: string; contact_email?: string | null; source: string; stage?: string; value_amount: number; value_currency?: 'INR' | 'USD'; deliverables?: string | null; deadline?: string | null; notes?: string | null }) => Promise<Deal | null>
  updateDeal: (id: string, updates: Partial<Deal>) => Promise<void>
  deleteDeal: (id: string) => Promise<void>

  checklistTemplates: ChecklistTemplate[]
  addChecklistTemplate: (t: { title: string; category: string; sort_order?: number }) => Promise<ChecklistTemplate | null>
  updateChecklistTemplate: (id: string, updates: Partial<ChecklistTemplate>) => Promise<void>
  deleteChecklistTemplate: (id: string) => Promise<void>
  applyDailyTemplate: (date: string) => Promise<number>

  editorOutputs: EditorOutput[]
  addEditorOutput: (o: { description: string; live_link?: string | null; date?: string }) => Promise<EditorOutput | null>
  updateEditorOutput: (id: string, updates: Partial<EditorOutput>) => Promise<void>
  deleteEditorOutput: (id: string) => Promise<void>
  fetchEditorOutputs: () => Promise<void>

  setConversionRate: (rate: number) => Promise<void>
  exportAllData: () => Promise<object>
}

const StoreContext = createContext<StoreContextType>(null!)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>('editor')
  const [profile, setProfile] = useState<Profile | null>(null)

  const [channels, setChannels] = useState<Channel[]>([])
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)

  const [projects, setProjects] = useState<Project[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [income, setIncome] = useState<Income[]>([])
  const [sessions, setSessions] = useState<TimerSession[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [bankItems, setBankItems] = useState<ContentBankItem[]>([])
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [conversionRate, setConversionRateState] = useState(84)
  const [dataLoading, setDataLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithProfile[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>([])
  const [editorOutputs, setEditorOutputs] = useState<EditorOutput[]>([])

  const activeChannel = channels.find(c => c.id === activeChannelId) ?? null

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      setChannels([]); setActiveChannelId(null); setDataLoading(false)
      setProfile(null); setUserRole('editor')
      return
    }
    (async () => {
      // Fetch profile + role
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profileData) {
        setProfile(profileData as Profile)
        setUserRole((profileData.role as UserRole) || 'admin')
      }

      // Fetch channels the user owns OR is a team member of
      const [ownedRes, memberRes] = await Promise.all([
        supabase.from('channels').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('team_members').select('channel_id, channels(*)').eq('user_id', user.id),
      ])

      const ownedChannels = ownedRes.data ?? []
      const memberChannels = (memberRes.data ?? [])
        .map((m: any) => m.channels)
        .filter(Boolean)
        .filter((c: Channel) => !ownedChannels.find(o => o.id === c.id))

      const allChannels = [...ownedChannels, ...memberChannels]

      if (allChannels.length > 0) {
        setChannels(allChannels)
        const lastActive = localStorage.getItem('tw-active-channel')
        const valid = allChannels.find(c => c.id === lastActive)
        setActiveChannelId(valid?.id ?? allChannels[0].id)
      } else {
        const { data: created } = await supabase.from('channels').insert({ user_id: user.id, name: 'My Channel', handle: '', niche: '' }).select().single()
        if (created) { setChannels([created]); setActiveChannelId(created.id) }
      }
      await supabase.from('user_settings').upsert({ user_id: user.id, conversion_rate: 84 }, { onConflict: 'user_id', ignoreDuplicates: true })
    })()
  }, [user])

  const refreshTeamMembers = useCallback(async () => {
    if (!activeChannelId) return
    const { data } = await supabase
      .from('team_members')
      .select('id, user_id, channel_id, role')
      .eq('channel_id', activeChannelId)
    if (!data) return
    const members: TeamMemberWithProfile[] = await Promise.all(
      data.map(async (tm: { id: string; user_id: string; channel_id: string; role: string }) => {
        const { data: prof } = await supabase.from('profiles').select('display_name, email').eq('id', tm.user_id).single()
        return {
          id: tm.id,
          user_id: tm.user_id,
          channel_id: tm.channel_id,
          role: tm.role as UserRole,
          profile_name: prof?.display_name || 'Unnamed',
          profile_email: prof?.email || null,
        }
      })
    )
    setTeamMembers(members)
  }, [activeChannelId])

  const inviteTeamMember = async (email: string, role: UserRole, allChannels = false): Promise<{ error: string | null }> => {
    if (!activeChannelId || !user) return { error: 'No active channel' }
    // Use SECURITY DEFINER RPC to bypass RLS for cross-user email lookup
    const { data: foundId, error: rpcError } = await supabase
      .rpc('lookup_user_by_email', { lookup_email: email })
    if (rpcError || !foundId) {
      return { error: 'No user found with that email. They must sign up first.' }
    }
    const targetUserId = foundId as string

    // Determine which channels to add to
    const targetChannels = allChannels
      ? channels.filter(c => c.user_id === user.id).map(c => c.id)
      : [activeChannelId]

    const errors: string[] = []
    for (const chId of targetChannels) {
      const { error } = await supabase.from('team_members').insert({
        user_id: targetUserId,
        channel_id: chId,
        role,
        invited_by: user.id,
      })
      if (error) {
        if (error.code !== '23505') errors.push(error.message) // skip "already a member"
      }
    }
    if (errors.length > 0) return { error: errors.join('; ') }
    await refreshTeamMembers()
    return { error: null }
  }

  // Saved, Expenses, Income, Checklist, Content Bank = user-scoped (cross-channel)
  // Projects, Sessions = channel-scoped
  const fetchData = useCallback(async (channelId: string) => {
    setDataLoading(true)
    localStorage.setItem('tw-active-channel', channelId)
    const today = new Date().toISOString().split('T')[0]

    const [pRes, eRes, iRes, sRes, nRes, bRes, cRes, settRes, dRes, tRes, oRes] = await Promise.all([
      supabase.from('projects').select('*').eq('channel_id', channelId).is('archived_at', null).order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').eq('user_id', user!.id).is('archived_at', null).order('date', { ascending: false }),
      supabase.from('income').select('*').eq('user_id', user!.id).is('archived_at', null).order('date', { ascending: false }),
      supabase.from('timer_sessions').select('*').eq('channel_id', channelId).is('archived_at', null).order('completed_at', { ascending: false }),
      supabase.from('notes').select('*').eq('user_id', user!.id).is('archived_at', null).order('updated_at', { ascending: false }),
      supabase.from('content_bank').select('*').eq('user_id', user!.id).is('archived_at', null).order('created_at', { ascending: false }),
      supabase.from('checklist_items').select('*').eq('user_id', user!.id).eq('date', today).is('archived_at', null).order('created_at'),
      supabase.from('user_settings').select('*').eq('user_id', user!.id).single(),
      supabase.from('deals').select('*').eq('channel_id', channelId).order('created_at', { ascending: false }),
      supabase.from('checklist_templates').select('*').eq('user_id', user!.id).order('sort_order'),
      supabase.from('editor_outputs').select('*').eq('channel_id', channelId).order('date', { ascending: false }).limit(50),
    ])

    setProjects(pRes.data ?? [])
    setExpenses(eRes.data ?? [])
    setIncome(iRes.data ?? [])
    setSessions(sRes.data ?? [])
    setNotes(nRes.data ?? [])
    setBankItems(bRes.data ?? [])
    setChecklistItems(cRes.data ?? [])
    setConversionRateState(settRes.data?.conversion_rate ?? 84)
    setDeals(dRes.data ?? [])
    setChecklistTemplates(tRes.data ?? [])
    setEditorOutputs(oRes.data ?? [])
    setDataLoading(false)
  }, [user])

  // Fetch team members when channel changes
  useEffect(() => {
    if (activeChannelId && user) refreshTeamMembers()
  }, [activeChannelId, user, refreshTeamMembers])

  useEffect(() => {
    if (activeChannelId && user) fetchData(activeChannelId)
  }, [activeChannelId, user, fetchData])

  const signIn = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null); setChannels([]); setActiveChannelId(null)
    setProjects([]); setExpenses([]); setIncome([]); setSessions([])
    setBankItems([]); setChecklistItems([])
  }

  const switchChannel = (id: string) => setActiveChannelId(id)

  const addChannel = async (c: { name: string; handle: string; niche: string }) => {
    const { data, error } = await supabase.from('channels').insert({ ...c, user_id: user!.id }).select().single()
    if (!error && data) { setChannels(prev => [...prev, data]); setActiveChannelId(data.id); return data }
    return null
  }

  const updateChannel = async (id: string, updates: Partial<Channel>) => {
    const { error } = await supabase.from('channels').update(updates).eq('id', id)
    if (!error) setChannels(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)))
  }

  const deleteChannel = async (id: string) => {
    if (channels.length <= 1) return
    await supabase.from('channels').delete().eq('id', id)
    setChannels(prev => {
      const remaining = prev.filter(c => c.id !== id)
      if (activeChannelId === id) setActiveChannelId(remaining[0]?.id ?? null)
      return remaining
    })
  }

  const addProject = async (p: { title: string; type: string; status: string; platform?: string; scheduled_date?: string | null; script?: string; description?: string }) => {
    const { data, error } = await supabase.from('projects').insert({
      title: p.title, type: p.type, status: p.status, platform: p.platform ?? 'tb',
      scheduled_date: p.scheduled_date ?? null, script: p.script ?? '', description: p.description ?? '',
      channel_id: activeChannelId!, user_id: user!.id,
    }).select().single()
    if (!error && data) { setProjects(prev => [data, ...prev]); return data as Project }
    return null
  }

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const { error } = await supabase.from('projects').update(updates).eq('id', id)
    if (!error) setProjects(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)))
  }

  const deleteProject = async (id: string) => {
    await supabase.from('projects').update({ archived_at: new Date().toISOString() }).eq('id', id)
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  const addExpense = async (e: { project_id?: string | null; description: string; amount: number; category: string; date: string }) => {
    const { data, error } = await supabase.from('expenses').insert({ ...e, channel_id: activeChannelId!, user_id: user!.id }).select().single()
    if (!error && data) setExpenses(prev => [data, ...prev])
  }

  const deleteExpense = async (id: string) => {
    await supabase.from('expenses').update({ archived_at: new Date().toISOString() }).eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const addIncome = async (i: { project_id?: string | null; description: string; amount: number; source: string; date: string }) => {
    const { data, error } = await supabase.from('income').insert({ ...i, channel_id: activeChannelId!, user_id: user!.id }).select().single()
    if (!error && data) setIncome(prev => [data, ...prev])
  }

  const deleteIncome = async (id: string) => {
    await supabase.from('income').update({ archived_at: new Date().toISOString() }).eq('id', id)
    setIncome(prev => prev.filter(i => i.id !== id))
  }

  const addSession = async (s: { duration: number; completed_at: string }) => {
    const { data, error } = await supabase.from('timer_sessions').insert({ ...s, channel_id: activeChannelId!, user_id: user!.id }).select().single()
    if (!error && data) setSessions(prev => [data, ...prev])
  }

  const addNote = async (n: { title: string; content: string; label: string }) => {
    const { data, error } = await supabase.from('notes').insert({ ...n, channel_id: activeChannelId!, user_id: user!.id }).select().single()
    if (!error && data) { setNotes(prev => [data, ...prev]); return data as Note }
    return null
  }

  const updateNote = async (id: string, updates: Partial<Note>) => {
    const { error } = await supabase.from('notes').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
    if (!error) setNotes(prev => prev.map(n => (n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n)))
  }

  const deleteNote = async (id: string) => {
    await supabase.from('notes').update({ archived_at: new Date().toISOString() }).eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const addBankItem = async (item: { platform: string; content_text: string; scheduled_date?: string | null }) => {
    const { data, error } = await supabase.from('content_bank').insert({ ...item, user_id: user!.id }).select().single()
    if (!error && data) { setBankItems(prev => [data, ...prev]); return data as ContentBankItem }
    return null
  }

  const updateBankItem = async (id: string, updates: Partial<ContentBankItem>) => {
    const { error } = await supabase.from('content_bank').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
    if (!error) setBankItems(prev => prev.map(b => (b.id === id ? { ...b, ...updates, updated_at: new Date().toISOString() } : b)))
  }

  const deleteBankItem = async (id: string) => {
    await supabase.from('content_bank').update({ archived_at: new Date().toISOString() }).eq('id', id)
    setBankItems(prev => prev.filter(b => b.id !== id))
  }

  const addChecklistItem = async (item: { title: string; category: string; date: string; is_recurring?: boolean }) => {
    const { data, error } = await supabase.from('checklist_items').insert({ ...item, user_id: user!.id }).select().single()
    if (!error && data) { setChecklistItems(prev => [...prev, data]); return data as ChecklistItem }
    return null
  }

  const updateChecklistItem = async (id: string, updates: Partial<ChecklistItem>) => {
    const payload: Record<string, unknown> = { ...updates }
    if (updates.status === 'done') payload.completed_at = new Date().toISOString()
    const { error } = await supabase.from('checklist_items').update(payload).eq('id', id)
    if (!error) setChecklistItems(prev => prev.map(c => (c.id === id ? { ...c, ...payload } as ChecklistItem : c)))
  }

  const deleteChecklistItem = async (id: string) => {
    await supabase.from('checklist_items').update({ archived_at: new Date().toISOString() }).eq('id', id)
    setChecklistItems(prev => prev.filter(c => c.id !== id))
  }

  // ─── Deals CRUD ──────────────────────────────────────────
  const addDeal = async (d: { company: string; contact_name: string; contact_email?: string | null; source: string; stage?: string; value_amount: number; value_currency?: 'INR' | 'USD'; deliverables?: string | null; deadline?: string | null; notes?: string | null }) => {
    const { data, error } = await supabase.from('deals').insert({
      ...d, channel_id: activeChannelId!, user_id: user!.id, stage: d.stage ?? 'lead', value_currency: d.value_currency ?? 'INR',
    }).select().single()
    if (!error && data) { setDeals(prev => [data, ...prev]); return data as Deal }
    return null
  }

  const updateDeal = async (id: string, updates: Partial<Deal>) => {
    const { error } = await supabase.from('deals').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
    if (!error) setDeals(prev => prev.map(d => (d.id === id ? { ...d, ...updates, updated_at: new Date().toISOString() } : d)))
  }

  const deleteDeal = async (id: string) => {
    await supabase.from('deals').delete().eq('id', id)
    setDeals(prev => prev.filter(d => d.id !== id))
  }

  // ─── Checklist Templates CRUD ───────────────────────────
  const addChecklistTemplate = async (t: { title: string; category: string; sort_order?: number }) => {
    const { data, error } = await supabase.from('checklist_templates').insert({
      ...t, user_id: user!.id, sort_order: t.sort_order ?? checklistTemplates.length,
    }).select().single()
    if (!error && data) { setChecklistTemplates(prev => [...prev, data]); return data as ChecklistTemplate }
    return null
  }

  const updateChecklistTemplate = async (id: string, updates: Partial<ChecklistTemplate>) => {
    const { error } = await supabase.from('checklist_templates').update(updates).eq('id', id)
    if (!error) setChecklistTemplates(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)))
  }

  const deleteChecklistTemplate = async (id: string) => {
    await supabase.from('checklist_templates').delete().eq('id', id)
    setChecklistTemplates(prev => prev.filter(t => t.id !== id))
  }

  const applyDailyTemplate = async (date: string): Promise<number> => {
    const activeTemplates = checklistTemplates.filter(t => t.is_active)
    const existingTitles = new Set(checklistItems.map(i => i.title))
    let added = 0
    for (const tmpl of activeTemplates) {
      if (existingTitles.has(tmpl.title)) continue
      await addChecklistItem({ title: tmpl.title, category: tmpl.category, date })
      added++
    }
    return added
  }

  // ─── Editor Outputs CRUD ────────────────────────────────
  const addEditorOutput = async (o: { description: string; live_link?: string | null; date?: string }) => {
    const { data, error } = await supabase.from('editor_outputs').insert({
      description: o.description, live_link: o.live_link ?? null,
      date: o.date ?? new Date().toISOString().split('T')[0],
      channel_id: activeChannelId!, user_id: user!.id,
    }).select().single()
    if (!error && data) { setEditorOutputs(prev => [data, ...prev]); return data as EditorOutput }
    return null
  }

  const updateEditorOutput = async (id: string, updates: Partial<EditorOutput>) => {
    const { error } = await supabase.from('editor_outputs').update(updates).eq('id', id)
    if (!error) setEditorOutputs(prev => prev.map(o => (o.id === id ? { ...o, ...updates } : o)))
  }

  const deleteEditorOutput = async (id: string) => {
    await supabase.from('editor_outputs').delete().eq('id', id)
    setEditorOutputs(prev => prev.filter(o => o.id !== id))
  }

  const fetchEditorOutputs = async () => {
    if (!activeChannelId) return
    const { data } = await supabase.from('editor_outputs').select('*').eq('channel_id', activeChannelId).order('date', { ascending: false }).limit(50)
    if (data) setEditorOutputs(data)
  }

  const setConversionRate = async (rate: number) => {
    setConversionRateState(rate)
    await supabase.from('user_settings').update({ conversion_rate: rate, updated_at: new Date().toISOString() }).eq('user_id', user!.id)
  }

  const exportAllData = async () => {
    const allChannels: Record<string, object> = {}
    for (const ch of channels) {
      const [p, s] = await Promise.all([
        supabase.from('projects').select('*').eq('channel_id', ch.id).is('archived_at', null),
        supabase.from('timer_sessions').select('*').eq('channel_id', ch.id).is('archived_at', null),
      ])
      allChannels[ch.name] = { channel: ch, projects: p.data ?? [], sessions: s.data ?? [] }
    }
    const [e, i, n, b, cl] = await Promise.all([
      supabase.from('expenses').select('*').eq('user_id', user!.id).is('archived_at', null),
      supabase.from('income').select('*').eq('user_id', user!.id).is('archived_at', null),
      supabase.from('notes').select('*').eq('user_id', user!.id).is('archived_at', null),
      supabase.from('content_bank').select('*').eq('user_id', user!.id).is('archived_at', null),
      supabase.from('checklist_items').select('*').eq('user_id', user!.id).is('archived_at', null),
    ])
    return {
      exported_at: new Date().toISOString(), channels: allChannels,
      expenses: e.data ?? [], income: i.data ?? [], notes: n.data ?? [],
      content_bank: b.data ?? [], checklist: cl.data ?? [],
      settings: { conversion_rate: conversionRate },
    }
  }

  return (
    <StoreContext.Provider value={{
      user, userRole, profile, authLoading, signIn, signOut,
      channels, activeChannel, switchChannel, addChannel, updateChannel, deleteChannel,
      teamMembers, inviteTeamMember, refreshTeamMembers,
      projects, expenses, income, sessions, notes, conversionRate, dataLoading,
      addProject, updateProject, deleteProject,
      addExpense, deleteExpense, addIncome, deleteIncome, addSession,
      addNote, updateNote, deleteNote,
      bankItems, addBankItem, updateBankItem, deleteBankItem,
      checklistItems, addChecklistItem, updateChecklistItem, deleteChecklistItem,
      deals, addDeal, updateDeal, deleteDeal,
      checklistTemplates, addChecklistTemplate, updateChecklistTemplate, deleteChecklistTemplate, applyDailyTemplate,
      editorOutputs, addEditorOutput, updateEditorOutput, deleteEditorOutput, fetchEditorOutputs,
      setConversionRate, exportAllData,
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export const useStore = () => useContext(StoreContext)
