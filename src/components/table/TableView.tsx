"use client";
import React, { useState } from "react";
import { ChevronRight, ChevronDown, Plus, MoreHorizontal, X } from "lucide-react";
import { cn, STATUS_CONFIG, STATUSES, formatDate, isOverdue, getInitials } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Task, Project, Space, User } from "@/types";

const COLUMNS = [
  { key: "title", label: "Task Name", width: "min-w-[280px]" },
  { key: "status", label: "Status", width: "w-32" },
  { key: "assignee", label: "Assignee", width: "w-28" },
  { key: "startDate", label: "Start Date", width: "w-28" },
  { key: "dueDate", label: "Due Date", width: "w-28" },
  { key: "priority", label: "Priority", width: "w-24" },
  { key: "effort", label: "Effort", width: "w-20" },
  { key: "plannedCost", label: "Cost", width: "w-24" },
  { key: "location", label: "Location", width: "w-40" },
];

const PRIORITY_CONFIG: Record<string, { color: string; bg: string }> = {
  Critical: { color: "text-red-600", bg: "bg-red-50" },
  High: { color: "text-orange-500", bg: "bg-orange-50" },
  Medium: { color: "text-amber-500", bg: "bg-amber-50" },
  Low: { color: "text-gray-400", bg: "bg-gray-50" },
};

export function TableView() {
  const {
    spaces,
    users,
    selectedSpaceId,
    selectedProjectId,
    filters,
    openTask,
    updateTaskOptimistic,
    addTaskOptimistic,
    deleteTaskOptimistic,
  } = useAppStore();
  const [createProjectId, setCreateProjectId] = useState<string | null>(null);

  const visibleData = (() => {
    if (selectedProjectId) {
      for (const space of spaces) {
        for (const folder of space.folders) {
          const project = folder.projects.find((candidate) => candidate.id === selectedProjectId);
          if (project) return [{ space, folder, project }];
        }
      }
    }

    if (selectedSpaceId) {
      const space = spaces.find((candidate) => candidate.id === selectedSpaceId);
      if (!space) return [];

      return space.folders.flatMap((folder) =>
        folder.projects.map((project) => ({ space, folder, project }))
      );
    }

    return spaces.flatMap((space) =>
      space.folders.flatMap((folder) =>
        folder.projects.map((project) => ({ space, folder, project }))
      )
    );
  })();

  function filterTasks(tasks: Task[]): Task[] {
    return tasks
      .filter((task) => {
        if (filters.status.length && !filters.status.includes(task.status)) return false;
        if (filters.assigneeId.length && !filters.assigneeId.includes(task.assigneeId ?? "")) return false;
        if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
        return true;
      })
      .map((task) => ({ ...task, subtasks: filterTasks(task.subtasks) }));
  }

  async function persistTaskStatus(taskId: string, status: string) {
    updateTaskOptimistic(taskId, { status });
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (response.ok) {
      const updated = await response.json();
      updateTaskOptimistic(taskId, updated);
    }
  }

  async function persistTaskAssignee(taskId: string, assigneeId: string | null) {
    const assignee = users.find((user) => user.id === assigneeId) ?? null;
    updateTaskOptimistic(taskId, { assigneeId, assignee });

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId }),
    });

    if (response.ok) {
      const updated = await response.json();
      updateTaskOptimistic(taskId, updated);
    }
  }

  async function handleCreateTask({
    title,
    assigneeId,
    projectId,
  }: {
    title: string;
    assigneeId: string | null;
    projectId: string;
  }) {
    const assignee = users.find((user) => user.id === assigneeId) ?? null;
    const tempTask: Task = {
      id: `temp-${Date.now()}`,
      title,
      status: "New",
      assigneeId,
      assignee,
      startDate: null,
      dueDate: null,
      description: null,
      parentId: null,
      subtasks: [],
      projectId,
      position: 999,
      priority: "Medium",
      effort: 0,
      plannedCost: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addTaskOptimistic(projectId, tempTask);

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, assigneeId, projectId }),
    });

    if (response.ok) {
      const created = await response.json();
      updateTaskOptimistic(tempTask.id, created);
      return;
    }

    deleteTaskOptimistic(tempTask.id);
  }

  return (
    <>
      <div className="flex-1 overflow-auto">
        {visibleData.length === 0 ? (
          <div className="flex h-full min-h-[320px] items-center justify-center p-8">
            <div className="max-w-md text-center">
              <h3 className="text-lg font-semibold text-gray-800">Noch kein Projekt vorhanden</h3>
              <p className="mt-2 text-sm text-gray-400">
                Lege zuerst in der Sidebar einen Folder und danach ein Projekt an. Danach kannst du hier Tasks erstellen und zuweisen.
              </p>
            </div>
          </div>
        ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
              <th className="w-8 px-2 py-2.5 text-left">
                <input type="checkbox" className="rounded border-gray-300" />
              </th>
              <th className="w-6 px-1" />
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "cursor-pointer whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-800",
                    column.width
                  )}
                >
                  {column.label}
                </th>
              ))}
              <th className="px-2 py-2.5">
                <button className="text-gray-400 hover:text-gray-600">
                  <Plus className="h-4 w-4" />
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {visibleData.map(({ space, folder, project }) => {
              const tasks = filterTasks(project.tasks);

              return (
                <React.Fragment key={project.id}>
                  <ProjectHeader space={space} folder={folder} project={project} />
                  {tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      depth={0}
                      location={`${space.name} / ${folder.name} / ${project.name}`}
                      onOpen={() => openTask(task.id)}
                      onStatusChange={(status) => persistTaskStatus(task.id, status)}
                      onAssigneeChange={(assigneeId) => persistTaskAssignee(task.id, assigneeId)}
                    />
                  ))}
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-2 py-1.5" />
                    <td className="px-1" />
                    <td colSpan={COLUMNS.length + 1} className="px-3 py-1.5">
                      <button
                        onClick={() => setCreateProjectId(project.id)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#00B050]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add task
                      </button>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        )}
      </div>

      <CreateTaskDialog
        key={createProjectId ?? "closed"}
        open={createProjectId !== null}
        users={users}
        onClose={() => setCreateProjectId(null)}
        onCreate={async ({ title, assigneeId }) => {
          if (!createProjectId) return;
          await handleCreateTask({ title, assigneeId, projectId: createProjectId });
          setCreateProjectId(null);
        }}
      />
    </>
  );
}

