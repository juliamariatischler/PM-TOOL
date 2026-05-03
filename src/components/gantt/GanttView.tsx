"use client";

import React, { useMemo, useState } from "react";
import { addDays, eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth } from "date-fns";
import { CalendarDays } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { cn, STATUS_CONFIG } from "@/lib/utils";
import type { Task } from "@/types";

type TimelineTask = Task & {
  location: string;
};

const HOURS_PER_DAY = 8;

export function GanttView() {
  const { spaces, selectedSpaceId, selectedProjectId, filters, users, openTask } = useAppStore();
  const [monthOffset, setMonthOffset] = useState(0);
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const monthStart = startOfMonth(addDays(new Date(), monthOffset * 31));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const timelineTasks = useMemo(() => {
    const items: TimelineTask[] = [];

    function collect(tasks: Task[], location: string) {
      for (const task of tasks) {
        items.push({ ...task, location });
        if (task.subtasks.length > 0) {
          collect(task.subtasks, location);
        }
      }
    }

    for (const space of spaces) {
      if (selectedSpaceId && space.id !== selectedSpaceId) continue;
      for (const folder of space.folders) {
        for (const project of folder.projects) {
          if (selectedProjectId && project.id !== selectedProjectId) continue;
          collect(project.tasks, `${space.name} / ${folder.name} / ${project.name}`);
        }
      }
    }

    return items
      .filter((task) => task.startDate || task.dueDate)
      .filter((task) => {
        if (filters.status.length && !filters.status.includes(task.status)) return false;
        if (filters.assigneeId.length && !filters.assigneeId.includes(task.assigneeId ?? "")) return false;
        if (filters.createdById.length && !filters.createdById.includes(task.createdById ?? "")) return false;
        if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (assigneeFilter !== "all" && task.assigneeId !== assigneeFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const left = new Date(a.startDate ?? a.dueDate ?? a.createdAt).getTime();
        const right = new Date(b.startDate ?? b.dueDate ?? b.createdAt).getTime();
        return left - right;
      });
  }, [assigneeFilter, filters, selectedProjectId, selectedSpaceId, spaces]);

  const summary = useMemo(() => {
    const total = timelineTasks.length;
    const assigned = timelineTasks.filter((task) => task.assignee).length;
    const withRange = timelineTasks.filter((task) => task.startDate && task.dueDate).length;
    return { total, assigned, withRange };
  }, [timelineTasks]);

  const workloadByUser = users
    .map((user) => {
      const tasks = timelineTasks.filter((task) => task.assigneeId === user.id);
      const totalHours = tasks.reduce((sum, task) => sum + (task.effort || 0), 0);
      const daysPlanned = tasks.reduce((sum, task) => {
        const start = new Date(task.startDate ?? task.dueDate ?? task.createdAt);
        const end = new Date(task.dueDate ?? task.startDate ?? task.createdAt);
        const visibleDays = days.filter((day) => day >= start && day <= end).length;
        return sum + Math.max(visibleDays, 1);
      }, 0);
      const avgDailyLoad = daysPlanned > 0 ? totalHours / daysPlanned : 0;
      const utilization = Math.min(999, Math.round((avgDailyLoad / HOURS_PER_DAY) * 100));

      return {
        user,
        tasks: tasks.length,
        totalHours,
        avgDailyLoad,
        utilization,
      };
    })
    .filter((entry) => entry.tasks > 0)
    .sort((a, b) => b.totalHours - a.totalHours);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,#f7fbf8_0%,#ffffff_24%)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2 rounded-2xl border border-[#00B050]/15 bg-[#00B050]/5 px-3 py-2">
          <CalendarDays className="h-4 w-4 text-[#0e6d36]" />
          <div>
            <div className="text-sm font-semibold text-slate-900">PM Kalender</div>
            <div className="text-xs text-slate-500">
              {summary.total} Tasks, {summary.withRange} mit Zeitraum, {summary.assigned} zugewiesen
            </div>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-700 focus:border-[#00B050] focus:outline-none"
          >
            <option value="all">Alle Personen</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setMonthOffset((value) => value - 1)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-600 hover:bg-gray-50"
          >
            Zurueck
          </button>
          <div className="min-w-40 text-center text-sm font-medium text-slate-700">
            {format(monthStart, "MMMM yyyy")}
          </div>
          <button
            onClick={() => setMonthOffset((value) => value + 1)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-600 hover:bg-gray-50"
          >
            Weiter
          </button>
          <button
            onClick={() => setMonthOffset(0)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-600 hover:bg-gray-50"
          >
            Heute
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {timelineTasks.length === 0 ? (
          <div className="flex h-full min-h-[320px] items-center justify-center px-6">
            <div className="max-w-lg text-center">
              <h3 className="text-lg font-semibold text-slate-900">Keine datierten Tasks im aktuellen Filter</h3>
              <p className="mt-2 text-sm text-slate-500">
                Vergib beim Task Start- und Enddatum, damit der Zeitraum hier als Timeline sichtbar wird.
              </p>
            </div>
          </div>
        ) : (
          <div className="min-w-[1120px]">
            <div className="grid gap-3 border-b border-gray-200 bg-white px-4 py-4 md:grid-cols-2 xl:grid-cols-4">
              {workloadByUser.length > 0 ? (
                workloadByUser.map((entry) => (
                  <div key={entry.user.id} className="rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{entry.user.name}</div>
                        <div className="text-xs text-slate-500">{entry.tasks} geplante Tasks</div>
                      </div>
                      <div
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold",
                          entry.utilization > 100
                            ? "bg-red-100 text-red-600"
                            : entry.utilization >= 75
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        )}
                      >
                        {entry.utilization}%
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                      <span>{entry.totalHours.toFixed(1)}h geplant</span>
                      <span>{entry.avgDailyLoad.toFixed(1)}h / Tag</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Noch keine Auslastung sichtbar. Weise Tasks Personen zu und pflege Zeitraum plus Aufwand.
                </div>
              )}
            </div>

            <div
              className="grid border-b border-gray-200 bg-white/90 backdrop-blur"
              style={{ gridTemplateColumns: `320px repeat(${days.length}, minmax(42px, 1fr))` }}
            >
              <div className="sticky left-0 z-20 border-r border-gray-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Task / Timeline
              </div>
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border-r border-gray-100 px-1 py-2 text-center text-xs font-medium text-slate-500",
                    isSameDay(day, new Date()) && "bg-[#00B050]/8 text-[#0e6d36]"
                  )}
                >
                  <div>{format(day, "EE")}</div>
                  <div className="mt-1 text-sm font-semibold">{format(day, "d")}</div>
                </div>
              ))}
            </div>

            {timelineTasks.map((task) => {
              const start = new Date(task.startDate ?? task.dueDate ?? task.createdAt);
              const end = new Date(task.dueDate ?? task.startDate ?? task.createdAt);
              const visibleDayIndexes = days
                .map((day, index) => (day >= start && day <= end ? index : -1))
                .filter((index) => index >= 0);
              const spansCurrentMonth = visibleDayIndexes.length > 0;
              const startIndex = spansCurrentMonth ? visibleDayIndexes[0] : -1;
              const endIndex = spansCurrentMonth ? visibleDayIndexes[visibleDayIndexes.length - 1] : -1;
              const color = STATUS_CONFIG[task.status]?.color ?? "#64748b";

              return (
                <div
                  key={task.id}
                  className="grid border-b border-gray-100"
                  style={{ gridTemplateColumns: `320px repeat(${days.length}, minmax(42px, 1fr))` }}
                >
                  <button
                    onClick={() => openTask(task.id)}
                    className="sticky left-0 z-10 flex flex-col items-start border-r border-gray-200 bg-white px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="text-sm font-medium text-slate-900">{task.title}</span>
                    <span className="mt-1 text-xs text-slate-500">
                      {task.assignee?.name ?? "Nicht zugewiesen"} · {task.location}
                    </span>
                    <span className="mt-1 text-xs text-slate-400">
                      {format(start, "dd.MM.yyyy")} bis {format(end, "dd.MM.yyyy")}
                    </span>
                    <span className="mt-1 text-xs text-slate-400">
                      {task.effort.toFixed(1)}h geplant · {task.plannedCost > 0 ? `$${task.plannedCost.toFixed(0)}` : "kein Budget"}
                    </span>
                  </button>

                  {days.map((day, index) => {
                    const inRange = day >= start && day <= end;
                    const isStart = isSameDay(day, start);
                    const isEnd = isSameDay(day, end);

                    return (
                      <div key={day.toISOString()} className="relative border-r border-gray-100 px-1 py-2">
                        {spansCurrentMonth && inRange ? (
                          <div
                            className={cn(
                              "h-8 rounded-sm opacity-90",
                              isStart && "rounded-l-xl",
                              isEnd && "rounded-r-xl"
                            )}
                            style={{
                              backgroundColor: color,
                              marginLeft: index === startIndex ? 0 : -4,
                              marginRight: index === endIndex ? 0 : -4,
                            }}
                            title={`${task.title}: ${format(start, "dd.MM.yyyy")} - ${format(end, "dd.MM.yyyy")}`}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
