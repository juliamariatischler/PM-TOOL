create table if not exists public.microsoft_connections (
  user_id uuid primary key references public.users(id) on delete cascade,
  email text,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  drive_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists microsoft_connections_set_updated_at on public.microsoft_connections;
create trigger microsoft_connections_set_updated_at
before update on public.microsoft_connections
for each row
execute function public.set_updated_at();

alter table public.microsoft_connections enable row level security;

drop policy if exists "users can read own microsoft connection" on public.microsoft_connections;
create policy "users can read own microsoft connection"
on public.microsoft_connections
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can write own microsoft connection" on public.microsoft_connections;
create policy "users can write own microsoft connection"
on public.microsoft_connections
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
