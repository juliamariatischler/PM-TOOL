import type {
  Folder,
  InboxItem,
  MicrosoftConnectionStatus,
  Project,
  Space,
  TaskApproval,
  Task,
  TaskComment,
  TaskDocument,
  TaskLink,
  User,
} from "@/types";
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
  created_by: string | null;
  assignee_id: string | null;
  start_date: string | null;
  due_date: string | null;
  description: string | null;
  parent_id: string | null;
  project_id: string;
  position: number;
  priority: string;
  effort: number;
  actual_time_minutes: number;
  timer_started_at: string | null;
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

type DbTaskDocumentRow = {
  id: string;
  task_id: string;
  provider: "microsoft";
  document_type: "word" | "excel" | "powerpoint" | "file";
  title: string;
  url: string;
  created_at: string;
};

type DbTaskApprovalRow = {
  id: string;
  task_id: string;
  approver_user_id: string;
  requested_by_user_id: string | null;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  decided_at: string | null;
  created_at: string;
};

type DbTaskLinkRow = {
  id: string;
  task_id: string;
  link_type: "internal" | "external";
  linked_task_id: string | null;
  title: string;
  url: string | null;
  created_by: string | null;
  created_at: string;
};

type DbMicrosoftConnectionRow = {
  user_id: string;
  email: string | null;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  drive_id: string | null;
  created_at: string;
  updated_at: string;
};

const TASK_SELECT = [
  "id",
  "title",
  "status",
  "created_by",
  "assignee_id",
  "start_date",
  "due_date",
  "description",
  "parent_id",
  "project_id",
  "position",
  "priority",
  "effort",
  "actual_time_minutes",
  "timer_started_at",
  "planned_cost",
  "created_at",
  "updated_at",
].join(", ");

const LEGACY_TASK_SELECT = [
  "id",
  "title",
  "status",
  "assignee_id",
  "start_date",
  "due_date",
  "description",
  "parent_id",
  "project_id",
  "position",
  "priority",
  "effort",
  "planned_cost",
  "created_at",
  "updated_at",
].join(", ");

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
    createdById: row.created_by,
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
    actualTimeMinutes: row.actual_time_minutes,
    timerStartedAt: row.timer_started_at,
    plannedCost: row.planned_cost,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeTaskRow(row: Partial<DbTaskRow> & Pick<DbTaskRow, "id" | "title" | "status" | "project_id" | "position" | "priority" | "effort" | "planned_cost" | "created_at" | "updated_at">): DbTaskRow {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    created_by: row.created_by ?? null,
    assignee_id: row.assignee_id ?? null,
    start_date: row.start_date ?? null,
    due_date: row.due_date ?? null,
    description: row.description ?? null,
    parent_id: row.parent_id ?? null,
    project_id: row.project_id,
    position: row.position,
    priority: row.priority,
    effort: row.effort,
    actual_time_minutes: row.actual_time_minutes ?? 0,
    timer_started_at: row.timer_started_at ?? null,
    planned_cost: row.planned_cost,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function isMissingTaskColumnError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return ["created_by", "actual_time_minutes", "timer_started_at"].some((column) =>
    message.includes(column)
  );
}

function mapTaskDocument(row: DbTaskDocumentRow): TaskDocument {
  return {
    id: row.id,
    taskId: row.task_id,
    provider: row.provider,
    documentType: row.document_type,
    title: row.title,
    url: row.url,
    createdAt: row.created_at,
  };
}

function mapTaskApproval(row: DbTaskApprovalRow, usersById: Map<string, User>): TaskApproval | null {
  const approver = usersById.get(row.approver_user_id);
  if (!approver) return null;

  return {
    id: row.id,
    taskId: row.task_id,
    approver,
    requestedBy: row.requested_by_user_id ? usersById.get(row.requested_by_user_id) ?? null : null,
    status: row.status,
    note: row.note,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
  };
}

