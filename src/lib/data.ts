import type { Folder, InboxItem, Project, Space, Task, TaskComment, User } from "@/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type DbUserRow = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  color: string;
  created_at: string;
};

type DbSpaceRow = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

type DbFolderRow = {
  id: string;
  name: string;
  space_id: string;
  position: number;
  created_at: string;
  updated_at: string;
};

type DbProjectRow = {
  id: string;
  name: string;
  folder_id: string;
  position: number;
  color: string;
  created_at: string;
  updated_at: string;
};

type DbTaskRow = {
  id: string;
  title: string;
  status: string;
  assignee_id: string | null;
  start_date: string | null;
  due_date: string | null;
  description: string | null;
  parent_id: string | null;
  project_id: string;
  position: number;
  priority: string;
  effort: number;
  planned_cost: number;
  created_at: string;
  updated_at: string;
};

type DbCommentRow = {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

type DbCommentMentionRow = {
  id: string;
  comment_id: string;
  mentioned_user_id: string;
  read_at: string | null;
  created_at: string;
};

function mapUser(row: DbUserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar: row.avatar,
    color: row.color,
    createdAt: row.created_at,
  };
}

function mapTask(row: DbTaskRow, usersById: Map<string, User>): Task {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    assigneeId: row.assignee_id,
    assignee: row.assignee_id ? usersById.get(row.assignee_id) ?? null : null,
    startDate: row.start_date,
    dueDate: row.due_date,
    description: row.description,
    parentId: row.parent_id,
    subtasks: [],
    projectId: row.project_id,
    position: row.position,
    priority: row.priority,
    effort: row.effort,
    plannedCost: row.planned_cost,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeMentionToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getUserMentionKeys(user: User) {
  const fullName = normalizeMentionToken(user.name);
  const firstName = normalizeMentionToken(user.name.split(/\s+/)[0] ?? "");
  const emailName = normalizeMentionToken(user.email.split("@")[0] ?? "");
  return Array.from(new Set([fullName, firstName, emailName].filter(Boolean)));
}

function findMentionedUsers(body: string, users: User[]) {
  const tokens = Array.from(body.matchAll(/@([a-zA-Z0-9._-]+)/g), (match) =>
    normalizeMentionToken(match[1] ?? "")
  );
  if (tokens.length === 0) return [];

  return users.filter((user) => {
    const keys = getUserMentionKeys(user);
    return tokens.some((token) => keys.includes(token));
  });
}

function sortTaskTree(tasks: Task[]) {
  tasks.sort((a, b) => a.position - b.position);
  for (const task of tasks) {
    sortTaskTree(task.subtasks);
  }
}

function buildTaskTree(rows: DbTaskRow[], usersById: Map<string, User>) {
  const tasksById = new Map<string, Task>();
  const roots: Task[] = [];

  for (const row of rows) {
    tasksById.set(row.id, mapTask(row, usersById));
  }

  for (const row of rows) {
    const task = tasksById.get(row.id);
    if (!task) continue;

    if (row.parent_id) {
      const parent = tasksById.get(row.parent_id);
      if (parent) {
        parent.subtasks.push(task);
        continue;
      }
    }

    roots.push(task);
  }

  sortTaskTree(roots);
  return { roots, tasksById };
}

function findTaskInTree(tasks: Task[], id: string): Task | null {
  for (const task of tasks) {
    if (task.id === id) return task;
    const child = findTaskInTree(task.subtasks, id);
    if (child) return child;
  }
  return null;
}

async function runQuery<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const { data, error } = await promise;
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

function ensurePresent<T>(value: T | null, message: string): T {
  if (value === null) {
    throw new Error(message);
  }
  return value;
}

export async function listUsers() {
  const admin = getSupabaseAdminClient();
  const rows = await runQuery<DbUserRow[]>(
    admin
      .from("users")
      .select("id, name, email, avatar, color, created_at")
      .order("name", { ascending: true })
  );

  return (rows ?? []).map((row) => mapUser(row as DbUserRow));
}

export async function listTaskComments(taskId: string) {
  const admin = getSupabaseAdminClient();
  const [comments, mentions, users] = await Promise.all([
    runQuery<DbCommentRow[]>(
      admin
        .from("task_comments")
        .select("id, task_id, author_id, body, created_at")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true })
    ),
    runQuery<DbCommentMentionRow[]>(
      admin
        .from("task_comment_mentions")
        .select("id, comment_id, mentioned_user_id, read_at, created_at")
    ),
    listUsers(),
  ]);

  const usersById = new Map(users.map((user) => [user.id, user]));
  const mentionsByCommentId = new Map<string, User[]>();

  for (const mention of mentions ?? []) {
    const mentionedUser = usersById.get(mention.mentioned_user_id);
    if (!mentionedUser) continue;
    const list = mentionsByCommentId.get(mention.comment_id) ?? [];
    list.push(mentionedUser);
    mentionsByCommentId.set(mention.comment_id, list);
  }

  return (comments ?? [])
    .map((comment) => {
      const author = usersById.get(comment.author_id);
      if (!author) return null;

      return {
        id: comment.id,
        taskId: comment.task_id,
        body: comment.body,
        createdAt: comment.created_at,
        author,
        mentions: mentionsByCommentId.get(comment.id) ?? [],
      } satisfies TaskComment;
    })
    .filter((comment): comment is TaskComment => comment !== null);
}

