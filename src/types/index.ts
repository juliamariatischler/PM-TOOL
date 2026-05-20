export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  color: string;
  createdAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  body: string;
  createdAt: string;
  author: User;
  mentions: User[];
}

export interface TaskDocument {
  id: string;
  taskId: string;
  provider: "microsoft";
  documentType: "word" | "excel" | "powerpoint" | "file";
  title: string;
  url: string;
  createdAt: string;
}

export interface TaskApproval {
  id: string;
  taskId: string;
  approver: User;
  requestedBy: User | null;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface TaskLink {
  id: string;
  taskId: string;
  linkType: "internal" | "external";
  linkedTaskId: string | null;
  linkedTaskTitle: string | null;
  title: string;
  url: string | null;
  createdAt: string;
}

export interface MicrosoftConnectionStatus {
  connected: boolean;
  configured: boolean;
  email: string | null;
  expiresAt: string | null;
}

export interface InboxItem {
  id: string;
  commentId: string;
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  taskArchivedAt: string | null;
  taskDeletedAt: string | null;
  projectName: string;
  folderName: string;
  spaceName: string;
  commentBody: string;
  createdAt: string;
  author: User;
  readAt: string | null;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  createdById: string | null;
  assigneeId: string | null;
  assignee: User | null;
  assigneeIds: string[];
  assignees: User[];
  startDate: string | null;
  dueDate: string | null;
  description: string | null;
  parentId: string | null;
  subtasks: Task[];
  projectId: string;
  position: number;
  priority: string;
  effort: number;
  actualTimeMinutes: number;
  timerStartedAt: string | null;
  plannedCost: number;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  folderId: string;
  color: string;
  position: number;
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  spaceId: string;
  position: number;
  projects: Project[];
  createdAt: string;
  updatedAt: string;
}

export interface Space {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  position: number;
  folders: Folder[];
  createdAt: string;
  updatedAt: string;
}

export type ViewMode = "inbox" | "table" | "board" | "workload" | "gantt" | "dashboard";

export interface TaskFilters {
  status: string[];
  assigneeId: string[];
  createdById: string[];
  search: string;
  lifecycle: "active" | "archived" | "deleted" | "all";
}

export type DashboardBlockType = "text" | "shortcuts" | "links" | "task_view" | "stats";
export type DashboardBlockWidth = "full" | "half";
export type SavedTaskViewType = "table" | "board" | "list";

export interface SavedTaskViewFilters {
  status?: string[];
  assigneeId?: string[];
  createdById?: string[];
  search?: string;
  lifecycle?: "active" | "archived" | "deleted" | "all";
  due?: "overdue" | "today" | "week" | "none";
}

export interface SavedTaskView {
  id: string;
  spaceId: string | null;
  projectId: string | null;
  name: string;
  viewType: SavedTaskViewType;
  filters: SavedTaskViewFilters;
  columns: string[];
  sort: Array<{ field: string; direction: "asc" | "desc" }>;
  groupBy: string | null;
  position: number;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardBlock {
  id: string;
  pageId: string;
  blockType: DashboardBlockType;
  title: string;
  config: Record<string, unknown>;
  content: Record<string, unknown>;
  width: DashboardBlockWidth;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardPage {
  id: string;
  spaceId: string | null;
  title: string;
  icon: string | null;
  position: number;
  createdById: string | null;
  blocks: DashboardBlock[];
  createdAt: string;
  updatedAt: string;
}
