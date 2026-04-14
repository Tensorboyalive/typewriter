-- 015_time_blocks.sql
-- Time blocking for /today view. Independent MIT per persona (you / PA share login,
-- so persona is an app-level string column, not an auth user). Both rows live under
-- the same auth.users row; RLS keeps them scoped to the logged-in account.

create table if not exists time_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona text not null default 'you' check (persona in ('you', 'pa')),
  date date not null,
  start_min int not null check (start_min >= 0 and start_min < 1440),
  end_min int not null check (end_min > start_min and end_min <= 1440),
  label text,
  project_id uuid references projects(id) on delete set null,
  checklist_item_id uuid references checklist_items(id) on delete set null,
  is_mit boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_time_blocks_user_date on time_blocks(user_id, date);
create index if not exists idx_time_blocks_persona on time_blocks(user_id, persona, date);

alter table time_blocks enable row level security;

create policy "time_blocks_select_own" on time_blocks
  for select using (auth.uid() = user_id);

create policy "time_blocks_insert_own" on time_blocks
  for insert with check (auth.uid() = user_id);

create policy "time_blocks_update_own" on time_blocks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "time_blocks_delete_own" on time_blocks
  for delete using (auth.uid() = user_id);
