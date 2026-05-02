export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  color: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  status: string;
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

export type ViewMode = "table" | "board" | "workload" | "gantt" | "dashboard";

export interface TaskFilters {
  status: string[];
  assigneeId: string[];
  search: string;
}
