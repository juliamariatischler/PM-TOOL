"use client";
import React, { useState, useMemo } from "react";
import {
  ChevronRight, ChevronDown, Plus, MoreHorizontal,
  GripVertical, Circle, CheckCircle2
} from "lucide-react";
import { cn, STATUS_CONFIG, STATUSES, formatDate, isOverdue, getInitials } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Task, Project, Space } from "@/types";

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
  const { spaces, selectedSpaceId, selectedProjectId, filters, openTask, updateTaskOptimistic, addTaskOptimistic } = useAppStore();

  const visibleData = useMemo(() => {
    if (selectedProjectId) {
      for (const space of spaces) {
        for (const folder of space.folders) {
          const proj = folder.projects.find(p => p.id === selectedProjectId);
          if (proj) return [{ space, folder, project: proj }];
        }
      }
    }
    if (selectedSpaceId) {
      const space = spaces.find(s => s.id === selectedSpaceId);
      if (!space) return [];
      return space.folders.flatMap(folder =>
        folder.projects.map(project => ({ space, folder, project }))
      );
    }
    return spaces.flatMap(space =>
      space.folders.flatMap(folder =>
        folder.projects.map(project => ({ space, folder, project }))
      )
    );
  }, [spaces, selectedSpaceId, selectedProjectId]);

  function filterTasks(tasks: Task[]): Task[] {
    return tasks
      .filter(t => {
        if (filters.status.length && !filters.status.includes(t.status)) return false;
        if (filters.assigneeId.length && !filters.assigneeId.includes(t.assigneeId ?? "")) return false;
        if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
        return true;
      })
      .map(t => ({ ...t, subtasks: filterTasks(t.subtasks) }));
  }

  async function handleAddTask(projectId: string) {
    const title = `New Task ${Date.now()}`;
    const tempTask: Task = {
      id: `temp-${Date.now()}`,
      title,
      status: "New",
      assigneeId: null,
      assignee: null,
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
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, projectId }),
    });
    if (res.ok) {
      const created = await res.json();
      updateTaskOptimistic(tempTask.id, { id: created.id });
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
            <th className="w-8 px-2 py-2.5 text-left">
              <input type="checkbox" className="rounded border-gray-300" />
            </th>
            <th className="w-6 px-1" />
            {COLUMNS.map(col => (
              <th
                key={col.key}
                className={cn("px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-800 whitespace-nowrap", col.width)}
              >
                {col.label}
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
                {tasks.map((task, idx) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    depth={0}
                    rowNum={idx + 1}
                    location={`${space.name} / ${folder.name} / ${project.name}`}
                    onOpen={() => openTask(task.id)}
                    onStatusChange={(status) => {
                      updateTaskOptimistic(task.id, { status });
                      fetch(`/api/tasks/${task.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status }),
                      });
                    }}
                  />
                ))}
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-2 py-1.5" />
                  <td className="px-1" />
                  <td colSpan={COLUMNS.length + 1} className="px-3 py-1.5">
                    <button
                      onClick={() => handleAddTask(project.id)}
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
    </div>
  );
}

function ProjectHeader({ space, folder, project }: { space: Space; folder: any; project: Project }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <>
      <tr
        className="border-b border-gray-100 bg-gray-50/80 cursor-pointer"
        onClick={() => setCollapsed(c => !c)}
      >
        <td className="px-2 py-2" />
        <td className="px-1">
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
            : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
        </td>
        <td colSpan={COLUMNS.length + 1} className="px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: project.color }} />
            <span className="text-xs font-semibold text-gray-700">{project.name}</span>
            <span className="text-xs text-gray-400">{folder.name} · {space.name}</span>
            <span className="ml-1 text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">
              {project.tasks.length}
            </span>
          </div>
        </td>
      </tr>
    </>
  );
}

function TaskRow({
  task, depth, rowNum, location, onOpen, onStatusChange
}: {
  task: Task;
  depth: number;
  rowNum: number;
  location: string;
  onOpen: () => void;
  onStatusChange: (status: string) => void;
}) {
  const { expandedTaskIds, toggleTaskExpand } = useAppStore();
  const isExpanded = expandedTaskIds.has(task.id);
  const hasSubtasks = task.subtasks.length > 0;
  const overdue = isOverdue(task.dueDate) && task.status !== "Completed";

  return (
    <>
      <tr
        className="border-b border-gray-100 hover:bg-blue-50/30 group cursor-pointer"
        onClick={onOpen}
      >
        {/* Checkbox */}
        <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            className="rounded border-gray-300 opacity-0 group-hover:opacity-100"
          />
        </td>

        {/* Expand toggle */}
        <td className="px-1" onClick={e => { e.stopPropagation(); hasSubtasks && toggleTaskExpand(task.id); }}>
          {hasSubtasks ? (
            isExpanded
              ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
              : <ChevronRight className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
          ) : <span className="w-3.5 h-3.5 block" />}
        </td>

        {/* Task Name */}
        <td className={cn("px-3 py-2 min-w-[280px]")}>
          <div className="flex items-center gap-1" style={{ paddingLeft: depth * 16 }}>
            <span
              className="text-sm text-gray-800 hover:text-[#00B050] truncate max-w-[240px]"
              title={task.title}
            >
              {task.title}
            </span>
            {hasSubtasks && (
              <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5 ml-1">
                {task.subtasks.length}
              </span>
            )}
          </div>
        </td>

        {/* Status */}
        <td className="px-3 py-2 w-32" onClick={e => e.stopPropagation()}>
          <StatusDropdown status={task.status} onSelect={onStatusChange} />
        </td>

        {/* Assignee */}
        <td className="px-3 py-2 w-28">
          {task.assignee ? (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[9px]" style={{ backgroundColor: task.assignee.color + "30", color: task.assignee.color }}>
                  {getInitials(task.assignee.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-600 truncate max-w-[60px]">{task.assignee.name.split(" ")[0]}</span>
            </div>
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
        </td>

        {/* Start Date */}
        <td className="px-3 py-2 w-28">
          <span className="text-xs text-gray-500">{formatDate(task.startDate) || "—"}</span>
        </td>

        {/* Due Date */}
        <td className="px-3 py-2 w-28">
          <span className={cn("text-xs", overdue ? "text-red-500 font-medium" : "text-gray-500")}>
            {formatDate(task.dueDate) || "—"}
          </span>
        </td>

        {/* Priority */}
        <td className="px-3 py-2 w-24">
          <span className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded",
            PRIORITY_CONFIG[task.priority]?.color ?? "text-gray-400",
            PRIORITY_CONFIG[task.priority]?.bg ?? "bg-gray-50"
          )}>
            {task.priority}
          </span>
        </td>

        {/* Effort */}
        <td className="px-3 py-2 w-20">
          <span className="text-xs text-gray-500">{task.effort.toFixed(1)}h</span>
        </td>

        {/* Planned Cost */}
        <td className="px-3 py-2 w-24">
          <span className="text-xs text-gray-500">
            {task.plannedCost > 0 ? `$${task.plannedCost.toFixed(0)}` : "—"}
          </span>
        </td>

        {/* Location */}
        <td className="px-3 py-2 w-40">
          <span className="text-xs text-gray-400 truncate max-w-[140px] block">{location}</span>
        </td>

        {/* Actions */}
        <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
          <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </td>
      </tr>

      {isExpanded && hasSubtasks && task.subtasks.map((sub, idx) => (
        <TaskRow
          key={sub.id}
          task={sub}
          depth={depth + 1}
          rowNum={idx + 1}
          location={location}
          onOpen={() => useAppStore.getState().openTask(sub.id)}
          onStatusChange={(status) => {
            useAppStore.getState().updateTaskOptimistic(sub.id, { status });
            fetch(`/api/tasks/${sub.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status }),
            });
          }}
        />
      ))}
    </>
  );
}

function StatusDropdown({ status, onSelect }: { status: string; onSelect: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["New"];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", cfg.bg, cfg.text)}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
        {cfg.label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 min-w-[140px] rounded-md border border-gray-200 bg-white shadow-lg py-1">
            {STATUSES.map(s => {
              const c = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => { onSelect(s); setOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
