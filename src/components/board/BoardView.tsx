"use client";
import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Plus, MoreHorizontal } from "lucide-react";
import { cn, STATUS_CONFIG, STATUSES, formatDate, getInitials, matchesTaskLifecycle } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Task } from "@/types";

export function BoardView() {
  const { spaces, selectedSpaceId, selectedProjectId, filters, openTask, updateTaskOptimistic } = useAppStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const allTasks = useMemo(() => {
    let tasks: Task[] = [];
    for (const space of spaces) {
      if (selectedSpaceId && space.id !== selectedSpaceId) continue;
      for (const folder of space.folders) {
        for (const project of folder.projects) {
          if (selectedProjectId && project.id !== selectedProjectId) continue;
          tasks = tasks.concat(project.tasks);
        }
      }
    }

    return tasks.filter((task) => {
      if (filters.status.length && !filters.status.includes(task.status)) return false;
      if (filters.assigneeId.length && !task.assigneeIds.some((id) => filters.assigneeId.includes(id))) return false;
      if (filters.createdById.length && !filters.createdById.includes(task.createdById ?? "")) return false;
      if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (!matchesTaskLifecycle(task, filters.lifecycle)) return false;
      return true;
    });
  }, [filters, selectedProjectId, selectedSpaceId, spaces]);

  const tasksByStatus = useMemo(() => {
    const map: Record<string, Task[]> = {};
    STATUSES.forEach((status) => {
      map[status] = [];
    });
    allTasks.forEach((task) => {
      if (map[task.status]) {
        map[task.status].push(task);
      } else {
        map.New.push(task);
      }
    });
    return map;
  }, [allTasks]);

  function handleDragStart(event: DragStartEvent) {
    const task = allTasks.find((item) => item.id === event.active.id);
    setActiveTask(task ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const taskId = String(event.active.id);
    const dropId = event.over ? String(event.over.id) : null;
    if (!dropId) return;

    const nextStatus = STATUSES.includes(dropId)
      ? dropId
      : allTasks.find((task) => task.id === dropId)?.status;

    if (!nextStatus) return;

    const task = allTasks.find((item) => item.id === taskId);
    if (!task || task.status === nextStatus) return;

    updateTaskOptimistic(taskId, { status: nextStatus });
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (!response.ok) {
      updateTaskOptimistic(taskId, { status: task.status });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-3 overflow-x-auto bg-[#111a2c] p-4">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status] ?? []}
            onOpenTask={openTask}
          />
        ))}
      </div>
      <DragOverlay>{activeTask ? <TaskCard task={activeTask} onOpen={() => undefined} isDragging /> : null}</DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  tasks,
  onOpenTask,
}: {
  status: string;
  tasks: Task[];
  onOpenTask: (id: string) => void;
}) {
  const cfg = STATUS_CONFIG[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-xl border border-[#2b3a58] bg-[#17233a]">
      <div className="flex items-center justify-between border-b border-[#2b3a58] px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
          <span className="text-sm font-semibold text-white">{cfg.label}</span>
          <span className="rounded-md bg-[#0f1728] px-2 py-0.5 text-xs font-semibold text-[#94a3c3]">{tasks.length}</span>
        </div>
        <button className="text-[#7f91b8] hover:text-white">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[140px] flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors",
          isOver && "bg-[#00B050]/8"
        )}
      >
        {tasks.map((task) => (
          <DraggableTaskCard key={task.id} task={task} onOpen={() => onOpenTask(task.id)} />
        ))}
      </div>

      <div className="border-t border-[#2b3a58] p-2">
        <button className="flex w-full items-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium text-[#94a3c3] hover:bg-[#223150] hover:text-[#8ff0ba]">
          <Plus className="h-3.5 w-3.5" />
          Add task
        </button>
      </div>
    </div>
  );
}

function DraggableTaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCard task={task} onOpen={onOpen} />
    </div>
  );
}

function TaskCard({ task, onOpen, isDragging = false }: { task: Task; onOpen: () => void; isDragging?: boolean }) {
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "Completed";

  return (
    <div
      onClick={onOpen}
      className={cn(
        "cursor-pointer rounded-lg border border-[#2b3a58] bg-[#111a2c] p-3 transition-all hover:border-[#00B050]/50 hover:bg-[#1b2944]",
        isDragging && "rotate-1 shadow-xl"
      )}
    >
      <p className="mb-2 line-clamp-2 text-sm font-medium leading-snug text-[#e7edf9]">{task.title}</p>

      {task.dueDate ? (
        <p className={cn("mb-2 text-xs", overdue ? "text-red-300" : "text-[#94a3c3]")}>{formatDate(task.dueDate)}</p>
      ) : null}

      <div className="flex items-center justify-between">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-medium",
            task.priority === "Critical" && "bg-red-100 text-red-600",
            task.priority === "High" && "bg-orange-100 text-orange-500",
            task.priority === "Medium" && "bg-amber-100 text-amber-600",
            task.priority === "Low" && "bg-gray-100 text-gray-500"
          )}
        >
          {task.priority}
        </span>

        {task.assignees.length > 0 ? (
          <div className="flex -space-x-2">
            {task.assignees.slice(0, 3).map((assignee) => (
              <Avatar key={assignee.id} className="h-6 w-6 border border-[#111a2c]">
                <AvatarFallback className="text-[9px]" style={{ backgroundColor: `${assignee.color}30`, color: assignee.color }}>
                  {getInitials(assignee.name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        ) : null}
      </div>

      {task.subtasks.length > 0 ? (
        <div className="mt-2 text-xs text-[#94a3c3]">
          {task.subtasks.filter((subtask) => subtask.status === "Completed").length}/{task.subtasks.length} subtasks
        </div>
      ) : null}
    </div>
  );
}
