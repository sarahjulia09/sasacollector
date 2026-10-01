-- Perfis: login por nome de usuário (multiusuário)
create table public.profiles (
  id uuid primary key,
  username text not null unique,
  created_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Gastos passam a pertencer a um usuário
alter table public.expenses add column user_id uuid;
create index expenses_user_id_idx on public.expenses (user_id);

drop policy "Personal single-user access" on public.expenses;

grant select, insert, update, delete on public.expenses to authenticated;
grant all on public.expenses to service_role;
revoke all on public.expenses from anon;

alter table public.expenses enable row level security;

create policy "expenses_select_own" on public.expenses
  for select to authenticated using (auth.uid() = user_id);
create policy "expenses_insert_own" on public.expenses
  for insert to authenticated with check (auth.uid() = user_id);
create policy "expenses_update_own" on public.expenses
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "expenses_delete_own" on public.expenses
  for delete to authenticated using (auth.uid() = user_id);