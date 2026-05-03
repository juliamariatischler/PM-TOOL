create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  avatar text,
  color text not null default '#6366f1',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#00B050',
  icon text,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  space_id uuid not null references public.spaces(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  folder_id uuid not null references public.folders(id) on delete cascade,
  color text not null default '#6366f1',
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'New',
  created_by uuid references public.users(id) on delete set null,
  assignee_id uuid references public.users(id) on delete set null,
  start_date timestamptz,
  due_date timestamptz,
  description text,
  parent_id uuid references public.tasks(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  position integer not null default 0,
  priority text not null default 'Medium',
  effort double precision not null default 0,
  actual_time_minutes integer not null default 0,
  timer_started_at timestamptz,
  planned_cost double precision not null default 0,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.task_comment_mentions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.task_comments(id) on delete cascade,
  mentioned_user_id uuid not null references public.users(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (comment_id, mentioned_user_id)
);

create table if not exists public.task_documents (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  provider text not null default 'microsoft',
  document_type text not null default 'file',
  title text not null,
  url text not null,
  created_at timestamptz not null default timezone('utc', now())
);

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

create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (task_id, user_id)
);

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

create index if not exists folders_space_id_idx on public.folders(space_id);
create index if not exists projects_folder_id_idx on public.projects(folder_id);
create index if not exists tasks_project_id_idx on public.tasks(project_id);
create index if not exists tasks_parent_id_idx on public.tasks(parent_id);
create index if not exists tasks_assignee_id_idx on public.tasks(assignee_id);
create index if not exists task_comments_task_id_idx on public.task_comments(task_id);
create index if not exists task_comment_mentions_user_id_idx on public.task_comment_mentions(mentioned_user_id);
create index if not exists task_comment_mentions_comment_id_idx on public.task_comment_mentions(comment_id);
create index if not exists task_documents_task_id_idx on public.task_documents(task_id);
create index if not exists task_approvals_task_id_idx on public.task_approvals(task_id);
create index if not exists task_approvals_approver_user_id_idx on public.task_approvals(approver_user_id);
create index if not exists task_links_task_id_idx on public.task_links(task_id);
create index if not exists task_links_linked_task_id_idx on public.task_links(linked_task_id);
create index if not exists task_assignees_user_id_idx on public.task_assignees(user_id);

drop trigger if exists spaces_set_updated_at on public.spaces;
create trigger spaces_set_updated_at
before update on public.spaces
for each row
execute function public.set_updated_at();

drop trigger if exists folders_set_updated_at on public.folders;
create trigger folders_set_updated_at
before update on public.folders
for each row
execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

drop trigger if exists microsoft_connections_set_updated_at on public.microsoft_connections;
create trigger microsoft_connections_set_updated_at
before update on public.microsoft_connections
for each row
execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.spaces enable row level security;
alter table public.folders enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_comment_mentions enable row level security;
alter table public.task_documents enable row level security;
alter table public.task_approvals enable row level security;
alter table public.task_links enable row level security;
alter table public.task_assignees enable row level security;
alter table public.microsoft_connections enable row level security;

drop policy if exists "users can read own profile" on public.users;
create policy "users can read own profile"
on public.users
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "users can update own profile" on public.users;
create policy "users can update own profile"
on public.users
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "authenticated can read spaces" on public.spaces;
create policy "authenticated can read spaces"
on public.spaces
for select
to authenticated
using (true);

drop policy if exists "authenticated can write spaces" on public.spaces;
create policy "authenticated can write spaces"
on public.spaces
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can read folders" on public.folders;
create policy "authenticated can read folders"
on public.folders
for select
to authenticated
using (true);

drop policy if exists "authenticated can write folders" on public.folders;
create policy "authenticated can write folders"
on public.folders
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can read projects" on public.projects;
create policy "authenticated can read projects"
on public.projects
for select
to authenticated
using (true);

drop policy if exists "authenticated can write projects" on public.projects;
create policy "authenticated can write projects"
on public.projects
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can read tasks" on public.tasks;
create policy "authenticated can read tasks"
on public.tasks
for select
to authenticated
using (true);

drop policy if exists "authenticated can write tasks" on public.tasks;
create policy "authenticated can write tasks"
on public.tasks
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can read task comments" on public.task_comments;
create policy "authenticated can read task comments"
on public.task_comments
for select
to authenticated
using (true);

drop policy if exists "authenticated can write task comments" on public.task_comments;
create policy "authenticated can write task comments"
on public.task_comments
for all
to authenticated
using (true)
with check (true);

drop policy if exists "users can read own mentions" on public.task_comment_mentions;
create policy "users can read own mentions"
on public.task_comment_mentions
for select
to authenticated
using (auth.uid() = mentioned_user_id);

drop policy if exists "users can update own mentions" on public.task_comment_mentions;
create policy "users can update own mentions"
on public.task_comment_mentions
for update
to authenticated
using (auth.uid() = mentioned_user_id)
with check (auth.uid() = mentioned_user_id);

drop policy if exists "authenticated can insert mentions" on public.task_comment_mentions;
create policy "authenticated can insert mentions"
on public.task_comment_mentions
for insert
to authenticated
with check (true);

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
