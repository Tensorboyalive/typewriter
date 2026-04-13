# Typewriter Control Tower — Final Review Implementation

> Date: 2026-04-13 | Based on: Typewriter_Final_Review.md + user feedback

## Changes (Prioritized)

### User-Requested Changes
1. **Kanban board toggle** — Add view switcher (List | Board) to Pipeline. Board = columns per status, fit to page.
2. **BankItemEditor clean UI** — Match NoteEditor: transparent bg, no card box, open writing space.
3. **Rename channel** — "The manav gupta" → "tensorboy" via Supabase.
4. **Output page** — Standalone `/output` where editors log daily output + live links. All roles can view.

### P0 (Review Doc)
5. **Daily Template System** — `checklist_templates` table + "Apply Template" in Checklist + template management in Settings.
6. **Platform filter pills** — Pipeline: filter by PLATFORMS. Content Bank: filter by BANK_PLATFORMS.
7. **Fix Invite System** — Add `email` column to profiles, update invite to query by email instead of admin API.

### P1 (Review Doc)
8. **Quick-assign on Pipeline cards** — Dropdown on Kanban cards for admin/PA to assign editors.
9. **Deals page** — `/deals` route with list view grouped by DEAL_STAGES. CRUD via store.
10. **Calendar shows Content Bank** — Render scheduled bank items alongside projects.

## New Migrations

### 009_checklist_templates.sql
- `checklist_templates` table: id, user_id, title, category, sort_order, is_active

### 010_editor_outputs.sql
- `editor_outputs` table: id, user_id, channel_id, date, description, live_link, created_at

### 011_profiles_email.sql
- `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT`

## New Components
- `EditorOutput.tsx` — Output log page
- `Deals.tsx` — Deal pipeline page (types already exist)

## Modified Components
- `Kanban.tsx` — View toggle + platform filter + quick-assign
- `BankItemEditor.tsx` — Clean transparent style
- `ContentBank.tsx` — Platform filter pills
- `Calendar.tsx` — Show bank items
- `Checklist.tsx` — Apply Template button (replace Auto-fill)
- `Settings.tsx` — Template management section
- `Layout.tsx` — New nav items (Output, Deals)
- `App.tsx` — New routes

## Nav Structure (by role)
| Route | Admin | PA | Editor |
|-------|-------|----|--------|
| Home | ✓ | ✓ | ✓ |
| Calendar | ✓ | ✓ | ✓ |
| Pipeline | ✓ | ✓ | — |
| Queue | — | — | ✓ |
| Content Bank | ✓ | ✓ | — |
| Checklist | ✓ | ✓ | — |
| Output | ✓ | ✓ | ✓ |
| Deals | ✓ | — | — |
| Expenses | ✓ | — | — |
| Saved | ✓ | ✓ | — |
| Settings | ✓ | ✓ | ✓ |
