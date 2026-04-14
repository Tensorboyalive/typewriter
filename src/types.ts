export type ContentType = 'reel' | 'story' | 'post' | 'carousel' | 'thread' | 'article' | 'youtube' | 'short'
export type ProjectStatus = 'idea' | 'scripted' | 'assigned' | 'in_edit' | 'ready' | 'posted'
export type Platform = 'tb' | 'tmg' | 'linkedin' | 'twitter' | 'youtube' | 'substack' | 'cevi'
export type TimeSlot = 'morning' | 'afternoon' | 'evening'

export const STATUSES: { id: ProjectStatus; label: string }[] = [
  { id: 'idea', label: 'Ideas' },
  { id: 'scripted', label: 'Scripted' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'in_edit', label: 'In Edit' },
  { id: 'ready', label: 'Ready' },
  { id: 'posted', label: 'Posted' },
]

export const CONTENT_TYPES: { id: ContentType; label: string; color: string }[] = [
  { id: 'reel', label: 'Reel', color: '#8b5cf6' },
  { id: 'story', label: 'Story', color: '#f59e0b' },
  { id: 'post', label: 'Post', color: '#3b82f6' },
  { id: 'carousel', label: 'Carousel', color: '#10b981' },
  { id: 'thread', label: 'Thread', color: '#ec4899' },
  { id: 'article', label: 'Article', color: '#6366f1' },
  { id: 'youtube', label: 'YouTube', color: '#ef4444' },
  { id: 'short', label: 'Short', color: '#f97316' },
]

export const PLATFORMS: { id: Platform; label: string; color: string }[] = [
  { id: 'tb', label: 'TB', color: '#8b5cf6' },
  { id: 'tmg', label: 'TMG', color: '#ec4899' },
  { id: 'linkedin', label: 'LinkedIn', color: '#0a66c2' },
  { id: 'twitter', label: 'Twitter', color: '#1d9bf0' },
  { id: 'youtube', label: 'YouTube', color: '#ef4444' },
  { id: 'substack', label: 'Substack', color: '#ff6719' },
  { id: 'cevi', label: 'Cevi', color: '#10b981' },
]

export interface Channel {
  id: string
  user_id: string
  name: string
  handle: string
  niche: string
  created_at: string
}

export interface Project {
  id: string
  channel_id: string
  user_id: string
  title: string
  type: ContentType
  status: ProjectStatus
  platform: Platform
  scheduled_date: string | null
  script: string
  description: string
  assigned_to: string | null
  assigned_by: string | null
  deadline: string | null
  time_slot: TimeSlot | null
  delivery_link: string | null
  delivered_at: string | null
  posted_link: string | null
  posted_at: string | null
  is_brand_deal: boolean
  deal_id: string | null
  created_at: string
}

export interface Expense {
  id: string
  channel_id: string
  user_id: string
  project_id: string | null
  description: string
  amount: number
  category: string
  date: string
}

export const EXPENSE_CATEGORIES = [
  'Equipment',
  'Travel',
  'Talent',
  'Software',
  'Marketing',
  'Food',
  'Other',
]

export interface Income {
  id: string
  channel_id: string
  user_id: string
  project_id: string | null
  description: string
  amount: number
  source: string
  date: string
}

export interface TimerSession {
  id: string
  channel_id: string
  user_id: string
  duration: number
  completed_at: string
}

export const INCOME_SOURCES = [
  'Brand Deal',
  'Collaboration',
  'Sponsorship',
  'Freelance',
  'Other',
]

export type NoteLabel = 'Hook' | 'Prompt' | 'Idea' | 'Reference' | 'Quote'

export const NOTE_LABELS: { id: NoteLabel; label: string; color: string }[] = [
  { id: 'Hook', label: 'Hook', color: '#ef4444' },
  { id: 'Prompt', label: 'Prompt', color: '#8b5cf6' },
  { id: 'Idea', label: 'Idea', color: '#3b82f6' },
  { id: 'Reference', label: 'Reference', color: '#f59e0b' },
  { id: 'Quote', label: 'Quote', color: '#10b981' },
]

export interface Note {
  id: string
  channel_id: string
  user_id: string
  title: string
  content: string
  label: NoteLabel
  pinned: boolean
  created_at: string
  updated_at: string
}

// ─── Roles ──────────────────────────────────────────────
export type UserRole = 'admin' | 'pa' | 'editor'

export interface TeamMember {
  id: string
  user_id: string
  channel_id: string
  role: UserRole
  invited_by: string | null
  created_at: string
}

export interface Profile {
  id: string
  display_name: string
  role: UserRole
  avatar_url: string | null
  email: string | null
  created_at: string
  updated_at: string
}