export async function createTaskComment(input: {
  taskId: string;
  authorId: string;
  body: string;
}) {
  const admin = getSupabaseAdminClient();
  const users = await listUsers();
  const usersById = new Map(users.map((user) => [user.id, user]));
  const author = usersById.get(input.authorId);

  if (!author) {
    throw new Error("Comment author not found");
  }

  const insertedComment = ensurePresent(
    await runQuery<DbCommentRow>(
      admin
        .from("task_comments")
        .insert({
          task_id: input.taskId,
          author_id: input.authorId,
          body: input.body,
        })
        .select("id, task_id, author_id, body, created_at")
        .single()
    ),
    "Unable to create comment"
  );

  const mentionedUsers = findMentionedUsers(input.body, users).filter((user) => user.id !== input.authorId);

  if (mentionedUsers.length > 0) {
    await runQuery(
      admin
        .from("task_comment_mentions")
        .insert(
          mentionedUsers.map((user) => ({
            comment_id: insertedComment.id,
            mentioned_user_id: user.id,
          }))
        )
        .select("id")
    );
  }

  return {
    id: insertedComment.id,
    taskId: insertedComment.task_id,
    body: insertedComment.body,
    createdAt: insertedComment.created_at,
    author,
    mentions: mentionedUsers,
  } satisfies TaskComment;
}

export async function listInboxItems(userId: string) {
  const admin = getSupabaseAdminClient();
  const [mentionRows, commentRows, taskRows, projectRows, folderRows, spaceRows, users] = await Promise.all([
    runQuery<DbCommentMentionRow[]>(
      admin
        .from("task_comment_mentions")
        .select("id, comment_id, mentioned_user_id, read_at, created_at")
        .eq("mentioned_user_id", userId)
        .order("created_at", { ascending: false })
    ),
    runQuery<DbCommentRow[]>(
      admin
        .from("task_comments")
        .select("id, task_id, author_id, body, created_at")
    ),
    runQuery<DbTaskRow[]>(
      admin
        .from("tasks")
        .select("id, title, status, assignee_id, start_date, due_date, description, parent_id, project_id, position, priority, effort, planned_cost, created_at, updated_at")
    ),
    runQuery<DbProjectRow[]>(
      admin
        .from("projects")
        .select("id, name, folder_id, position, color, created_at, updated_at")
    ),
    runQuery<DbFolderRow[]>(
      admin
        .from("folders")
        .select("id, name, space_id, position, created_at, updated_at")
    ),
    runQuery<DbSpaceRow[]>(
      admin
        .from("spaces")
        .select("id, name, color, icon, position, created_at, updated_at")
    ),
    listUsers(),
  ]);

  const usersById = new Map(users.map((user) => [user.id, user]));
  const commentsById = new Map((commentRows ?? []).map((comment) => [comment.id, comment]));
  const tasksById = new Map((taskRows ?? []).map((task) => [task.id, task]));
  const projectsById = new Map((projectRows ?? []).map((project) => [project.id, project]));
  const foldersById = new Map((folderRows ?? []).map((folder) => [folder.id, folder]));
  const spacesById = new Map((spaceRows ?? []).map((space) => [space.id, space]));

  return (mentionRows ?? [])
    .map((mention) => {
      const comment = commentsById.get(mention.comment_id);
      if (!comment) return null;
      const author = usersById.get(comment.author_id);
      if (!author) return null;
      const task = tasksById.get(comment.task_id);
      if (!task) return null;
      const project = projectsById.get(task.project_id);
      if (!project) return null;
      const folder = foldersById.get(project.folder_id);
      if (!folder) return null;
      const space = spacesById.get(folder.space_id);
      if (!space) return null;

      return {
        id: mention.id,
        commentId: comment.id,
        taskId: task.id,
        taskTitle: task.title,
        projectName: project.name,
        folderName: folder.name,
        spaceName: space.name,
        commentBody: comment.body,
        createdAt: mention.created_at,
        author,
        readAt: mention.read_at,
      } satisfies InboxItem;
    })
    .filter((item): item is InboxItem => item !== null);
}

