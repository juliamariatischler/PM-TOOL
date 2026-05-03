alter table public.tasks
  add column if not exists archived_at timestamptz,
  add column if not exists deleted_at timestamptz;

create index if not exists tasks_archived_at_idx on public.tasks(archived_at);
create index if not exists tasks_deleted_at_idx on public.tasks(deleted_at);