// ─── Control Tower v2 types ──────────────────────────────

export type BankPlatform = 'linkedin' | 'twitter' | 'substack' | 'carousel' | 'cevi' | 'butterfly'
export type BankStatus = 'draft' | 'approved' | 'scheduled' | 'posted' | 'expired'

export const BANK_PLATFORMS: { id: BankPlatform; label: string; color: string }[] = [
  { id: 'linkedin', label: 'LinkedIn', color: '#0a66c2' },
  { id: 'twitter', label: 'Twitter', color: '#1d9bf0' },
  { id: 'substack', label: 'Substack', color: '#ff6719' },
  { id: 'carousel', label: 'Carousel', color: '#10b981' },
  { id: 'cevi', label: 'Cevi', color: '#10b981' },
  { id: 'butterfly', label: 'Butterfly', color: '#8b5cf6' },
]

export interface ContentBankItem {
  id: string
  user_id: string
  platform: BankPlatform
  content_text: string
  status: BankStatus
  scheduled_date: string | null
  posted_link: string | null
  posted_at: string | null
  metrics_views: number | null
  metrics_likes: number | null
  metrics_saves: number | null
  created_at: string
  updated_at: string
}

export type ChecklistCategory = 'content' | 'engagement' | 'butterfly' | 'editor' | 'custom'
export type ChecklistStatus = 'pending' | 'done' | 'skipped' | 'blocked'

export const CHECKLIST_CATEGORIES: { id: ChecklistCategory; label: string; color: string }[] = [
  { id: 'content', label: 'Content', color: '#3b82f6' },
  { id: 'engagement', label: 'Engagement', color: '#10b981' },
  { id: 'butterfly', label: 'Butterfly', color: '#8b5cf6' },
  { id: 'editor', label: 'Editor', color: '#f59e0b' },
  { id: 'custom', label: 'Custom', color: '#6b7280' },
]

export interface ChecklistItem {
  id: string
  user_id: string
  date: string
  title: string
  category: ChecklistCategory
  status: ChecklistStatus
  completed_at: string | null
  skip_reason: string | null
  project_id: string | null
  is_recurring: boolean
  created_at: string
}

export type DealSource = 'butterfly' | 'inbound' | 'referral' | 'event'
export type DealStage = 'lead' | 'replied' | 'pitched' | 'agreed' | 'delivered' | 'paid' | 'dead'
export type InvoiceStatus = 'not_sent' | 'sent' | 'paid'

export const DEAL_STAGES: { id: DealStage; label: string; color: string }[] = [
  { id: 'lead', label: 'Lead', color: '#94a3b8' },
  { id: 'replied', label: 'Replied', color: '#3b82f6' },
  { id: 'pitched', label: 'Pitched', color: '#f59e0b' },
  { id: 'agreed', label: 'Agreed', color: '#8b5cf6' },
  { id: 'delivered', label: 'Delivered', color: '#10b981' },
  { id: 'paid', label: 'Paid', color: '#059669' },
  { id: 'dead', label: 'Dead', color: '#ef4444' },
]

export const DEAL_SOURCES: { id: DealSource; label: string }[] = [
  { id: 'butterfly', label: 'Butterfly' },
  { id: 'inbound', label: 'Inbound' },
  { id: 'referral', label: 'Referral' },
  { id: 'event', label: 'Event' },
]

export interface Deal {
  id: string
  user_id: string
  channel_id: string
  company: string
  contact_name: string
  contact_email: string | null
  source: DealSource
  stage: DealStage
  value_amount: number
  value_currency: 'INR' | 'USD'
  deliverables: string | null
  deadline: string | null
  invoice_status: InvoiceStatus
  notes: string | null
  created_at: string
  updated_at: string
}

// ─── Checklist Templates ────────────────────────────────
export interface ChecklistTemplate {
  id: string
  user_id: string
  title: string
  category: ChecklistCategory
  sort_order: number
  is_active: boolean
  created_at: string
}

// ─── Time Blocks (Today view) ───────────────────────────
export type Persona = 'you' | 'pa'

export const PERSONAS: { id: Persona; label: string }[] = [
  { id: 'you', label: 'You' },
  { id: 'pa', label: 'PA' },
]

export interface TimeBlock {
  id: string
  user_id: string
  persona: Persona
  date: string            // YYYY-MM-DD local
  start_min: number       // minutes from 00:00
  end_min: number
  label: string | null
  project_id: string | null
  checklist_item_id: string | null
  is_mit: boolean
  created_at: string
}

// ─── Editor Output ──────────────────────────────────────
export interface EditorOutput {
  id: string
  user_id: string
  channel_id: string
  date: string
  description: string
  live_link: string | null
  created_at: string
}
