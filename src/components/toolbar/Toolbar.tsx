"use client";
import React, { useState } from "react";
import {
  Table2, Kanban, Users, BarChart2, Calendar,
  Filter, SlidersHorizontal, ChevronDown, Search,
  RotateCcw, RotateCw, Link, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { ViewMode } from "@/types";

const VIEWS: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: "table",    label: "Table",    icon: <Table2 className="h-3.5 w-3.5" /> },
  { id: "board",    label: "Board",    icon: <Kanban className="h-3.5 w-3.5" /> },
  { id: "workload", label: "Workload", icon: <Users className="h-3.5 w-3.5" /> },
  { id: "gantt",    label: "Gantt",    icon: <Calendar className="h-3.5 w-3.5" /> },
  { id: "dashboard",label: "Dashboard",icon: <BarChart2 className="h-3.5 w-3.5" /> },
];

const STATUSES = ["New", "In Progress", "Under Review", "Approved", "Completed", "Cancelled"];

export function Toolbar() {
  const { activeView, setActiveView, filters, setFilter, users } = useAppStore();
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 bg-white">
      {/* View tabs */}
      <div className="flex items-center gap-0 px-4 border-b border-gray-100 overflow-x-auto">
        {VIEWS.map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap",
              activeView === view.id
                ? "border-[#00B050] text-[#00B050] font-medium"
                : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            {view.icon}
            {view.label}
          </button>
        ))}
        <button className="flex items-center gap-1 px-3 py-2.5 text-sm text-gray-400 hover:text-gray-600">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            value={filters.search}
            onChange={e => setFilter("search", e.target.value)}
            placeholder="Search tasks..."
            className="h-8 pl-8 pr-3 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B050] w-48"
          />
        </div>

        <div className="h-5 w-px bg-gray-200" />

        {/* Filter button */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen(o => !o)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm border transition-colors",
              filterOpen
                ? "border-[#00B050] text-[#00B050] bg-green-50"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filter
            {(filters.status.length + filters.assigneeId.length) > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#00B050] text-[10px] font-bold text-white">
                {filters.status.length + filters.assigneeId.length}
              </span>
            )}
          </button>

          {filterOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
              <div className="absolute top-full left-0 mt-1 z-20 w-64 rounded-xl border border-gray-200 bg-white shadow-xl p-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          const curr = filters.status;
                          setFilter("status", curr.includes(s) ? curr.filter(x => x !== s) : [...curr, s]);
                        }}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs border transition-colors",
                          filters.status.includes(s)
                            ? "border-[#00B050] bg-green-50 text-[#00B050]"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Assignee</p>
                  <div className="flex flex-wrap gap-1.5">
                    {users.map(u => (
                      <button
                        key={u.id}
                        onClick={() => {
                          const curr = filters.assigneeId;
                          setFilter("assigneeId", curr.includes(u.id) ? curr.filter(x => x !== u.id) : [...curr, u.id]);
                        }}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs border transition-colors",
                          filters.assigneeId.includes(u.id)
                            ? "border-[#00B050] bg-green-50 text-[#00B050]"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {u.name}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => { setFilter("status", []); setFilter("assigneeId", []); }}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  Clear all filters
                </button>
              </div>
            </>
          )}
        </div>

        {/* Group by */}
        <button className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Group by
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </button>

        {/* Fields */}
        <button className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
          Fields
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right tools */}
        <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded">
          <RotateCcw className="h-4 w-4" />
        </button>
        <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded">
          <RotateCw className="h-4 w-4" />
        </button>
        <button className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
          <Link className="h-3.5 w-3.5" />
          Share
        </button>
      </div>
    </div>
  );
}
