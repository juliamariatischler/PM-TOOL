create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.spaces(id) on delete cascade,
  title text not null,
  icon text,
  position integer not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.saved_task_views (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.spaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  view_type text not null default 'table' check (view_type in ('table', 'board', 'list')),
  filters jsonb not null default '{}'::jsonb,
  columns jsonb not null default '[]'::jsonb,
  sort jsonb not null default '[]'::jsonb,
  group_by text,
  position integer not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.page_blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  block_type text not null check (block_type in ('text', 'shortcuts', 'links', 'task_view', 'stats')),
  title text not null,
  config jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  width text not null default 'half' check (width in ('full', 'half')),
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists pages_space_id_idx on public.pages(space_id);
create index if not exists saved_task_views_space_id_idx on public.saved_task_views(space_id);
create index if not exists saved_task_views_project_id_idx on public.saved_task_views(project_id);
create index if not exists page_blocks_page_id_idx on public.page_blocks(page_id);

drop trigger if exists pages_set_updated_at on public.pages;
create trigger pages_set_updated_at
before update on public.pages
for each row
execute function public.set_updated_at();

drop trigger if exists saved_task_views_set_updated_at on public.saved_task_views;
create trigger saved_task_views_set_updated_at
before update on public.saved_task_views
for each row
execute function public.set_updated_at();

drop trigger if exists page_blocks_set_updated_at on public.page_blocks;
create trigger page_blocks_set_updated_at
before update on public.page_blocks
for each row
execute function public.set_updated_at();

alter table public.pages enable row level security;
alter table public.saved_task_views enable row level security;
alter table public.page_blocks enable row level security;

drop policy if exists "authenticated can read pages" on public.pages;
create policy "authenticated can read pages"
on public.pages
for select
to authenticated
using (true);

drop policy if exists "authenticated can write pages" on public.pages;
create policy "authenticated can write pages"
on public.pages
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can read saved task views" on public.saved_task_views;
create policy "authenticated can read saved task views"
on public.saved_task_views
for select
to authenticated
using (true);

drop policy if exists "authenticated can write saved task views" on public.saved_task_views;
create policy "authenticated can write saved task views"
on public.saved_task_views
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can read page blocks" on public.page_blocks;
create policy "authenticated can read page blocks"
on public.page_blocks
for select
to authenticated
using (true);

drop policy if exists "authenticated can write page blocks" on public.page_blocks;
create policy "authenticated can write page blocks"
on public.page_blocks
for all
to authenticated
using (true)
with check (true);