function CreateTaskDialog({
  open,
  users,
  onClose,
  onCreate,
}: {
  open: boolean;
  users: User[];
  onClose: () => void;
  onCreate: (values: { title: string; assigneeId: string | null }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setSaving(true);
    try {
      await onCreate({ title: trimmedTitle, assigneeId });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Task anlegen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Titel</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="z. B. Kundenangebot finalisieren"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Zuständig</label>
            <AssigneeDropdown
              assigneeId={assigneeId}
              users={users}
              onChange={setAssigneeId}
              placeholder="Unassigned"
              compact={false}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              disabled={saving}
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubmit}
              className="rounded-lg bg-[#00B050] px-4 py-2 text-sm font-medium text-white hover:bg-[#00963f] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving || !title.trim()}
            >
              {saving ? "Speichert..." : "Task erstellen"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProjectHeader({ space, folder, project }: { space: Space; folder: { name: string }; project: Project }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <tr className="cursor-pointer border-b border-gray-100 bg-gray-50/80" onClick={() => setCollapsed((current) => !current)}>
      <td className="px-2 py-2" />
      <td className="px-1">
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        )}
      </td>
      <td colSpan={COLUMNS.length + 1} className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: project.color }} />
          <span className="text-xs font-semibold text-gray-700">{project.name}</span>
          <span className="text-xs text-gray-400">
            {folder.name} · {space.name}
          </span>
          <span className="ml-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">
            {project.tasks.length}
          </span>
        </div>
      </td>
    </tr>
  );
}

