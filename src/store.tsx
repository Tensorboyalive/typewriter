import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { format } from 'date-fns'
import { supabase } from './lib/supabase'

// Local-time YYYY-MM-DD. Do NOT use toISOString().split('T')[0] — that's UTC,
// which breaks the checklist "today" filter for any user outside UTC.
const localDateKey = (d: Date = new Date()) => format(d, 'yyyy-MM-dd')
import type { Channel, Project, Expense, Income, TimerSession, Note, ChecklistItem, UserRole, Profile, ChecklistTemplate, EditorOutput, TimeBlock, Persona } from './types'

const PERSONA_KEY = 'tw-persona'
const readPersona = (): Persona => {
  if (typeof window === 'undefined') return 'you'
  const v = localStorage.getItem(PERSONA_KEY)
  return v === 'pa' ? 'pa' : 'you'
}

/** Throw a consistent store error with a console.error for context. */
function storeError(op: string, supaErr: { message: string; code?: string }, extra?: string): never {
  const detail = extra ? ` (${extra})` : ''
  console.error(`[store.${op}]${detail}`, supaErr)
  throw new Error(`${op} failed: ${supaErr.message}`)
}

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
  addChannel: (c: { name: string; handle: string; niche: string }) => Promise<Channel>
  updateChannel: (id: string, updates: Partial<Channel>) => Promise<void>
  deleteChannel: (id: string) => Promise<void>

  teamMembers: TeamMemberWithProfile[]
  inviteTeamMember: (email: string, role: UserRole, allChannels?: boolean) => Promise<{ error: string | null }>
  refreshTeamMembers: () => Promise<void>

  // Channel-scoped (active channel only)
  projects: Project[]
  sessions: TimerSession[]
  editorOutputs: EditorOutput[]

  // Cross-channel aggregate (for unified Dashboard)
  allProjects: Project[]
  allSessions: TimerSession[]

  // User-scoped (same across all channels)
  expenses: Expense[]
  income: Income[]
  notes: Note[]
  checklistItems: ChecklistItem[]
  checklistTemplates: ChecklistTemplate[]

  conversionRate: number
  dataLoading: boolean
  /** Set when the initial fetchData call fails — show a retry banner. */
  fetchError: string | null
  retryFetch: () => void

  addProject: (p: { title: string; type?: string | null; status: string; platform?: string; scheduled_date?: string | null; script?: string; description?: string; format?: string | null }) => Promise<Project>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  addExpense: (e: { project_id?: string | null; description: string; amount: number; category: string; date: string }) => Promise<void>
  deleteExpense: (id: string) => Promise<void>

  addIncome: (i: { project_id?: string | null; description: string; amount: number; source: string; date: string }) => Promise<void>
  deleteIncome: (id: string) => Promise<void>

  addSession: (s: { duration: number; completed_at: string }) => Promise<void>

  addNote: (n: { title: string; content: string; label: string }) => Promise<Note>
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>
  deleteNote: (id: string) => Promise<void>

  addChecklistItem: (item: { title: string; category: string; date: string; is_recurring?: boolean }) => Promise<ChecklistItem>
  updateChecklistItem: (id: string, updates: Partial<ChecklistItem>) => Promise<void>
  deleteChecklistItem: (id: string) => Promise<void>

  addChecklistTemplate: (t: { title: string; category: string; sort_order?: number }) => Promise<ChecklistTemplate>
  updateChecklistTemplate: (id: string, updates: Partial<ChecklistTemplate>) => Promise<void>
  deleteChecklistTemplate: (id: string) => Promise<void>
  applyDailyTemplate: (date: string) => Promise<number>

  addEditorOutput: (o: { description: string; live_link?: string | null; date?: string; channel_id?: string }) => Promise<EditorOutput>
  updateEditorOutput: (id: string, updates: Partial<EditorOutput>) => Promise<void>
  deleteEditorOutput: (id: string) => Promise<void>
  fetchEditorOutputs: () => Promise<void>

  setConversionRate: (rate: number) => Promise<void>
  exportAllData: () => Promise<object>

  // Persona (app-level — you vs PA sharing one login)
  persona: Persona
  setPersona: (p: Persona) => void

  // Time blocks (Today view)
  timeBlocks: TimeBlock[]
  fetchTimeBlocks: (date: string) => Promise<void>
  addTimeBlock: (b: { date: string; start_min: number; end_min: number; label?: string | null; project_id?: string | null; checklist_item_id?: string | null; is_mit?: boolean }) => Promise<TimeBlock>
  updateTimeBlock: (id: string, updates: Partial<TimeBlock>) => Promise<void>
  deleteTimeBlock: (id: string) => Promise<void>
  setMIT: (date: string, ref: { project_id?: string | null; checklist_item_id?: string | null; label?: string | null }) => Promise<void>
}