export async function markInboxItemRead(mentionId: string, userId: string) {
  const admin = getSupabaseAdminClient();
  const updated = await runQuery<DbCommentMentionRow>(
    admin
      .from("task_comment_mentions")
      .update({ read_at: new Date().toISOString() })
      .eq("id", mentionId)
      .eq("mentioned_user_id", userId)
      .select("id, comment_id, mentioned_user_id, read_at, created_at")
      .single()
  );

  return ensurePresent(updated, "Unable to mark inbox item as read");
}

export async function createUser(input: {
  name: string;
  email: string;
  color?: string | null;
  avatar?: string | null;
  password?: string | null;
}) {
  const admin = getSupabaseAdminClient();
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  const existing = await runQuery<{ id: string } | null>(
    admin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle()
  );

  if (existing) {
    throw new Error("User already exists");
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: input.password?.trim() || `PmTool-${Math.random().toString(36).slice(2)}!`,
    email_confirm: true,
    user_metadata: { name },
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? "Unable to create auth user");
  }

  const profile = await runQuery<DbUserRow>(
    admin
      .from("users")
      .insert({
        id: authData.user.id,
        name,
        email,
        avatar: input.avatar ?? null,
        color: input.color ?? "#6366f1",
      })
      .select("id, name, email, avatar, color, created_at")
      .single()
  );

  return mapUser(ensurePresent(profile, "Unable to create profile"));
}

export async function listWorkspace() {
  const admin = getSupabaseAdminClient();
  const [spaceRows, folderRows, projectRows, taskRows, users] = await Promise.all([
    runQuery<DbSpaceRow[]>(
      admin
        .from("spaces")
        .select("id, name, color, icon, position, created_at, updated_at")
        .order("position", { ascending: true })
    ),
    runQuery<DbFolderRow[]>(
      admin
        .from("folders")
        .select("id, name, space_id, position, created_at, updated_at")
        .order("position", { ascending: true })
    ),
    runQuery<DbProjectRow[]>(
      admin
        .from("projects")
        .select("id, name, folder_id, position, color, created_at, updated_at")
        .order("position", { ascending: true })
    ),
    runQuery<DbTaskRow[]>(
      admin
        .from("tasks")
        .select("id, title, status, assignee_id, start_date, due_date, description, parent_id, project_id, position, priority, effort, planned_cost, created_at, updated_at")
        .order("project_id", { ascending: true })
        .order("position", { ascending: true })
    ),
    listUsers(),
  ]);

  const usersById = new Map(users.map((user) => [user.id, user]));
  const taskRowsByProject = new Map<string, DbTaskRow[]>();

  for (const row of taskRows ?? []) {
    const list = taskRowsByProject.get(row.project_id) ?? [];
    list.push(row);
    taskRowsByProject.set(row.project_id, list);
  }

  const projectsByFolder = new Map<string, Project[]>();
  for (const row of projectRows ?? []) {
    const { roots } = buildTaskTree(taskRowsByProject.get(row.id) ?? [], usersById);
    const project: Project = {
      id: row.id,
      name: row.name,
      folderId: row.folder_id,
      color: row.color,
      position: row.position,
      tasks: roots,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    const list = projectsByFolder.get(row.folder_id) ?? [];
    list.push(project);
    projectsByFolder.set(row.folder_id, list);
  }

  const foldersBySpace = new Map<string, Folder[]>();
  for (const row of folderRows ?? []) {
    const folder: Folder = {
      id: row.id,
      name: row.name,
      spaceId: row.space_id,
      position: row.position,
      projects: projectsByFolder.get(row.id) ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    const list = foldersBySpace.get(row.space_id) ?? [];
    list.push(folder);
    foldersBySpace.set(row.space_id, list);
  }

  return (spaceRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    position: row.position,
    folders: foldersBySpace.get(row.id) ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } satisfies Space));
}

