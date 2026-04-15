# Database & migrations

Postgres on Supabase. All tables are RLS-gated on `auth.uid() = user_id`.

---

## Migrations

Migrations live in `supabase/migrations/` and run in filename order.
**Never edit a shipped migration** — add a new one.

| # | File | What it does |
|---|---|---|
| 001 | `initial.sql` | Core tables: projects, channels, sessions |
| 002 | `notes.sql` | Saved notes + labels |
| 003 | `control_tower.sql` | Deals + finance tables |
| 004 | `archive_system.sql` | Soft-delete + archived views |
| 005 | `roles.sql` | `owner` / `editor` / `admin` roles on profile |
| 006 | `security_hardening.sql` | Tighter RLS on finance tables |
| 007 | `lock_profile_role.sql` | Role is trigger-managed, not user-writable |
| 008 | `fix_owner_roles.sql` | Backfill owner on existing profiles |
| 009 | `checklist_templates.sql` | Recurring daily task templates |
| 010 | `editor_outputs.sql` | Daily ship log |
| 011 | `profiles_email.sql` | Store email for PA visibility |
| 012 | `fix_invite_system.sql` | Fix `auto_create_profile` display_name regression |
| 013 | `fix_profile_column_name.sql` | Rename to match API expectations |
| 014 | `aggregate_indexes.sql` | Composite indexes for Dashboard aggregates |
| 015 | `time_blocks.sql` | Today planner: time-blocked day schedule |
| 016 | `project_format.sql` | `format` column on projects (reel / carousel / text) |
| 017 | `security_fixes.sql` | Reset auto_create_profile default role to `editor`; add `WITH CHECK` to deals RLS |
| 018 | `project_updated_at.sql` | `updated_at` column + `set_updated_at` trigger |

---

## Running migrations

### Against Supabase cloud

Paste the file's SQL into **Supabase SQL Editor** and run. Migrations are
additive — safe to run twice where they use `IF NOT EXISTS`. If a migration
warns about destructive operations (e.g. SuperWhisper catching `DROP POLICY`),
that's expected for policy-rewrite migrations. Review and run.

### Against local dev

```bash
supabase start            # boot local stack
supabase db push          # run pending migrations
```

---

## RLS patterns

Standard shape for a user-owned table:

```sql
alter table foo enable row level security;

create policy foo_own_select on foo for select
  using (auth.uid() = user_id);

create policy foo_own_write on foo
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Both `USING` and `WITH CHECK` are required — `USING` alone leaves INSERT/UPDATE
open to user_id reassignment. (Migration 017 fixed this on `deals`.)

---

## Adding a new migration

1. Create `supabase/migrations/NNN_short_name.sql` (next available number).
2. Write idempotent SQL where possible (`CREATE TABLE IF NOT EXISTS`, etc).
3. Update this doc's migration table with a one-line summary.
4. Run it in Supabase SQL Editor and verify against a staging row.
5. Commit.

---

## Role model

- `owner` — Manu. Full write access to finances, admin surfaces.
- `editor` — PA. Read-only on finances, write on content.
- `admin` — legacy; should not be issued to new users. Migration 017 resets the default.

`AdminLock` component gates on passcode, not role — so the PA can still enter
finance views with the passcode, but the role determines who can mutate rows.
