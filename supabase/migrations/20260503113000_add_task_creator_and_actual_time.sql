alter table public.tasks
  add column if not exists created_by uuid references public.users(id) on delete set null,
  add column if not exists actual_time_minutes integer not null default 0,
  add column if not exists timer_started_at timestamptz;