export async function getTaskDetail(id: string) {
  const admin = getSupabaseAdminClient();
  const taskRow = await runQuery<DbTaskRow | null>(
    admin
      .from("tasks")
      .select("id, title, status, assignee_id, start_date, due_date, description, parent_id, project_id, position, priority, effort, planned_cost, created_at, updated_at")
      .eq("id", id)
      .maybeSingle()
  );

  if (!taskRow) return null;

  const [projectRow, users, taskRows, comments] = await Promise.all([
    runQuery<{ id: string; name: string } | null>(
      admin
        .from("projects")
        .select("id, name")
        .eq("id", taskRow.project_id)
        .maybeSingle()
    ),
    listUsers(),
    runQuery<DbTaskRow[]>(
      admin
        .from("tasks")
        .select("id, title, status, assignee_id, start_date, due_date, description, parent_id, project_id, position, priority, effort, planned_cost, created_at, updated_at")
        .eq("project_id", taskRow.project_id)
        .order("position", { ascending: true })
    ),
    listTaskComments(id),
  ]);

  const usersById = new Map(users.map((user) => [user.id, user]));
  const { roots } = buildTaskTree(taskRows ?? [], usersById);
  const task = findTaskInTree(roots, id);

  if (!task) return null;

  return {
    ...task,
    project: projectRow ? { id: projectRow.id, name: projectRow.name } : undefined,
    comments,
  };
}

export async function createSpace(input: {
  name: string;
  color?: string | null;
  icon?: string | null;
  position?: number | null;
}) {
  const admin = getSupabaseAdminClient();
  const row = ensurePresent(await runQuery<DbSpaceRow>(
    admin
      .from("spaces")
      .insert({
        name: input.name,
        color: input.color ?? "#00B050",
        icon: input.icon ?? null,
        position: input.position ?? 0,
      })
      .select("id, name, color, icon, position, created_at, updated_at")
      .single()
  ), "Unable to create space");

  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    position: row.position,
    folders: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } satisfies Space;
}

export async function updateSpace(id: string, patch: Record<string, unknown>) {
  const admin = getSupabaseAdminClient();
  const row = ensurePresent(await runQuery<DbSpaceRow>(
    admin
      .from("spaces")
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
        ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
        ...(patch.position !== undefined ? { position: patch.position } : {}),
      })
      .eq("id", id)
      .select("id, name, color, icon, position, created_at, updated_at")
      .single()
  ), "Unable to update space");

  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function deleteSpace(id: string) {
  const admin = getSupabaseAdminClient();
  await runQuery(admin.from("spaces").delete().eq("id", id).select("id").single());
}

export async function createFolder(input: { name: string; spaceId: string; position?: number | null }) {
  const admin = getSupabaseAdminClient();
  const row = ensurePresent(await runQuery<DbFolderRow>(
    admin
      .from("folders")
      .insert({
        name: input.name,
        space_id: input.spaceId,
        position: input.position ?? 0,
      })
      .select("id, name, space_id, position, created_at, updated_at")
      .single()
  ), "Unable to create folder");

  return {
    id: row.id,
    name: row.name,
    spaceId: row.space_id,
    position: row.position,
    projects: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } satisfies Folder;
}