const StoreContext = createContext<StoreContextType>(null!)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>('admin')
  const [profile, setProfile] = useState<Profile | null>(null)

  const [channels, setChannels] = useState<Channel[]>([])
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)

  const [projects, setProjects] = useState<Project[]>([])
  const [sessions, setSessions] = useState<TimerSession[]>([])
  const [editorOutputs, setEditorOutputs] = useState<EditorOutput[]>([])

  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [allSessions, setAllSessions] = useState<TimerSession[]>([])

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [income, setIncome] = useState<Income[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>([])

  const [persona, setPersonaState] = useState<Persona>(readPersona)
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([])
  const [conversionRate, setConversionRateState] = useState(84)
  const [dataLoading, setDataLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithProfile[]>([])

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
      setProfile(null); setUserRole('admin')
      return
    }
    ;(async () => {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profileData) {
        setProfile(profileData as Profile)
        setUserRole((profileData.role as UserRole) || 'admin')
      }

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
    const { data: foundId, error: rpcError } = await supabase
      .rpc('lookup_user_by_email', { lookup_email: email })
    if (rpcError || !foundId) {
      return { error: 'No user found with that email. They must sign up first.' }
    }
    const targetUserId = foundId as string

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
        if (error.code !== '23505') errors.push(error.message)
      }
    }
    if (errors.length > 0) return { error: errors.join('; ') }
    await refreshTeamMembers()
    return { error: null }
  }

  // Channel-scoped fetch: projects, sessions, editor_outputs tied to activeChannelId
  // User-scoped fetch: expenses, income, notes, checklist, templates — unified across channels
  const fetchData = useCallback(async (channelId: string, channelIds: string[]) => {
    setDataLoading(true)
    setFetchError(null)
    localStorage.setItem('tw-active-channel', channelId)
    const today = localDateKey()

    try {
      const [pRes, sRes, oRes, eRes, iRes, nRes, cRes, tRes, settRes, apRes, asRes] = await Promise.all([
        // Channel-scoped
        supabase.from('projects').select('*').eq('channel_id', channelId).is('archived_at', null).order('created_at', { ascending: false }),
        supabase.from('timer_sessions').select('*').eq('channel_id', channelId).is('archived_at', null).order('completed_at', { ascending: false }),
        supabase.from('editor_outputs').select('*').in('channel_id', channelIds).order('date', { ascending: false }).limit(100),
        // User-scoped (unified)
        supabase.from('expenses').select('*').eq('user_id', user!.id).is('archived_at', null).order('date', { ascending: false }),
        supabase.from('income').select('*').eq('user_id', user!.id).is('archived_at', null).order('date', { ascending: false }),
        supabase.from('notes').select('*').eq('user_id', user!.id).is('archived_at', null).order('updated_at', { ascending: false }),
        supabase.from('checklist_items').select('*').eq('user_id', user!.id).eq('date', today).is('archived_at', null).order('created_at'),
        supabase.from('checklist_templates').select('*').eq('user_id', user!.id).order('sort_order'),
        supabase.from('user_settings').select('*').eq('user_id', user!.id).single(),
        // Cross-channel aggregate for Dashboard
        supabase.from('projects').select('*').in('channel_id', channelIds).is('archived_at', null).order('created_at', { ascending: false }),
        supabase.from('timer_sessions').select('*').in('channel_id', channelIds).is('archived_at', null).order('completed_at', { ascending: false }),
      ])

      // Surface any fetch-level errors
      const fetchErrors = [
        pRes.error && `projects: ${pRes.error.message}`,
        sRes.error && `timer_sessions: ${sRes.error.message}`,
        oRes.error && `editor_outputs: ${oRes.error.message}`,
        eRes.error && `expenses: ${eRes.error.message}`,
        iRes.error && `income: ${iRes.error.message}`,
        nRes.error && `notes: ${nRes.error.message}`,
        cRes.error && `checklist_items: ${cRes.error.message}`,
        tRes.error && `checklist_templates: ${tRes.error.message}`,
        apRes.error && `all_projects: ${apRes.error.message}`,
        asRes.error && `all_sessions: ${asRes.error.message}`,
      ].filter(Boolean)

      if (fetchErrors.length > 0) {
        const msg = fetchErrors.join('; ')
        console.error('[store.fetchData] One or more queries failed:', msg)
        setFetchError("Couldn't load some of your data. Check your connection and retry.")
      }

      // Legacy 'assigned' stage was removed — coerce any residual rows to 'scripted'
      const coerce = (rows: Project[] | null | undefined) =>
        (rows ?? []).map(p => (p.status as string) === 'assigned' ? { ...p, status: 'scripted' as const } : p)

      setProjects(coerce(pRes.data))
      setSessions(sRes.data ?? [])
      setEditorOutputs(oRes.data ?? [])
      setExpenses(eRes.data ?? [])
      setIncome(iRes.data ?? [])
      setNotes(nRes.data ?? [])
      setChecklistItems(cRes.data ?? [])
      setChecklistTemplates(tRes.data ?? [])
      setConversionRateState(settRes.data?.conversion_rate ?? 84)
      setAllProjects(coerce(apRes.data))
      setAllSessions(asRes.data ?? [])
    } catch (err) {
      console.error('[store.fetchData] Unexpected error during data load:', err)
      setFetchError("Couldn't load your data. Check your connection and retry.")
    } finally {
      setDataLoading(false)
    }
  }, [user])

  const retryFetch = useCallback(() => {
    if (activeChannelId && user && channels.length > 0) {
      fetchData(activeChannelId, channels.map(c => c.id))
    }
  }, [activeChannelId, user, channels, fetchData])

  useEffect(() => {
    if (activeChannelId && user) refreshTeamMembers()
  }, [activeChannelId, user, refreshTeamMembers])

  useEffect(() => {
    if (activeChannelId && user && channels.length > 0) {
      fetchData(activeChannelId, channels.map(c => c.id))
    }
  }, [activeChannelId, user, channels, fetchData])

  const signIn = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('[store.signOut]', error)
      throw new Error(`Sign out failed: ${error.message}`)
    }
    setUser(null); setChannels([]); setActiveChannelId(null)
    setProjects([]); setExpenses([]); setIncome([]); setSessions([])
    setChecklistItems([]); setAllProjects([]); setAllSessions([])
  }

  const switchChannel = (id: string) => setActiveChannelId(id)

  const addChannel = async (c: { name: string; handle: string; niche: string }): Promise<Channel> => {
    const { data, error } = await supabase.from('channels').insert({ ...c, user_id: user!.id }).select().single()
    if (error || !data) storeError('addChannel', error ?? { message: 'No data returned' }, `name=${c.name}`)
    setChannels(prev => [...prev, data!])
    setActiveChannelId(data!.id)
    return data! as Channel
  }

  const updateChannel = async (id: string, updates: Partial<Channel>) => {
    const { error } = await supabase.from('channels').update(updates).eq('id', id)
    if (error) storeError('updateChannel', error, `id=${id}`)
    setChannels(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)))
  }

  const deleteChannel = async (id: string) => {
    if (channels.length <= 1) return
    const { error } = await supabase.from('channels').delete().eq('id', id)
    if (error) storeError('deleteChannel', error, `id=${id}`)
    setChannels(prev => {
      const remaining = prev.filter(c => c.id !== id)
      if (activeChannelId === id) setActiveChannelId(remaining[0]?.id ?? null)
      return remaining
    })
  }

  const addProject = async (p: { title: string; type?: string | null; status: string; platform?: string; scheduled_date?: string | null; script?: string; description?: string; format?: string | null }): Promise<Project> => {
    // Derive a legacy `type` value from `format` so inserts succeed even on
    // databases where migration 019 hasn't been run yet (the `type` column
    // still has a NOT NULL constraint there). Mapping: reel→reel,
    // carousel→carousel, text→post. Falls back to 'post' as a safe default.
    const legacyType =
      p.type ??
      (p.format === 'reel' ? 'reel'
       : p.format === 'carousel' ? 'carousel'
       : p.format === 'text' ? 'post'
       : 'post')
    const { data, error } = await supabase.from('projects').insert({
      title: p.title, type: legacyType, status: p.status, platform: p.platform ?? 'tb',
      scheduled_date: p.scheduled_date ?? null, script: p.script ?? '', description: p.description ?? '',
      format: p.format ?? null,
      channel_id: activeChannelId!, user_id: user!.id,
    }).select().single()
    if (error || !data) storeError('addProject', error ?? { message: 'No data returned' }, `title=${p.title}`)
    setProjects(prev => [data!, ...prev])
    setAllProjects(prev => [data!, ...prev])
    return data! as Project
  }

  const updateProject = async (id: string, updates: Partial<Project>) => {
    // Optimistic update
    const previous = projects.find(p => p.id === id)
    setProjects(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)))
    setAllProjects(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)))

    const { error } = await supabase.from('projects').update(updates).eq('id', id)
    if (error) {
      // Roll back optimistic update
      if (previous) {
        setProjects(prev => prev.map(p => (p.id === id ? previous : p)))
        setAllProjects(prev => prev.map(p => (p.id === id ? previous : p)))
      }
      storeError('updateProject', error, `id=${id}`)
    }
  }

  const deleteProject = async (id: string) => {
    // Optimistic removal
    const previous = projects.find(p => p.id === id)
    const previousAll = allProjects.find(p => p.id === id)
    setProjects(prev => prev.filter(p => p.id !== id))
    setAllProjects(prev => prev.filter(p => p.id !== id))

    const { error } = await supabase.from('projects').update({ archived_at: new Date().toISOString() }).eq('id', id)
    if (error) {
      // Roll back
      if (previous) setProjects(prev => [previous, ...prev])
      if (previousAll) setAllProjects(prev => [previousAll, ...prev])
      storeError('deleteProject', error, `id=${id}`)
    }
  }

  const addExpense = async (e: { project_id?: string | null; description: string; amount: number; category: string; date: string }) => {
    const { data, error } = await supabase.from('expenses').insert({ ...e, channel_id: activeChannelId!, user_id: user!.id }).select().single()
    if (error || !data) storeError('addExpense', error ?? { message: 'No data returned' }, `desc=${e.description}`)
    setExpenses(prev => [data!, ...prev])
  }

  const deleteExpense = async (id: string) => {
    const previous = expenses.find(e => e.id === id)
    setExpenses(prev => prev.filter(e => e.id !== id))

    const { error } = await supabase.from('expenses').update({ archived_at: new Date().toISOString() }).eq('id', id)
    if (error) {
      if (previous) setExpenses(prev => [previous, ...prev])
      storeError('deleteExpense', error, `id=${id}`)
    }
  }

  const addIncome = async (i: { project_id?: string | null; description: string; amount: number; source: string; date: string }) => {
    const { data, error } = await supabase.from('income').insert({ ...i, channel_id: activeChannelId!, user_id: user!.id }).select().single()
    if (error || !data) storeError('addIncome', error ?? { message: 'No data returned' }, `desc=${i.description}`)
    setIncome(prev => [data!, ...prev])
  }

  const deleteIncome = async (id: string) => {
    const previous = income.find(i => i.id === id)
    setIncome(prev => prev.filter(i => i.id !== id))

    const { error } = await supabase.from('income').update({ archived_at: new Date().toISOString() }).eq('id', id)
    if (error) {
      if (previous) setIncome(prev => [previous, ...prev])
      storeError('deleteIncome', error, `id=${id}`)
    }
  }

  const addSession = async (s: { duration: number; completed_at: string }) => {
    const { data, error } = await supabase.from('timer_sessions').insert({ ...s, channel_id: activeChannelId!, user_id: user!.id }).select().single()
    if (error || !data) storeError('addSession', error ?? { message: 'No data returned' })
    setSessions(prev => [data!, ...prev])
    setAllSessions(prev => [data!, ...prev])
  }

  const addNote = async (n: { title: string; content: string; label: string }): Promise<Note> => {
    const { data, error } = await supabase.from('notes').insert({ ...n, channel_id: activeChannelId!, user_id: user!.id }).select().single()
    if (error || !data) storeError('addNote', error ?? { message: 'No data returned' }, `title=${n.title}`)
    setNotes(prev => [data!, ...prev])
    return data! as Note
  }

  const updateNote = async (id: string, updates: Partial<Note>) => {
    const previous = notes.find(n => n.id === id)
    const optimistic = { ...updates, updated_at: new Date().toISOString() }
    setNotes(prev => prev.map(n => (n.id === id ? { ...n, ...optimistic } : n)))

    const { error } = await supabase.from('notes').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) {
      if (previous) setNotes(prev => prev.map(n => (n.id === id ? previous : n)))
      storeError('updateNote', error, `id=${id}`)
    }
  }

  const deleteNote = async (id: string) => {
    const previous = notes.find(n => n.id === id)
    setNotes(prev => prev.filter(n => n.id !== id))

    const { error } = await supabase.from('notes').update({ archived_at: new Date().toISOString() }).eq('id', id)
    if (error) {
      if (previous) setNotes(prev => [previous, ...prev])
      storeError('deleteNote', error, `id=${id}`)
    }
  }

  const addChecklistItem = async (item: { title: string; category: string; date: string; is_recurring?: boolean }): Promise<ChecklistItem> => {
    const { data, error } = await supabase.from('checklist_items').insert({ ...item, user_id: user!.id }).select().single()
    if (error || !data) storeError('addChecklistItem', error ?? { message: 'No data returned' }, `title=${item.title}`)
    setChecklistItems(prev => [...prev, data!])
    return data! as ChecklistItem
  }

  const updateChecklistItem = async (id: string, updates: Partial<ChecklistItem>) => {
    const previous = checklistItems.find(c => c.id === id)
    const payload: Record<string, unknown> = { ...updates }
    if (updates.status === 'done') payload.completed_at = new Date().toISOString()
    setChecklistItems(prev => prev.map(c => (c.id === id ? { ...c, ...payload } as ChecklistItem : c)))

    const { error } = await supabase.from('checklist_items').update(payload).eq('id', id)
    if (error) {
      if (previous) setChecklistItems(prev => prev.map(c => (c.id === id ? previous : c)))
      storeError('updateChecklistItem', error, `id=${id}`)
    }
  }

  const deleteChecklistItem = async (id: string) => {
    const previous = checklistItems.find(c => c.id === id)
    setChecklistItems(prev => prev.filter(c => c.id !== id))

    const { error } = await supabase.from('checklist_items').update({ archived_at: new Date().toISOString() }).eq('id', id)
    if (error) {
      if (previous) setChecklistItems(prev => [...prev, previous])
      storeError('deleteChecklistItem', error, `id=${id}`)
    }
  }

  const addChecklistTemplate = async (t: { title: string; category: string; sort_order?: number }): Promise<ChecklistTemplate> => {
    const { data, error } = await supabase.from('checklist_templates').insert({
      ...t, user_id: user!.id, sort_order: t.sort_order ?? checklistTemplates.length,
    }).select().single()
    if (error || !data) storeError('addChecklistTemplate', error ?? { message: 'No data returned' }, `title=${t.title}`)
    setChecklistTemplates(prev => [...prev, data!])
    return data! as ChecklistTemplate
  }

  const updateChecklistTemplate = async (id: string, updates: Partial<ChecklistTemplate>) => {
    const previous = checklistTemplates.find(t => t.id === id)
    setChecklistTemplates(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)))

    const { error } = await supabase.from('checklist_templates').update(updates).eq('id', id)
    if (error) {
      if (previous) setChecklistTemplates(prev => prev.map(t => (t.id === id ? previous : t)))
      storeError('updateChecklistTemplate', error, `id=${id}`)
    }
  }

  const deleteChecklistTemplate = async (id: string) => {
    const previous = checklistTemplates.find(t => t.id === id)
    setChecklistTemplates(prev => prev.filter(t => t.id !== id))

    const { error } = await supabase.from('checklist_templates').delete().eq('id', id)
    if (error) {
      if (previous) setChecklistTemplates(prev => [...prev, previous])
      storeError('deleteChecklistTemplate', error, `id=${id}`)
    }
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

  const addEditorOutput = async (o: { description: string; live_link?: string | null; date?: string; channel_id?: string }): Promise<EditorOutput> => {
    const { data, error } = await supabase.from('editor_outputs').insert({
      description: o.description, live_link: o.live_link ?? null,
      date: o.date ?? localDateKey(),
      channel_id: o.channel_id ?? activeChannelId!, user_id: user!.id,
    }).select().single()
    if (error || !data) storeError('addEditorOutput', error ?? { message: 'No data returned' }, `desc=${o.description}`)
    setEditorOutputs(prev => [data!, ...prev])
    return data! as EditorOutput
  }

  const updateEditorOutput = async (id: string, updates: Partial<EditorOutput>) => {
    const previous = editorOutputs.find(o => o.id === id)
    setEditorOutputs(prev => prev.map(o => (o.id === id ? { ...o, ...updates } : o)))

    const { error } = await supabase.from('editor_outputs').update(updates).eq('id', id)
    if (error) {
      if (previous) setEditorOutputs(prev => prev.map(o => (o.id === id ? previous : o)))
      storeError('updateEditorOutput', error, `id=${id}`)
    }
  }

  const deleteEditorOutput = async (id: string) => {
    const previous = editorOutputs.find(o => o.id === id)
    setEditorOutputs(prev => prev.filter(o => o.id !== id))

    const { error } = await supabase.from('editor_outputs').delete().eq('id', id)
    if (error) {
      if (previous) setEditorOutputs(prev => [previous, ...prev])
      storeError('deleteEditorOutput', error, `id=${id}`)
    }
  }

  const fetchEditorOutputs = async () => {
    if (channels.length === 0) return
    const channelIds = channels.map(c => c.id)
    const { data, error } = await supabase.from('editor_outputs').select('*').in('channel_id', channelIds).order('date', { ascending: false }).limit(100)
    if (error) {
      console.error('[store.fetchEditorOutputs]', error)
      throw new Error(`fetchEditorOutputs failed: ${error.message}`)
    }
    if (data) setEditorOutputs(data)
  }

  const setConversionRate = async (rate: number) => {
    setConversionRateState(rate)
    const { error } = await supabase.from('user_settings').update({ conversion_rate: rate, updated_at: new Date().toISOString() }).eq('user_id', user!.id)
    if (error) {
      console.error('[store.setConversionRate]', error)
      // Non-critical: rate is already set in local state; still throw so UI can warn
      throw new Error(`setConversionRate failed: ${error.message}`)
    }
  }

  const setPersona = (p: Persona) => {
    localStorage.setItem(PERSONA_KEY, p)
    setPersonaState(p)
  }

  const fetchTimeBlocks = async (date: string) => {
    if (!user) return
    const { data, error } = await supabase.from('time_blocks').select('*')
      .eq('user_id', user.id).eq('date', date).order('start_min')
    if (error) {
      console.error('[store.fetchTimeBlocks]', error, `date=${date}`)
      throw new Error(`fetchTimeBlocks failed: ${error.message}`)
    }
    setTimeBlocks((data ?? []) as TimeBlock[])
  }

  const addTimeBlock = async (b: { date: string; start_min: number; end_min: number; label?: string | null; project_id?: string | null; checklist_item_id?: string | null; is_mit?: boolean }): Promise<TimeBlock> => {
    if (!user) throw new Error('addTimeBlock: no authenticated user')
    const { data, error } = await supabase.from('time_blocks').insert({
      user_id: user.id,
      persona,
      date: b.date,
      start_min: b.start_min,
      end_min: b.end_min,
      label: b.label ?? null,
      project_id: b.project_id ?? null,
      checklist_item_id: b.checklist_item_id ?? null,
      is_mit: b.is_mit ?? false,
    }).select().single()
    if (error || !data) storeError('addTimeBlock', error ?? { message: 'No data returned' }, `date=${b.date}`)
    setTimeBlocks(prev => [...prev, data! as TimeBlock].sort((a, b) => a.start_min - b.start_min))
    return data! as TimeBlock
  }

  const updateTimeBlock = async (id: string, updates: Partial<TimeBlock>) => {
    const previous = timeBlocks.find(b => b.id === id)
    setTimeBlocks(prev => prev.map(b => (b.id === id ? { ...b, ...updates } as TimeBlock : b)))

    const { error } = await supabase.from('time_blocks').update(updates).eq('id', id)
    if (error) {
      if (previous) setTimeBlocks(prev => prev.map(b => (b.id === id ? previous : b)))
      storeError('updateTimeBlock', error, `id=${id}`)
    }
  }

  const deleteTimeBlock = async (id: string) => {
    const previous = timeBlocks.find(b => b.id === id)
    setTimeBlocks(prev => prev.filter(b => b.id !== id))

    const { error } = await supabase.from('time_blocks').delete().eq('id', id)
    if (error) {
      if (previous) setTimeBlocks(prev => [...prev, previous].sort((a, b) => a.start_min - b.start_min))
      storeError('deleteTimeBlock', error, `id=${id}`)
    }
  }

  const setMIT = async (date: string, ref: { project_id?: string | null; checklist_item_id?: string | null; label?: string | null }) => {
    if (!user) return
    const existing = timeBlocks.filter(b => b.is_mit && b.date === date && b.persona === persona)
    for (const b of existing) {
      await supabase.from('time_blocks').update({ is_mit: false }).eq('id', b.id)
    }
    setTimeBlocks(prev => prev.map(b =>
      b.is_mit && b.date === date && b.persona === persona ? { ...b, is_mit: false } : b
    ))
    await addTimeBlock({
      date,
      start_min: 9 * 60,
      end_min: 10 * 60,
      label: ref.label ?? null,
      project_id: ref.project_id ?? null,
      checklist_item_id: ref.checklist_item_id ?? null,
      is_mit: true,
    })
  }

  const exportAllData = async () => {
    const allChannels: Record<string, object> = {}
    for (const ch of channels) {
      const [p, s] = await Promise.all([
        supabase.from('projects').select('*').eq('channel_id', ch.id).is('archived_at', null),
        supabase.from('timer_sessions').select('*').eq('channel_id', ch.id).is('archived_at', null),
      ])
      if (p.error) console.error('[store.exportAllData] projects fetch failed for channel', ch.name, p.error)
      if (s.error) console.error('[store.exportAllData] sessions fetch failed for channel', ch.name, s.error)
      allChannels[ch.name] = { channel: ch, projects: p.data ?? [], sessions: s.data ?? [] }
    }
    const [e, i, n, cl] = await Promise.all([
      supabase.from('expenses').select('*').eq('user_id', user!.id).is('archived_at', null),
      supabase.from('income').select('*').eq('user_id', user!.id).is('archived_at', null),
      supabase.from('notes').select('*').eq('user_id', user!.id).is('archived_at', null),
      supabase.from('checklist_items').select('*').eq('user_id', user!.id).is('archived_at', null),
    ])
    if (e.error) console.error('[store.exportAllData] expenses fetch failed', e.error)
    if (i.error) console.error('[store.exportAllData] income fetch failed', i.error)
    if (n.error) console.error('[store.exportAllData] notes fetch failed', n.error)
    if (cl.error) console.error('[store.exportAllData] checklist fetch failed', cl.error)
    return {
      exported_at: new Date().toISOString(), channels: allChannels,
      expenses: e.data ?? [], income: i.data ?? [], notes: n.data ?? [],
      checklist: cl.data ?? [],
      settings: { conversion_rate: conversionRate },
    }
  }

  return (
    <StoreContext.Provider value={{
      user, userRole, profile, authLoading, signIn, signOut,
      channels, activeChannel, switchChannel, addChannel, updateChannel, deleteChannel,
      teamMembers, inviteTeamMember, refreshTeamMembers,
      projects, sessions, editorOutputs,
      allProjects, allSessions,
      expenses, income, notes, checklistItems, checklistTemplates,
      conversionRate, dataLoading, fetchError, retryFetch,
      addProject, updateProject, deleteProject,
      addExpense, deleteExpense, addIncome, deleteIncome, addSession,
      addNote, updateNote, deleteNote,
      addChecklistItem, updateChecklistItem, deleteChecklistItem,
      addChecklistTemplate, updateChecklistTemplate, deleteChecklistTemplate, applyDailyTemplate,
      addEditorOutput, updateEditorOutput, deleteEditorOutput, fetchEditorOutputs,
      setConversionRate, exportAllData,
      persona, setPersona,
      timeBlocks, fetchTimeBlocks, addTimeBlock, updateTimeBlock, deleteTimeBlock, setMIT,
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export const useStore = () => useContext(StoreContext)