function mapTaskLink(row: DbTaskLinkRow, linkedTaskTitle: string | null): TaskLink {
  return {
    id: row.id,
    taskId: row.task_id,
    linkType: row.link_type,
    linkedTaskId: row.linked_task_id,
    linkedTaskTitle,
    title: row.title,
    url: row.url,
    createdAt: row.created_at,
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

async function runTaskQuery<T>(
  fullQuery: () => PromiseLike<{ data: T | null; error: { message: string } | null }>,
  legacyQuery: () => PromiseLike<{ data: T | null; error: { message: string } | null }>
) {
  try {
    return await runQuery(fullQuery());
  } catch (error) {
    if (!isMissingTaskColumnError(error)) {
      throw error;
    }
    return await runQuery(legacyQuery());
  }
}

async function selectTaskRows(
  buildQuery: (select: string) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>
) {
  const rows = await runTaskQuery(
    () => buildQuery(TASK_SELECT),
    () => buildQuery(LEGACY_TASK_SELECT)
  );

  return (rows ?? []).map((row) => normalizeTaskRow(row as Partial<DbTaskRow> & Pick<DbTaskRow, "id" | "title" | "status" | "project_id" | "position" | "priority" | "effort" | "planned_cost" | "created_at" | "updated_at">));
}

async function selectTaskRow(
  buildQuery: (select: string) => PromiseLike<{ data: unknown | null; error: { message: string } | null }>
) {
  const row = await runTaskQuery(
    () => buildQuery(TASK_SELECT),
    () => buildQuery(LEGACY_TASK_SELECT)
  );

  return row
    ? normalizeTaskRow(row as Partial<DbTaskRow> & Pick<DbTaskRow, "id" | "title" | "status" | "project_id" | "position" | "priority" | "effort" | "planned_cost" | "created_at" | "updated_at">)
    : null;
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

export async function listTaskDocuments(taskId: string) {
  const admin = getSupabaseAdminClient();
  const rows = await runQuery<DbTaskDocumentRow[]>(
    admin
      .from("task_documents")
      .select("id, task_id, provider, document_type, title, url, created_at")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
  );

  return (rows ?? []).map((row) => mapTaskDocument(row));
}

export async function listTaskApprovals(taskId: string) {
  const admin = getSupabaseAdminClient();
  const [rows, users] = await Promise.all([
    runQuery<DbTaskApprovalRow[]>(
      admin
        .from("task_approvals")
        .select("id, task_id, approver_user_id, requested_by_user_id, status, note, decided_at, created_at")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
    ),
    listUsers(),
  ]);

  const usersById = new Map(users.map((user) => [user.id, user]));
  return (rows ?? [])
    .map((row) => mapTaskApproval(row, usersById))
    .filter((approval): approval is TaskApproval => approval !== null);
}

export async function listTaskLinks(taskId: string) {
  const admin = getSupabaseAdminClient();
  const rows = await runQuery<DbTaskLinkRow[]>(
    admin
      .from("task_links")
      .select("id, task_id, link_type, linked_task_id, title, url, created_by, created_at")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
  );

  const linkedTaskIds = Array.from(
    new Set((rows ?? []).map((row) => row.linked_task_id).filter((value): value is string => Boolean(value)))
  );

  const linkedTaskRows = linkedTaskIds.length
    ? await selectTaskRows((select) => admin.from("tasks").select(select).in("id", linkedTaskIds))
    : [];
  const linkedTitlesById = new Map(linkedTaskRows.map((row) => [row.id, row.title]));

  return (rows ?? []).map((row) => mapTaskLink(row, row.linked_task_id ? linkedTitlesById.get(row.linked_task_id) ?? null : null));
}

export async function createTaskDocument(input: {
  taskId: string;
  provider: "microsoft";
  documentType: "word" | "excel" | "powerpoint" | "file";
  title: string;
  url: string;
}) {
  const admin = getSupabaseAdminClient();
  const row = ensurePresent(
    await runQuery<DbTaskDocumentRow>(
      admin
        .from("task_documents")
        .insert({
          task_id: input.taskId,
          provider: input.provider,
          document_type: input.documentType,
          title: input.title,
          url: input.url,
        })
        .select("id, task_id, provider, document_type, title, url, created_at")
        .single()
    ),
    "Unable to create task document"
  );

  return mapTaskDocument(row);
}

export async function createTaskApproval(input: {
  taskId: string;
  approverUserId: string;
  requestedByUserId: string | null;
  note?: string | null;
}) {
  const admin = getSupabaseAdminClient();
  const row = ensurePresent(
    await runQuery<DbTaskApprovalRow>(
      admin
        .from("task_approvals")
        .upsert(
          {
            task_id: input.taskId,
            approver_user_id: input.approverUserId,
            requested_by_user_id: input.requestedByUserId,
            note: input.note ?? null,
            status: "pending",
            decided_at: null,
          },
          { onConflict: "task_id,approver_user_id" }
        )
        .select("id, task_id, approver_user_id, requested_by_user_id, status, note, decided_at, created_at")
        .single()
    ),
    "Unable to create approval"
  );

  const users = await listUsers();
  const usersById = new Map(users.map((user) => [user.id, user]));
  return ensurePresent(mapTaskApproval(row, usersById), "Unable to map approval");
}

async function createTaskCommentRecord(input: {
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

export async function updateTaskApproval(id: string, input: {
  actingUserId: string;
  status?: "pending" | "approved" | "rejected";
  note?: string | null;
}) {
  const admin = getSupabaseAdminClient();
  const existing = await runQuery<DbTaskApprovalRow | null>(
    admin
      .from("task_approvals")
      .select("id, task_id, approver_user_id, requested_by_user_id, status, note, decided_at, created_at")
      .eq("id", id)
      .maybeSingle()
  );

  if (!existing) {
    throw new Error("Approval not found");
  }

  if (existing.approver_user_id !== input.actingUserId) {
    throw new Error("Only the assigned approver can update this approval");
  }

  const nextStatus = input.status ?? existing.status;
  const row = ensurePresent(
    await runQuery<DbTaskApprovalRow>(
      admin
        .from("task_approvals")
        .update({
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.note !== undefined ? { note: input.note } : {}),
          ...(input.status && input.status !== "pending" ? { decided_at: new Date().toISOString() } : {}),
          ...(input.status === "pending" ? { decided_at: null } : {}),
        })
        .eq("id", id)
        .select("id, task_id, approver_user_id, requested_by_user_id, status, note, decided_at, created_at")
        .single()
    ),
    "Unable to update approval"
  );

  const users = await listUsers();
  const usersById = new Map(users.map((user) => [user.id, user]));
  const approval = ensurePresent(mapTaskApproval(row, usersById), "Unable to map approval");

  if (
    nextStatus === "approved" &&
    existing.status !== "approved" &&
    approval.requestedBy &&
    approval.requestedBy.id !== approval.approver.id
  ) {
    await createTaskCommentRecord({
      taskId: approval.taskId,
      authorId: approval.approver.id,
      body: `@${approval.requestedBy.email.split("@")[0]} approval freigegeben.`,
    });
  }

  return approval;
}

export async function deleteTaskApproval(id: string) {
  const admin = getSupabaseAdminClient();
  await runQuery(admin.from("task_approvals").delete().eq("id", id).select("id").single());
}

export async function createTaskLink(input: {
  taskId: string;
  linkType: "internal" | "external";
  linkedTaskId?: string | null;
  title: string;
  url?: string | null;
  createdBy?: string | null;
}) {
  const admin = getSupabaseAdminClient();
  const row = ensurePresent(
    await runQuery<DbTaskLinkRow>(
      admin
        .from("task_links")
        .insert({
          task_id: input.taskId,
          link_type: input.linkType,
          linked_task_id: input.linkType === "internal" ? input.linkedTaskId ?? null : null,
          title: input.title,
          url: input.linkType === "external" ? input.url ?? null : null,
          created_by: input.createdBy ?? null,
        })
        .select("id, task_id, link_type, linked_task_id, title, url, created_by, created_at")
        .single()
    ),
    "Unable to create task link"
  );

  let linkedTaskTitle: string | null = null;
  if (row.linked_task_id) {
    const linkedTask = await selectTaskRow((select) =>
      admin.from("tasks").select(select).eq("id", row.linked_task_id ?? "").maybeSingle()
    );
    linkedTaskTitle = linkedTask?.title ?? null;
  }

  return mapTaskLink(row, linkedTaskTitle);
}

export async function deleteTaskLink(id: string) {
  const admin = getSupabaseAdminClient();
  await runQuery(admin.from("task_links").delete().eq("id", id).select("id").single());
}

export async function deleteTaskDocument(id: string) {
  const admin = getSupabaseAdminClient();
  await runQuery(admin.from("task_documents").delete().eq("id", id).select("id").single());
}

export async function getMicrosoftConnectionStatus(userId: string): Promise<MicrosoftConnectionStatus> {
  const admin = getSupabaseAdminClient();
  const row = await runQuery<DbMicrosoftConnectionRow | null>(
    admin
      .from("microsoft_connections")
      .select("user_id, email, access_token, refresh_token, expires_at, drive_id, created_at, updated_at")
      .eq("user_id", userId)
      .maybeSingle()
  );

  if (!row) {
    return {
      connected: false,
      configured: Boolean(
        process.env.MICROSOFT_CLIENT_ID &&
          process.env.MICROSOFT_CLIENT_SECRET &&
          process.env.MICROSOFT_REDIRECT_URI
      ),
      email: null,
      expiresAt: null,
    };
  }

  return {
    connected: true,
    configured: true,
    email: row.email,
    expiresAt: row.expires_at,
  };
}

export async function upsertMicrosoftConnection(input: {
  userId: string;
  email: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  driveId: string | null;
}) {
  const admin = getSupabaseAdminClient();
  await runQuery(
    admin
      .from("microsoft_connections")
      .upsert(
        {
          user_id: input.userId,
          email: input.email,
          access_token: input.accessToken,
          refresh_token: input.refreshToken,
          expires_at: input.expiresAt,
          drive_id: input.driveId,
        },
        { onConflict: "user_id" }
      )
      .select("user_id")
      .single()
  );
}

export async function createTaskComment(input: {
  taskId: string;
  authorId: string;
  body: string;
}) {
  return createTaskCommentRecord(input);
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
    selectTaskRows((select) => admin.from("tasks").select(select)),
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
    selectTaskRows((select) =>
      admin
        .from("tasks")
        .select(select)
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
  const taskRow = await selectTaskRow((select) =>
    admin
      .from("tasks")
      .select(select)
      .eq("id", id)
      .maybeSingle()
  );

  if (!taskRow) return null;

  const [projectRow, users, taskRows, comments, documents, approvals, links] = await Promise.all([
    runQuery<{ id: string; name: string } | null>(
      admin
        .from("projects")
        .select("id, name")
        .eq("id", taskRow.project_id)
        .maybeSingle()
    ),
    listUsers(),
    selectTaskRows((select) =>
      admin
        .from("tasks")
        .select(select)
        .eq("project_id", taskRow.project_id)
        .order("position", { ascending: true })
    ),
    listTaskComments(id),
    listTaskDocuments(id),
    listTaskApprovals(id),
    listTaskLinks(id),
  ]);

  const usersById = new Map(users.map((user) => [user.id, user]));
  const { roots } = buildTaskTree(taskRows ?? [], usersById);
  const task = findTaskInTree(roots, id);

  if (!task) return null;

  return {
    ...task,
    project: projectRow ? { id: projectRow.id, name: projectRow.name } : undefined,
    comments,
    documents,
    approvals,
    links,
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
  creatorId?: string | null;
  status?: string | null;
  assigneeId?: string | null;
  parentId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  description?: string | null;
  priority?: string | null;
  effort?: number | null;
  actualTimeMinutes?: number | null;
  timerStartedAt?: string | null;
  plannedCost?: number | null;
  position?: number | null;
}) {
  const admin = getSupabaseAdminClient();
  const baseInsert = {
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
  };
  const row = ensurePresent(await selectTaskRow((select) =>
    admin
      .from("tasks")
      .insert({
        ...baseInsert,
        created_by: input.creatorId ?? null,
        actual_time_minutes: input.actualTimeMinutes ?? 0,
        timer_started_at: input.timerStartedAt ?? null,
      })
      .select(select)
      .single()
  ).catch(async (error) => {
    if (!isMissingTaskColumnError(error)) {
      throw error;
    }

    return selectTaskRow((select) =>
      admin
        .from("tasks")
        .insert(baseInsert)
        .select(select)
        .single()
    );
  }), "Unable to create task");

  const users = await listUsers();
  const usersById = new Map(users.map((user) => [user.id, user]));
  return mapTask(row, usersById);
}

export async function updateTask(id: string, patch: Record<string, unknown>) {
  const admin = getSupabaseAdminClient();
  const basePatch = {
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
  };
  const row = ensurePresent(await selectTaskRow((select) =>
    admin
      .from("tasks")
      .update({
        ...basePatch,
        ...(patch.actualTimeMinutes !== undefined ? { actual_time_minutes: patch.actualTimeMinutes } : {}),
        ...(patch.timerStartedAt !== undefined ? { timer_started_at: patch.timerStartedAt || null } : {}),
      })
      .eq("id", id)
      .select(select)
      .single()
  ).catch(async (error) => {
    if (!isMissingTaskColumnError(error)) {
      throw error;
    }

    return selectTaskRow((select) =>
      admin
        .from("tasks")
        .update(basePatch)
        .eq("id", id)
        .select(select)
        .single()
    );
  }), "Unable to update task");

  const users = await listUsers();
  const usersById = new Map(users.map((user) => [user.id, user]));
  return mapTask(row, usersById);
}

export async function deleteTask(id: string) {
  const admin = getSupabaseAdminClient();
  await runQuery(admin.from("tasks").delete().eq("id", id).select("id").single());
}
