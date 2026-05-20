"use client";
import React, { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Plus, X, ArrowRightLeft, Archive, RotateCcw, Trash2 } from "lucide-react";
import { cn, STATUS_CONFIG, STATUSES, formatDate, isOverdue, getInitials, matchesTaskLifecycle } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showToast } from "@/lib/toast";
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

export function TableView({ currentUserId }: { currentUserId: string }) {
  const {
    spaces,
    users,
    selectedSpaceId,
    selectedProjectId,
    filters,
    starredTaskIds,
    openTask,
    updateTaskOptimistic,
    addTaskOptimistic,
    deleteTaskOptimistic,
    setSpaces,
  } = useAppStore();
  const [createProjectId, setCreateProjectId] = useState<string | null>(null);
  const [movingTask, setMovingTask] = useState<Task | null>(null);

  const allProjects = useMemo(
    () =>
      spaces.flatMap((space) =>
        space.folders.flatMap((folder) =>
          folder.projects.map((project) => ({
            id: project.id,
            name: project.name,
            folderName: folder.name,
            spaceName: space.name,
          }))
        )
      ),
    [spaces]
  );

  const isLifecycleView = filters.lifecycle === "archived" || filters.lifecycle === "deleted";

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
        if (filters.assigneeId.length && !task.assigneeIds.some((id) => filters.assigneeId.includes(id))) return false;
        if (filters.createdById.length && !filters.createdById.includes(task.createdById ?? "")) return false;
        if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (!matchesTaskLifecycle(task, filters.lifecycle)) return false;
        if (filters.starred && !starredTaskIds.has(task.id)) return false;
        return true;
      })
      .map((task) => ({ ...task, subtasks: filterTasks(task.subtasks) }));
  }

  const visibleSections = visibleData
    .map(({ space, folder, project }) => ({
      space,
      folder,
      project,
      tasks: filterTasks(project.tasks),
    }))
    .filter((section) => !isLifecycleView || section.tasks.length > 0);

  async function persistTaskStatus(taskId: string, status: string) {
    const previousTask = findTaskById(spaces, taskId);
    updateTaskOptimistic(taskId, { status });
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const updated = await response.json();
        updateTaskOptimistic(taskId, updated);
        showToast({ title: "Status aktualisiert", variant: "success" });
        return;
      }

      if (previousTask) updateTaskOptimistic(taskId, { status: previousTask.status });
      showToast({ title: "Status konnte nicht gespeichert werden", variant: "error" });
    } catch (error) {
      if (previousTask) updateTaskOptimistic(taskId, { status: previousTask.status });
      showToast({
        title: "Status konnte nicht gespeichert werden",
        message: error instanceof Error ? error.message : "Die Anfrage konnte nicht abgeschlossen werden.",
        variant: "error",
      });
    }
  }

  async function persistTaskAssignee(taskId: string, assigneeIds: string[]) {
    const previousTask = findTaskById(spaces, taskId);
    const assignees = users.filter((user) => assigneeIds.includes(user.id));
    updateTaskOptimistic(taskId, {
      assigneeId: assignees[0]?.id ?? null,
      assignee: assignees[0] ?? null,
      assigneeIds,
      assignees,
    });

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeIds }),
      });

      if (response.ok) {
        const updated = await response.json();
        updateTaskOptimistic(taskId, updated);
        showToast({ title: "Zuweisung aktualisiert", variant: "success" });
        return;
      }

      if (previousTask) updateTaskOptimistic(taskId, previousTask);
      showToast({ title: "Zuweisung konnte nicht gespeichert werden", variant: "error" });
    } catch (error) {
      if (previousTask) updateTaskOptimistic(taskId, previousTask);
      showToast({
        title: "Zuweisung konnte nicht gespeichert werden",
        message: error instanceof Error ? error.message : "Die Anfrage konnte nicht abgeschlossen werden.",
        variant: "error",
      });
    }
  }

  async function handleCreateTask({
    title,
    assigneeIds,
    projectId,
    startDate,
    dueDate,
    priority,
    effort,
    plannedCost,
    description,
  }: {
    title: string;
    assigneeIds: string[];
    projectId: string;
    startDate: string | null;
    dueDate: string | null;
    priority: string;
    effort: number;
    plannedCost: number;
    description: string;
  }) {
    const assignees = users.filter((user) => assigneeIds.includes(user.id));
    const tempTask: Task = {
      id: `temp-${Date.now()}`,
      title,
      status: "New",
      createdById: currentUserId,
      assigneeId: assignees[0]?.id ?? null,
      assignee: assignees[0] ?? null,
      assigneeIds,
      assignees,
      startDate,
      dueDate,
      description: description || null,
      parentId: null,
      subtasks: [],
      projectId,
      position: 999,
      priority,
      effort,
      actualTimeMinutes: 0,
      timerStartedAt: null,
      plannedCost,
      archivedAt: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addTaskOptimistic(projectId, tempTask);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          assigneeIds,
          projectId,
          startDate,
          dueDate,
          priority,
          effort,
          plannedCost,
          description: description || null,
        }),
      });

      if (response.ok) {
        const created = await response.json();
        updateTaskOptimistic(tempTask.id, created);
        showToast({ title: "Task erstellt", variant: "success" });
        return;
      }

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      deleteTaskOptimistic(tempTask.id);
      showToast({ title: "Task konnte nicht erstellt werden", message: payload?.error, variant: "error" });
    } catch (error) {
      deleteTaskOptimistic(tempTask.id);
      showToast({
        title: "Task konnte nicht erstellt werden",
        message: error instanceof Error ? error.message : "Die Anfrage konnte nicht abgeschlossen werden.",
        variant: "error",
      });
    }
  }

  async function reloadWorkspace() {
    const response = await fetch("/api/spaces");
    if (!response.ok) {
      showToast({ title: "Workspace konnte nicht aktualisiert werden", variant: "error" });
      return;
    }
    const nextSpaces = await response.json();
    setSpaces(nextSpaces);
  }

  async function handleMoveTask(taskId: string, projectId: string) {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, parentId: null, position: 999 }),
    });

    if (!response.ok) {
      showToast({ title: "Task konnte nicht verschoben werden", variant: "error" });
      return;
    }

    await reloadWorkspace();
    setMovingTask(null);
    showToast({ title: "Task verschoben", variant: "success" });
  }

  async function handleLifecycleTask(taskId: string, patch: Pick<Task, "archivedAt" | "deletedAt">) {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (!response.ok) {
      showToast({ title: "Task konnte nicht aktualisiert werden", variant: "error" });
      return;
    }
    await reloadWorkspace();
    showToast({ title: "Task aktualisiert", variant: "success" });
  }

  async function handleEmptyTrash() {
    const confirmed = window.confirm("Papierkorb wirklich dauerhaft leeren?");
    if (!confirmed) return;

    const response = await fetch("/api/tasks/trash", { method: "DELETE" });
    if (!response.ok) {
      showToast({ title: "Papierkorb konnte nicht geleert werden", variant: "error" });
      return;
    }
    await reloadWorkspace();
    showToast({ title: "Papierkorb geleert", variant: "success" });
  }

  return (
    <>
      <div className="flex h-full flex-1 flex-col overflow-hidden bg-[#111a2c]">
        {filters.lifecycle === "deleted" ? (
          <div className="flex items-center justify-between border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-sm">
            <span className="text-red-100">Papierkorbansicht. Tasks lassen sich hier wiederherstellen oder gesammelt leeren.</span>
            <button
              onClick={handleEmptyTrash}
              className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-500/20"
            >
              Papierkorb leeren
            </button>
          </div>
        ) : null}
        <div className="flex-1 overflow-auto">
        {visibleSections.length === 0 ? (
          <div className="flex h-full min-h-[320px] items-center justify-center p-8">
            <div className="max-w-md text-center">
              <h3 className="text-lg font-semibold text-white">
                {isLifecycleView ? "Keine Tasks in dieser Ansicht" : "Noch kein Projekt vorhanden"}
              </h3>
              <p className="mt-2 text-sm text-[#94a3c3]">
                {isLifecycleView
                  ? filters.lifecycle === "archived"
                    ? "Aktuell ist kein Task archiviert."
                    : "Aktuell liegt kein Task im Papierkorb."
                  : "Lege zuerst in der Sidebar einen Folder und danach ein Projekt an. Danach kannst du hier Tasks erstellen und zuweisen."}
              </p>
            </div>
          </div>
        ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-[#2b3a58] bg-[#17233a]">
              <th className="w-8 px-2 py-2.5 text-left">
                <input type="checkbox" className="rounded border-gray-300" />
              </th>
              <th className="w-6 px-1" />
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "cursor-pointer whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#94a3c3] hover:text-white",
                    column.width
                  )}
                >
                  {column.label}
                </th>
              ))}
              <th className="px-2 py-2.5">
                <button className="text-[#7f91b8] hover:text-white">
                  <Plus className="h-4 w-4" />
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {visibleSections.map(({ space, folder, project, tasks }) => {
              return (
                <React.Fragment key={project.id}>
                  <ProjectHeader space={space} folder={folder} project={project} taskCount={tasks.length} />
                  {tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      depth={0}
                      location={`${space.name} / ${folder.name} / ${project.name}`}
                      lifecycle={filters.lifecycle}
                      onOpen={() => openTask(task.id)}
                      onStatusChange={(status) => persistTaskStatus(task.id, status)}
                      onAssigneeChange={(assigneeIds) => persistTaskAssignee(task.id, assigneeIds)}
                      onMove={(nextTask) => setMovingTask(nextTask)}
                      onArchive={(nextTask) =>
                        handleLifecycleTask(nextTask.id, {
                          archivedAt: nextTask.archivedAt ? null : new Date().toISOString(),
                          deletedAt: null,
                        })
                      }
                      onTrash={(nextTask) =>
                        handleLifecycleTask(nextTask.id, {
                          archivedAt: null,
                          deletedAt: nextTask.deletedAt ? null : new Date().toISOString(),
                        })
                      }
                    />
                  ))}
                  {filters.lifecycle === "active" ? (
                    <tr className="border-b border-[#22304b] hover:bg-[#17233a]">
                      <td className="px-2 py-1.5" />
                      <td className="px-1" />
                      <td colSpan={COLUMNS.length + 1} className="px-3 py-1.5">
                        <button
                          onClick={() => setCreateProjectId(project.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-[#94a3c3] hover:text-[#8ff0ba]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add task
                        </button>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        )}
        </div>
      </div>

      <CreateTaskDialog
        key={createProjectId ?? "closed"}
        open={createProjectId !== null}
        users={users}
        onClose={() => setCreateProjectId(null)}
        onCreate={async ({ title, assigneeIds, startDate, dueDate, priority, effort, plannedCost, description }) => {
          if (!createProjectId) return;
          await handleCreateTask({
            title,
            assigneeIds,
            projectId: createProjectId,
            startDate,
            dueDate,
            priority,
            effort,
            plannedCost,
            description,
          });
          setCreateProjectId(null);
        }}
      />

      <MoveTaskDialog
        key={movingTask?.id ?? "closed-move-task"}
        open={movingTask !== null}
        task={movingTask}
        projects={allProjects}
        onClose={() => setMovingTask(null)}
        onMove={handleMoveTask}
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
  onCreate: (values: {
    title: string;
    assigneeIds: string[];
    startDate: string | null;
    dueDate: string | null;
    priority: string;
    effort: number;
    plannedCost: number;
    description: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [effort, setEffort] = useState("0");
  const [plannedCost, setPlannedCost] = useState("0");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setSaving(true);
    try {
      await onCreate({
        title: trimmedTitle,
        assigneeIds,
        startDate: startDate || null,
        dueDate: dueDate || null,
        priority,
        effort: Number.isFinite(Number(effort)) ? Number(effort) : 0,
        plannedCost: Number.isFinite(Number(plannedCost)) ? Number(plannedCost) : 0,
        description: description.trim(),
      });
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
              assigneeIds={assigneeIds}
              users={users}
              onChange={setAssigneeIds}
              placeholder="Unassigned"
              compact={false}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Start</label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Ende</label>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Priorität</label>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
              >
                {Object.keys(PRIORITY_CONFIG).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Aufwand (h)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={effort}
                onChange={(event) => setEffort(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Kosten</label>
              <input
                type="number"
                min="0"
                step="1"
                value={plannedCost}
                onChange={(event) => setPlannedCost(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Beschreibung</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Kontext, Ziel oder Notizen"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
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

function ProjectHeader({
  space,
  folder,
  project,
  taskCount,
}: {
  space: Space;
  folder: { name: string };
  project: Project;
  taskCount: number;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <tr className="cursor-pointer border-b border-[#2b3a58] bg-[#17233a]" onClick={() => setCollapsed((current) => !current)}>
      <td className="px-2 py-2" />
      <td className="px-1">
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-[#7f91b8]" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-[#7f91b8]" />
        )}
      </td>
      <td colSpan={COLUMNS.length + 1} className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: project.color }} />
          <span className="text-xs font-semibold text-white">{project.name}</span>
          <span className="text-xs text-[#94a3c3]">
            {folder.name} · {space.name}
          </span>
          <span className="ml-1 rounded-md bg-[#0f1728] px-1.5 py-0.5 text-[10px] text-[#c8d3eb]">
            {taskCount}
          </span>
        </div>
      </td>
    </tr>
  );
}

function findTaskById(spaces: Space[], taskId: string): Task | null {
  for (const space of spaces) {
    for (const folder of space.folders) {
      for (const project of folder.projects) {
        const task = findTaskInList(project.tasks, taskId);
        if (task) return task;
      }
    }
  }

  return null;
}

function findTaskInList(tasks: Task[], taskId: string): Task | null {
  for (const task of tasks) {
    if (task.id === taskId) return task;
    const subtask = findTaskInList(task.subtasks, taskId);
    if (subtask) return subtask;
  }

  return null;
}

function TaskRow({
  task,
  depth,
  location,
  lifecycle,
  onOpen,
  onStatusChange,
  onAssigneeChange,
  onMove,
  onArchive,
  onTrash,
}: {
  task: Task;
  depth: number;
  location: string;
  lifecycle: "active" | "archived" | "deleted" | "all";
  onOpen: () => void;
  onStatusChange: (status: string) => void;
  onAssigneeChange: (assigneeIds: string[]) => void;
  onMove: (task: Task) => void;
  onArchive: (task: Task) => void;
  onTrash: (task: Task) => void;
}) {
  const { expandedTaskIds, toggleTaskExpand, users } = useAppStore();
  const isExpanded = expandedTaskIds.has(task.id);
  const hasSubtasks = task.subtasks.length > 0;
  const overdue = isOverdue(task.dueDate) && task.status !== "Completed";
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);

  async function saveTitle() {
    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      setTitleDraft(task.title);
      setEditingTitle(false);
      return;
    }

    if (nextTitle === task.title) {
      setEditingTitle(false);
      return;
    }

    useAppStore.getState().updateTaskOptimistic(task.id, { title: nextTitle });
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });

      if (response.ok) {
        const updated = await response.json();
        useAppStore.getState().updateTaskOptimistic(task.id, updated);
        showToast({ title: "Titel gespeichert", variant: "success" });
      } else {
        useAppStore.getState().updateTaskOptimistic(task.id, { title: task.title });
        setTitleDraft(task.title);
        showToast({ title: "Titel konnte nicht gespeichert werden", variant: "error" });
      }
    } catch (error) {
      useAppStore.getState().updateTaskOptimistic(task.id, { title: task.title });
      setTitleDraft(task.title);
      showToast({
        title: "Titel konnte nicht gespeichert werden",
        message: error instanceof Error ? error.message : "Die Anfrage konnte nicht abgeschlossen werden.",
        variant: "error",
      });
    }

    setEditingTitle(false);
  }

  return (
    <>
      <tr className="group cursor-pointer border-b border-[#22304b] hover:bg-[#17233a]" onClick={() => !editingTitle && onOpen()}>
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
            {editingTitle ? (
              <input
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={() => void saveTitle()}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveTitle();
                  }
                  if (event.key === "Escape") {
                    setTitleDraft(task.title);
                    setEditingTitle(false);
                  }
                }}
                autoFocus
                className="w-full max-w-[240px] rounded border border-[#00B050] bg-[#0f1728] px-2 py-1 text-sm text-white focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  setTitleDraft(task.title);
                  setEditingTitle(true);
                }}
                className="max-w-[240px] truncate text-left text-sm font-medium text-[#e7edf9] hover:text-[#8ff0ba]"
                title="Doppelklick zum Bearbeiten"
              >
                {task.title}
              </button>
            )}
            {task.archivedAt ? (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                Archiv
              </span>
            ) : null}
            {task.deletedAt ? (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                Papierkorb
              </span>
            ) : null}
            {hasSubtasks && (
              <span className="ml-1 rounded-md bg-[#0f1728] px-1.5 py-0.5 text-[10px] text-[#94a3c3]">
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
            assigneeIds={task.assigneeIds}
            users={users}
            onChange={onAssigneeChange}
            placeholder="—"
            compact
          />
        </td>

        <td className="w-28 px-3 py-2">
          <span className="text-xs text-[#b7c4dd]">{formatDate(task.startDate) || "—"}</span>
        </td>

        <td className="w-28 px-3 py-2">
          <span className={cn("text-xs", overdue ? "font-medium text-red-300" : "text-[#b7c4dd]")}>
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
          <span className="text-xs text-[#b7c4dd]">{task.effort.toFixed(1)}h</span>
        </td>

        <td className="w-24 px-3 py-2">
          <span className="text-xs text-[#b7c4dd]">
            {task.plannedCost > 0 ? `$${task.plannedCost.toFixed(0)}` : "—"}
          </span>
        </td>

        <td className="w-40 px-3 py-2">
          <span className="block max-w-[140px] truncate text-xs text-[#94a3c3]">{location}</span>
        </td>

        <td className="px-2 py-2" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {lifecycle === "active" && !task.deletedAt ? (
              <button
                onClick={() => onMove(task)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="Task verschieben"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </button>
            ) : null}
            {lifecycle !== "deleted" ? (
              <button
                onClick={() => onArchive(task)}
                className={cn(
                  "rounded p-1 hover:bg-gray-100",
                  lifecycle === "archived" ? "text-emerald-600 hover:text-emerald-700" : "text-gray-400 hover:text-gray-600"
                )}
                title={task.archivedAt ? "Aus Archiv holen" : "Archivieren"}
              >
                {task.archivedAt ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              </button>
            ) : null}
            <button
              onClick={() => onTrash(task)}
              className={cn(
                "rounded p-1 hover:bg-gray-100",
                task.deletedAt ? "text-emerald-600 hover:text-emerald-700" : "text-gray-400 hover:text-red-600"
              )}
              title={task.deletedAt ? "Wiederherstellen" : "In Papierkorb"}
            >
              {task.deletedAt ? <RotateCcw className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
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
            lifecycle={lifecycle}
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
            onAssigneeChange={(assigneeIds) => {
              const availableUsers = useAppStore.getState().users;
              const assignees = availableUsers.filter((user) => assigneeIds.includes(user.id));
              useAppStore.getState().updateTaskOptimistic(subtask.id, {
                assigneeId: assignees[0]?.id ?? null,
                assignee: assignees[0] ?? null,
                assigneeIds,
                assignees,
              });
              fetch(`/api/tasks/${subtask.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assigneeIds }),
              })
                .then((response) => (response.ok ? response.json() : null))
                .then((updated) => {
                  if (updated) {
                    useAppStore.getState().updateTaskOptimistic(subtask.id, updated);
                  }
                });
            }}
            onMove={onMove}
            onArchive={onArchive}
            onTrash={onTrash}
          />
        ))}
    </>
  );
}

function MoveTaskDialog({
  open,
  task,
  projects,
  onClose,
  onMove,
}: {
  open: boolean;
  task: Task | null;
  projects: Array<{ id: string; name: string; folderName: string; spaceName: string }>;
  onClose: () => void;
  onMove: (taskId: string, projectId: string) => Promise<void>;
}) {
  const [projectId, setProjectId] = useState(task?.projectId ?? "");
  const [saving, setSaving] = useState(false);

  async function handleMove() {
    if (!task || !projectId) return;

    setSaving(true);
    try {
      await onMove(task.id, projectId);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Task verschieben</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div className="text-sm text-gray-600">{task?.title}</div>
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.spaceName} / {project.folderName} / {project.name}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600">
              Abbrechen
            </button>
            <button
              onClick={handleMove}
              disabled={saving || !projectId}
              className="rounded-lg bg-[#00B050] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Speichert..." : "Verschieben"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssigneeDropdown({
  assigneeIds,
  users,
  onChange,
  placeholder,
  compact,
}: {
  assigneeIds: string[];
  users: User[];
  onChange: (assigneeIds: string[]) => void;
  placeholder: string;
  compact: boolean;
}) {
  const [open, setOpen] = useState(false);
  const assignees = users.filter((user) => assigneeIds.includes(user.id));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex items-center gap-1.5 rounded-md text-left hover:text-[#00B050]",
          compact ? "min-h-6 text-xs text-[#c8d3eb]" : "min-h-9 w-full border border-[#33415d] bg-[#0f1728] px-3 py-2 text-sm text-[#e7edf9]"
        )}
      >
        {assignees.length > 0 ? (
          <>
            <div className="flex -space-x-2">
              {assignees.slice(0, 3).map((assignee) => (
                <Avatar key={assignee.id} className="h-5 w-5 border border-white">
                  <AvatarFallback className="text-[9px]" style={{ backgroundColor: assignee.color + "30", color: assignee.color }}>
                    {getInitials(assignee.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className={cn("truncate", compact ? "max-w-[80px]" : "max-w-[180px]")}>
              {compact ? `${assignees.length}` : assignees.map((assignee) => assignee.name).join(", ")}
            </span>
          </>
        ) : (
          <span className={compact ? "text-[#6f7f9f]" : "text-[#8393b6]"}>{placeholder}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[190px] rounded-xl border border-[#33415d] bg-[#17233a] py-1 shadow-xl">
            <button
              onClick={() => {
                onChange([]);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#94a3c3] hover:bg-[#223150]"
            >
              <X className="h-3.5 w-3.5" />
              Unassigned
            </button>
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  onChange(
                    assigneeIds.includes(user.id)
                      ? assigneeIds.filter((id) => id !== user.id)
                      : [...assigneeIds, user.id]
                  );
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-[#223150]",
                  assigneeIds.includes(user.id) && "bg-[#10301f]"
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[9px]" style={{ backgroundColor: user.color + "30", color: user.color }}>
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-[#e7edf9]">{user.name}</span>
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
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[140px] rounded-md border border-[#33415d] bg-[#17233a] py-1 shadow-lg">
            {STATUSES.map((candidate) => {
              const candidateConfig = STATUS_CONFIG[candidate];
              return (
                <button
                  key={candidate}
                  onClick={() => {
                    onSelect(candidate);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#e7edf9] hover:bg-[#223150]"
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
