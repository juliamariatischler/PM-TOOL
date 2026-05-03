create table if not exists public.task_documents (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  provider text not null default 'microsoft',
  document_type text not null default 'file',
  title text not null,
  url text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists task_documents_task_id_idx on public.task_documents(task_id);

alter table public.task_documents enable row level security;

drop policy if exists "authenticated can read task documents" on public.task_documents;
create policy "authenticated can read task documents"
on public.task_documents
for select
to authenticated
using (true);

drop policy if exists "authenticated can write task documents" on public.task_documents;
create policy "authenticated can write task documents"
on public.task_documents
for all
to authenticated
using (true)
with check (true);
