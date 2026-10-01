create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date not null,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.expenses to anon;
grant all on public.expenses to service_role;

alter table public.expenses enable row level security;

create policy "Personal single-user access"
  on public.expenses
  for all
  to anon
  using (true)
  with check (true);