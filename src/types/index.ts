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
}
