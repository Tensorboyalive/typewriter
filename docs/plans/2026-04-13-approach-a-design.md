# Approach A: Missing PRD Features Design

## Scope
Cover all P0 + P1 gaps that block real 4-person team usage.

## 1. Assignment UI in ScriptEditor
- Collapsible "Team & Delivery" section below the script textarea
- Assign-to dropdown (populated from team_members for active channel)
- Deadline date picker
- Delivery link input (editor fills after completing work)
- Posted link input (admin/PA fills after publishing)
- Status auto-transitions: assigning sets "assigned", delivery link sets "in_edit"

## 2. Editor Queue (/queue)
- Filtered pipeline: projects WHERE assigned_to = current user
- Same vertical list style as Pipeline (consistency)
- Shows: title, type, platform, deadline, status
- "Submit Delivery" inline action per row
- Editors see this in nav; replaces Pipeline for them

## 3. Role-aware Dashboard
- Admin: full dashboard (current)
- PA: hide Finances, add "Editor Status" section showing assigned/delivered counts
- Editor: replace pipeline/finances with "My Tasks" card + "Upcoming Deadlines" list

## 4. Invite Flow Fix
- Look up user by email via profiles table
- Create team_member entry with selected role
- Show success/error feedback
- Refresh team member list

## 5. Checklist Auto-fill
- "Auto-fill" button on Checklist page
- Creates items from today's scheduled projects (one per project)
- Adds to "content" category
- Skips duplicates (checks if item with same project_id already exists)

## 6. EOD Summary
- Collapsible "Today's Recap" at bottom of Checklist
- Shows: X done, Y pending, Z skipped
- Simple progress indicator, no email/notification

## Design Principles
- Extend existing patterns (vertical lists, pill selectors, full-page editors)
- No new UI paradigms
- Dead simple, no bloat
