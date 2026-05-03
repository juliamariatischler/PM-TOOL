create table if not exists public.task_approvals (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  approver_user_id uuid not null references public.users(id) on delete cascade,
  requested_by_user_id uuid references public.users(id) on delete set null,
  status text not null default 'pending',
  note text,
  decided_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (task_id, approver_user_id)
);

create table if not exists public.task_links (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  link_type text not null default 'internal',
  linked_task_id uuid references public.tasks(id) on delete cascade,
  title text not null,
  url text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists task_approvals_task_id_idx on public.task_approvals(task_id);
create index if not exists task_approvals_approver_user_id_idx on public.task_approvals(approver_user_id);
create index if not exists task_links_task_id_idx on public.task_links(task_id);
create index if not exists task_links_linked_task_id_idx on public.task_links(linked_task_id);

alter table public.task_approvals enable row level security;
alter table public.task_links enable row level security;

drop policy if exists "authenticated can read task approvals" on public.task_approvals;
create policy "authenticated can read task approvals"
on public.task_approvals
for select
to authenticated
using (true);

drop policy if exists "authenticated can write task approvals" on public.task_approvals;
create policy "authenticated can write task approvals"
on public.task_approvals
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can read task links" on public.task_links;
create policy "authenticated can read task links"
on public.task_links
for select
to authenticated
using (true);

drop policy if exists "authenticated can write task links" on public.task_links;
create policy "authenticated can write task links"
on public.task_links
for all
to authenticated
using (true)
with check (true);
