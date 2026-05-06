"use client";
import { create } from "zustand";
import type { InboxItem, Space, Task, User, ViewMode, TaskFilters } from "@/types";

interface AppState {
  spaces: Space[];
  users: User[];
  inboxItems: InboxItem[];
  selectedSpaceId: string | null;
  selectedProjectId: string | null;
  activeView: ViewMode;
  selectedTaskId: string | null;
  taskDetailOpen: boolean;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  filters: TaskFilters;
  expandedTaskIds: Set<string>;
  commandOpen: boolean;

  // Actions
  setSpaces: (spaces: Space[]) => void;
  setUsers: (users: User[]) => void;
  setInboxItems: (items: InboxItem[]) => void;
  selectSpace: (id: string | null) => void;
  selectProject: (id: string | null) => void;
  setActiveView: (view: ViewMode) => void;
  openTask: (id: string) => void;
  closeTask: () => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setFilter: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void;
  toggleTaskExpand: (id: string) => void;
  setCommandOpen: (open: boolean) => void;

  // Optimistic task updates
  updateTaskOptimistic: (taskId: string, patch: Partial<Task>) => void;
  addTaskOptimistic: (projectId: string, task: Task) => void;
  addSubtaskOptimistic: (parentTaskId: string, task: Task) => void;
  deleteTaskOptimistic: (taskId: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  spaces: [],
  users: [],
  inboxItems: [],
  selectedSpaceId: null,
  selectedProjectId: null,
  activeView: "table",
  selectedTaskId: null,
  taskDetailOpen: false,
  sidebarCollapsed: false,
  sidebarWidth: 346,
  filters: { status: [], assigneeId: [], createdById: [], search: "", lifecycle: "active" },
  expandedTaskIds: new Set(),
  commandOpen: false,

  setSpaces: (spaces) => set({ spaces }),
  setUsers: (users) => set({ users }),
  setInboxItems: (inboxItems) => set({ inboxItems }),
  selectSpace: (id) => set({ selectedSpaceId: id, selectedProjectId: null }),
  selectProject: (id) => set({ selectedProjectId: id }),
  setActiveView: (view) => set({ activeView: view }),
  openTask: (id) => set({ selectedTaskId: id, taskDetailOpen: true }),
  closeTask: () => set({ taskDetailOpen: false, selectedTaskId: null }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),
  toggleTaskExpand: (id) =>
    set((s) => {
      const next = new Set(s.expandedTaskIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { expandedTaskIds: next };
    }),
  setCommandOpen: (open) => set({ commandOpen: open }),

  updateTaskOptimistic: (taskId, patch) =>
    set((s) => ({
      spaces: s.spaces.map((space) => ({
        ...space,
        folders: space.folders.map((folder) => ({
          ...folder,
          projects: folder.projects.map((project) => ({
            ...project,
            tasks: updateTaskInList(project.tasks, taskId, patch),
          })),
        })),
      })),
    })),

  addTaskOptimistic: (projectId, task) =>
    set((s) => ({
      spaces: s.spaces.map((space) => ({
        ...space,
        folders: space.folders.map((folder) => ({
          ...folder,
          projects: folder.projects.map((project) =>
            project.id === projectId
              ? { ...project, tasks: [...project.tasks, task] }
              : project
          ),
        })),
      })),
    })),

  addSubtaskOptimistic: (parentTaskId, task) =>
    set((s) => ({
      spaces: s.spaces.map((space) => ({
        ...space,
        folders: space.folders.map((folder) => ({
          ...folder,
          projects: folder.projects.map((project) => ({
            ...project,
            tasks: addSubtaskToList(project.tasks, parentTaskId, task),
          })),
        })),
      })),
    })),

  deleteTaskOptimistic: (taskId) =>
    set((s) => ({
      spaces: s.spaces.map((space) => ({
        ...space,
        folders: space.folders.map((folder) => ({
          ...folder,
          projects: folder.projects.map((project) => ({
            ...project,
            tasks: removeTaskFromList(project.tasks, taskId),
          })),
        })),
      })),
    })),
}));

function updateTaskInList(tasks: Task[], id: string, patch: Partial<Task>): Task[] {
  return tasks.map((t) =>
    t.id === id
      ? { ...t, ...patch }
      : { ...t, subtasks: updateTaskInList(t.subtasks, id, patch) }
  );
}

function removeTaskFromList(tasks: Task[], id: string): Task[] {
  return tasks
    .filter((t) => t.id !== id)
    .map((t) => ({ ...t, subtasks: removeTaskFromList(t.subtasks, id) }));
}

function addSubtaskToList(tasks: Task[], parentTaskId: string, task: Task): Task[] {
  return tasks.map((item) =>
    item.id === parentTaskId
      ? { ...item, subtasks: [...item.subtasks, task] }
      : { ...item, subtasks: addSubtaskToList(item.subtasks, parentTaskId, task) }
  );
}