function TaskRow({
  task,
  depth,
  location,
  onOpen,
  onStatusChange,
  onAssigneeChange,
}: {
  task: Task;
  depth: number;
  location: string;
  onOpen: () => void;
  onStatusChange: (status: string) => void;
  onAssigneeChange: (assigneeId: string | null) => void;
}) {
  const { expandedTaskIds, toggleTaskExpand, users } = useAppStore();
  const isExpanded = expandedTaskIds.has(task.id);
  const hasSubtasks = task.subtasks.length > 0;
  const overdue = isOverdue(task.dueDate) && task.status !== "Completed";

  return (
    <>
      <tr className="group cursor-pointer border-b border-gray-100 hover:bg-blue-50/30" onClick={onOpen}>
        <td className="px-2 py-2" onClick={(event) => event.stopPropagation()}>
          <input type="checkbox" className="rounded border-gray-300 opacity-0 group-hover:opacity-100" />
        </td>

        <td
          className="px-1"
          onClick={(event) => {
            event.stopPropagation();
            if (hasSubtasks) toggleTaskExpand(task.id);
          }}
        >
          {hasSubtasks ? (
            isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
            )
          ) : (
            <span className="block h-3.5 w-3.5" />
          )}
        </td>

        <td className="min-w-[280px] px-3 py-2">
          <div className="flex items-center gap-1" style={{ paddingLeft: depth * 16 }}>
            <span className="max-w-[240px] truncate text-sm text-gray-800 hover:text-[#00B050]" title={task.title}>
              {task.title}
            </span>
            {hasSubtasks && (
              <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400">
                {task.subtasks.length}
              </span>
            )}
          </div>
        </td>

        <td className="w-32 px-3 py-2" onClick={(event) => event.stopPropagation()}>
          <StatusDropdown status={task.status} onSelect={onStatusChange} />
        </td>

        <td className="w-28 px-3 py-2" onClick={(event) => event.stopPropagation()}>
          <AssigneeDropdown
            assigneeId={task.assigneeId}
            users={users}
            onChange={onAssigneeChange}
            placeholder="—"
            compact
          />
        </td>

        <td className="w-28 px-3 py-2">
          <span className="text-xs text-gray-500">{formatDate(task.startDate) || "—"}</span>
        </td>

        <td className="w-28 px-3 py-2">
          <span className={cn("text-xs", overdue ? "font-medium text-red-500" : "text-gray-500")}>
            {formatDate(task.dueDate) || "—"}
          </span>
        </td>

        <td className="w-24 px-3 py-2">
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium",
              PRIORITY_CONFIG[task.priority]?.color ?? "text-gray-400",
              PRIORITY_CONFIG[task.priority]?.bg ?? "bg-gray-50"
            )}
          >
            {task.priority}
          </span>
        </td>

        <td className="w-20 px-3 py-2">
          <span className="text-xs text-gray-500">{task.effort.toFixed(1)}h</span>
        </td>

        <td className="w-24 px-3 py-2">
          <span className="text-xs text-gray-500">
            {task.plannedCost > 0 ? `$${task.plannedCost.toFixed(0)}` : "—"}
          </span>
        </td>

        <td className="w-40 px-3 py-2">
          <span className="block max-w-[140px] truncate text-xs text-gray-400">{location}</span>
        </td>

        <td className="px-2 py-2" onClick={(event) => event.stopPropagation()}>
          <button className="text-gray-400 opacity-0 hover:text-gray-600 group-hover:opacity-100">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </td>
      </tr>

      {isExpanded &&
        hasSubtasks &&
        task.subtasks.map((subtask) => (
          <TaskRow
            key={subtask.id}
            task={subtask}
            depth={depth + 1}
            location={location}
            onOpen={() => useAppStore.getState().openTask(subtask.id)}
            onStatusChange={(status) => {
              useAppStore.getState().updateTaskOptimistic(subtask.id, { status });
              fetch(`/api/tasks/${subtask.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
              })
                .then((response) => (response.ok ? response.json() : null))
                .then((updated) => {
                  if (updated) {
                    useAppStore.getState().updateTaskOptimistic(subtask.id, updated);
                  }
                });
            }}
            onAssigneeChange={(assigneeId) => {
              const availableUsers = useAppStore.getState().users;
              const assignee = availableUsers.find((user) => user.id === assigneeId) ?? null;
              useAppStore.getState().updateTaskOptimistic(subtask.id, { assigneeId, assignee });
              fetch(`/api/tasks/${subtask.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assigneeId }),
              })
                .then((response) => (response.ok ? response.json() : null))
                .then((updated) => {
                  if (updated) {
                    useAppStore.getState().updateTaskOptimistic(subtask.id, updated);
                  }
                });
            }}
          />
        ))}
    </>
  );
}

function AssigneeDropdown({
  assigneeId,
  users,
  onChange,
  placeholder,
  compact,
}: {
  assigneeId: string | null;
  users: User[];
  onChange: (assigneeId: string | null) => void;
  placeholder: string;
  compact: boolean;
}) {
  const [open, setOpen] = useState(false);
  const assignee = users.find((user) => user.id === assigneeId) ?? null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex items-center gap-1.5 rounded-md text-left hover:text-[#00B050]",
          compact ? "min-h-6 text-xs text-gray-600" : "min-h-9 w-full border border-gray-200 px-3 py-2 text-sm text-gray-700"
        )}
      >
        {assignee ? (
          <>
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[9px]" style={{ backgroundColor: assignee.color + "30", color: assignee.color }}>
                {getInitials(assignee.name)}
              </AvatarFallback>
            </Avatar>
            <span className={cn("truncate", compact ? "max-w-[60px]" : "max-w-[180px]")}>
              {compact ? assignee.name.split(" ")[0] : assignee.name}
            </span>
          </>
        ) : (
          <span className={compact ? "text-gray-300" : "text-gray-400"}>{placeholder}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[190px] rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
            <button
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:bg-gray-50"
            >
              <X className="h-3.5 w-3.5" />
              Unassigned
            </button>
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  onChange(user.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[9px]" style={{ backgroundColor: user.color + "30", color: user.color }}>
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-gray-700">{user.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatusDropdown({ status, onSelect }: { status: string; onSelect: (status: string) => void }) {
  const [open, setOpen] = useState(false);
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.New;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((current) => !current)}
        className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", config.bg, config.text)}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: config.color }} />
        {config.label}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[140px] rounded-md border border-gray-200 bg-white py-1 shadow-lg">
            {STATUSES.map((candidate) => {
              const candidateConfig = STATUS_CONFIG[candidate];
              return (
                <button
                  key={candidate}
                  onClick={() => {
                    onSelect(candidate);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: candidateConfig.color }} />
                  {candidateConfig.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
