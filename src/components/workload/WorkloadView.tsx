"use client";
import React, { useMemo, useState } from "react";
import { addDays, format, startOfWeek, eachDayOfInterval, isSameDay, isWeekend } from "date-fns";
import { cn, getInitials, STATUS_CONFIG, getTaskDateRange } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Task } from "@/types";

const HOURS_PER_DAY = 8;

export function WorkloadView() {
  const { users, spaces, selectedSpaceId, selectedProjectId } = useAppStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  const allTasks = useMemo(() => {
    const result: Task[] = [];
    for (const space of spaces) {
      if (selectedSpaceId && space.id !== selectedSpaceId) continue;
      for (const folder of space.folders) {
        for (const project of folder.projects) {
          if (selectedProjectId && project.id !== selectedProjectId) continue;
          result.push(...project.tasks);
        }
      }
    }
    return result;
  }, [spaces, selectedSpaceId, selectedProjectId]);

  const filteredUsers = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase())
  );

  function getTasksForUserOnDay(userId: string, day: Date): Task[] {
    return allTasks.filter(t => {
      if (!t.assigneeIds.includes(userId)) return false;
      if (!t.startDate && !t.dueDate) return false;
      const { start, end } = getTaskDateRange(t);
      if (!start || !end) return false;
      return day >= start && day <= end;
    });
  }

  function getLoadForDay(userId: string, day: Date): number {
    const tasks = getTasksForUserOnDay(userId, day);
    return tasks.reduce((sum, t) => sum + (t.effort || 2), 0);
  }

  function toggleUser(id: string) {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200">
        <input
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 rounded-md border border-gray-200 px-3 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-[#00B050]"
        />
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="px-2 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50"
          >
            ←
          </button>
          <span className="text-sm text-gray-600">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="px-2 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50"
          >
            →
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
          >
            Today
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-gray-200">
              <th className="w-48 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                Member
              </th>
              {days.map(day => (
                <th
                  key={day.toISOString()}
                  className={cn(
                    "px-2 py-3 text-center text-xs font-semibold min-w-[80px]",
                    isWeekend(day) ? "text-gray-300" : "text-gray-500",
                    isSameDay(day, new Date()) && "text-[#00B050]"
                  )}
                >
                  <div>{format(day, "EEE")}</div>
                  <div className={cn(
                    "text-base font-bold mt-0.5",
                    isSameDay(day, new Date()) && "text-[#00B050]"
                  )}>
                    {format(day, "d")}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => {
              const isExpanded = expandedUsers.has(user.id);
              const userTasks = allTasks.filter(t => t.assigneeIds.includes(user.id));

              return (
                <React.Fragment key={user.id}>
                  <tr
                    className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleUser(user.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </span>
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs" style={{ backgroundColor: user.color + "30", color: user.color }}>
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-gray-700">{user.name}</span>
                        <span className="text-xs text-gray-400">({userTasks.length})</span>
                      </div>
                    </td>
                    {days.map(day => {
                      const load = getLoadForDay(user.id, day);
                      const pct = (load / HOURS_PER_DAY) * 100;
                      const isOver = pct > 100;
                      const isEmpty = load === 0;
                      const weekend = isWeekend(day);

                      return (
                        <td key={day.toISOString()} className={cn("px-2 py-3 text-center", weekend && "bg-gray-50/50")}>
                          {!isEmpty && (
                            <div className="flex flex-col items-center gap-0.5">
                              <div
                                className={cn(
                                  "w-10 rounded-full h-10 flex items-center justify-center text-xs font-bold",
                                  isOver
                                    ? "bg-red-100 text-red-600"
                                    : pct >= 75
                                    ? "bg-amber-100 text-amber-600"
                                    : "bg-green-100 text-green-600"
                                )}
                              >
                                {Math.round(pct)}%
                              </div>
                              <span className="text-[10px] text-gray-400">{load.toFixed(1)}h</span>
                            </div>
                          )}
                          {isEmpty && <span className="text-gray-200 text-xs">—</span>}
                        </td>
                      );
                    })}
                  </tr>

                  {isExpanded && userTasks.map(task => (
                    <tr key={task.id} className="border-b border-gray-50 bg-gray-50/40">
                      <td className="px-4 py-1.5 pl-10">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_CONFIG[task.status]?.color ?? "#6b7280" }} />
                          <span className="text-xs text-gray-600 truncate max-w-[140px]">{task.title}</span>
                        </div>
                      </td>
                      {days.map(day => {
                        const { start, end } = getTaskDateRange(task);
                        const inRange = start && end && day >= start && day <= end;

                        return (
                          <td key={day.toISOString()} className="px-2 py-1.5">
                            {inRange && (
                              <div
                                className="h-4 w-full rounded text-[9px] text-white flex items-center justify-center truncate px-1"
                                style={{ backgroundColor: STATUS_CONFIG[task.status]?.color ?? "#6b7280" }}
                              >
                                {isSameDay(day, start!) && task.title.slice(0, 8)}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
