"use client";
import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, MoreHorizontal } from "lucide-react";
import { cn, STATUS_CONFIG, STATUSES, formatDate, getInitials } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Task } from "@/types";

export function BoardView() {
  const { spaces, selectedSpaceId, selectedProjectId, filters, openTask, updateTaskOptimistic } = useAppStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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
    return tasks.filter(t => {
      if (filters.status.length && !filters.status.includes(t.status)) return false;
      if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [spaces, selectedSpaceId, selectedProjectId, filters]);

  const tasksByStatus = useMemo(() => {
    const map: Record<string, Task[]> = {};
    STATUSES.forEach(s => { map[s] = []; });
    allTasks.forEach(t => {
      if (map[t.status]) map[t.status].push(t);
      else map["New"].push(t);
    });
    return map;
  }, [allTasks]);

  function handleDragStart(event: DragStartEvent) {
    const task = allTasks.find(t => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    if (STATUSES.includes(newStatus)) {
      updateTaskOptimistic(taskId, { status: newStatus });
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-3 overflow-x-auto p-4">
        {STATUSES.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status] ?? []}
            onOpenTask={openTask}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} onOpen={() => {}} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({ status, tasks, onOpenTask }: { status: string; tasks: Task[]; onOpenTask: (id: string) => void }) {
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-xl border border-gray-200 bg-gray-50">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
          <span className="text-sm font-semibold text-gray-700">{cfg.label}</span>
          <span className="text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">{tasks.length}</span>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Droppable zone */}
      <SortableContext items={[status, ...tasks.map(t => t.id)]} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]" id={status}>
          {tasks.map(task => (
            <SortableTaskCard key={task.id} task={task} onOpen={() => onOpenTask(task.id)} />
          ))}
        </div>
      </SortableContext>

      {/* Add task */}
      <div className="p-2 border-t border-gray-200">
        <button className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-[#00B050]">
          <Plus className="h-3.5 w-3.5" />
          Add task
        </button>
      </div>
    </div>
  );
}

function SortableTaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
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
        "rounded-lg border border-gray-200 bg-white p-3 cursor-pointer hover:border-[#00B050]/40 hover:shadow-sm transition-all",
        isDragging && "shadow-xl rotate-1"
      )}
    >
      <p className="text-sm text-gray-800 leading-snug mb-2 line-clamp-2">{task.title}</p>

      {task.dueDate && (
        <p className={cn("text-xs mb-2", overdue ? "text-red-500" : "text-gray-400")}>
          {formatDate(task.dueDate)}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className={cn(
          "text-[10px] font-medium px-1.5 py-0.5 rounded",
          task.priority === "Critical" && "bg-red-100 text-red-600",
          task.priority === "High" && "bg-orange-100 text-orange-500",
          task.priority === "Medium" && "bg-amber-100 text-amber-600",
          task.priority === "Low" && "bg-gray-100 text-gray-500",
        )}>
          {task.priority}
        </span>

        {task.assignee && (
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[9px]" style={{ backgroundColor: task.assignee.color + "30", color: task.assignee.color }}>
              {getInitials(task.assignee.name)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {task.subtasks.length > 0 && (
        <div className="mt-2 text-xs text-gray-400">
          {task.subtasks.filter(s => s.status === "Completed").length}/{task.subtasks.length} subtasks
        </div>
      )}
    </div>
  );
}
