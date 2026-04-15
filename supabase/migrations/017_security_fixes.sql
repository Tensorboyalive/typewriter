-- 1) Regression fix from migration 013: auto_create_profile set default role to 'admin'.
--    Every new signup becomes admin. Reset to 'editor'.
create or replace function public.auto_create_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'editor'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2) deals table RLS missing WITH CHECK — lets users reassign user_id on INSERT/UPDATE
drop policy if exists "users_own_deals" on deals;
create policy "users_own_deals" on deals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
