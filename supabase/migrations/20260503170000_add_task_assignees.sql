create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (task_id, user_id)
);

create index if not exists task_assignees_user_id_idx on public.task_assignees(user_id);

insert into public.task_assignees (task_id, user_id)
select id, assignee_id
from public.tasks
where assignee_id is not null
on conflict (task_id, user_id) do nothing;

alter table public.task_assignees enable row level security;

drop policy if exists "authenticated can read task assignees" on public.task_assignees;
create policy "authenticated can read task assignees"
on public.task_assignees
for select
to authenticated
using (true);

drop policy if exists "authenticated can write task assignees" on public.task_assignees;
create policy "authenticated can write task assignees"
on public.task_assignees
for all
to authenticated
using (true)
with check (true);