export async function updateFolder(id: string, patch: Record<string, unknown>) {
  const admin = getSupabaseAdminClient();
  const row = ensurePresent(await runQuery<DbFolderRow>(
    admin
      .from("folders")
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.spaceId !== undefined ? { space_id: patch.spaceId } : {}),
        ...(patch.position !== undefined ? { position: patch.position } : {}),
      })
      .eq("id", id)
      .select("id, name, space_id, position, created_at, updated_at")
      .single()
  ), "Unable to update folder");

  return {
    id: row.id,
    name: row.name,
    spaceId: row.space_id,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function deleteFolder(id: string) {
  const admin = getSupabaseAdminClient();
  await runQuery(admin.from("folders").delete().eq("id", id).select("id").single());
}

export async function createProject(input: {
  name: string;
  folderId: string;
  color?: string | null;
  position?: number | null;
}) {
  const admin = getSupabaseAdminClient();
  const row = ensurePresent(await runQuery<DbProjectRow>(
    admin
      .from("projects")
      .insert({
        name: input.name,
        folder_id: input.folderId,
        color: input.color ?? "#6366f1",
        position: input.position ?? 0,
      })
      .select("id, name, folder_id, position, color, created_at, updated_at")
      .single()
  ), "Unable to create project");

  return {
    id: row.id,
    name: row.name,
    folderId: row.folder_id,
    color: row.color,
    position: row.position,
    tasks: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } satisfies Project;
}

export async function updateProject(id: string, patch: Record<string, unknown>) {
  const admin = getSupabaseAdminClient();
  const row = ensurePresent(await runQuery<DbProjectRow>(
    admin
      .from("projects")
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.folderId !== undefined ? { folder_id: patch.folderId } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
        ...(patch.position !== undefined ? { position: patch.position } : {}),
      })
      .eq("id", id)
      .select("id, name, folder_id, position, color, created_at, updated_at")
      .single()
  ), "Unable to update project");

  return {
    id: row.id,
    name: row.name,
    folderId: row.folder_id,
    color: row.color,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function deleteProject(id: string) {
  const admin = getSupabaseAdminClient();
  await runQuery(admin.from("projects").delete().eq("id", id).select("id").single());
}

export async function createTask(input: {
  title: string;
  projectId: string;
  status?: string | null;
  assigneeId?: string | null;
  parentId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  description?: string | null;
  priority?: string | null;
  effort?: number | null;
  plannedCost?: number | null;
  position?: number | null;
}) {
  const admin = getSupabaseAdminClient();
  const row = ensurePresent(await runQuery<DbTaskRow>(
    admin
      .from("tasks")
      .insert({
        title: input.title,
        project_id: input.projectId,
        status: input.status ?? "New",
        assignee_id: input.assigneeId ?? null,
        parent_id: input.parentId ?? null,
        start_date: input.startDate ?? null,
        due_date: input.dueDate ?? null,
        description: input.description ?? null,
        priority: input.priority ?? "Medium",
        effort: input.effort ?? 0,
        planned_cost: input.plannedCost ?? 0,
        position: input.position ?? 0,
      })
      .select("id, title, status, assignee_id, start_date, due_date, description, parent_id, project_id, position, priority, effort, planned_cost, created_at, updated_at")
      .single()
  ), "Unable to create task");

  const users = await listUsers();
  const usersById = new Map(users.map((user) => [user.id, user]));
  return mapTask(row, usersById);
}

export async function updateTask(id: string, patch: Record<string, unknown>) {
  const admin = getSupabaseAdminClient();
  const row = ensurePresent(await runQuery<DbTaskRow>(
    admin
      .from("tasks")
      .update({
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.assigneeId !== undefined ? { assignee_id: patch.assigneeId || null } : {}),
        ...(patch.startDate !== undefined ? { start_date: patch.startDate || null } : {}),
        ...(patch.dueDate !== undefined ? { due_date: patch.dueDate || null } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
        ...(patch.effort !== undefined ? { effort: patch.effort } : {}),
        ...(patch.plannedCost !== undefined ? { planned_cost: patch.plannedCost } : {}),
        ...(patch.position !== undefined ? { position: patch.position } : {}),
        ...(patch.parentId !== undefined ? { parent_id: patch.parentId || null } : {}),
      })
      .eq("id", id)
      .select("id, title, status, assignee_id, start_date, due_date, description, parent_id, project_id, position, priority, effort, planned_cost, created_at, updated_at")
      .single()
  ), "Unable to update task");

  const users = await listUsers();
  const usersById = new Map(users.map((user) => [user.id, user]));
  return mapTask(row, usersById);
}

export async function deleteTask(id: string) {
  const admin = getSupabaseAdminClient();
  await runQuery(admin.from("tasks").delete().eq("id", id).select("id").single());
}
