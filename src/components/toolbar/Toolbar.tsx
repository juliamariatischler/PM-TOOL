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
    <div className="border-b border-[#283754] bg-[#121b2f]">
      {/* View tabs */}
      <div className="flex items-center gap-0 overflow-x-auto border-b border-[#22304b] px-4">
        {VIEWS.map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors",
              activeView === view.id
                ? "border-[#00B050] text-[#8ff0ba]"
                : "border-transparent text-[#94a3c3] hover:text-white"
            )}
          >
            {view.icon}
            {view.label}
          </button>
        ))}
        <button className="flex items-center gap-1 px-3 py-3 text-sm text-[#7f91b8] hover:text-white">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7f91b8]" />
          <input
            value={filters.search}
            onChange={e => setFilter("search", e.target.value)}
            placeholder="Search tasks..."
            className="h-9 w-52 rounded-md border border-[#33415d] bg-[#0f1728] pl-8 pr-3 text-sm text-[#e7edf9] placeholder:text-[#6f7f9f] focus:outline-none focus:ring-2 focus:ring-[#00B050]/60"
          />
        </div>

        <div className="h-5 w-px bg-[#33415d]" />

        {/* Filter button */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen(o => !o)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
              filterOpen
                ? "border-[#00B050] bg-[#10301f] text-[#8ff0ba]"
                : "border-[#33415d] text-[#c8d3eb] hover:bg-[#223150]"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filter
            {(filters.status.length + filters.assigneeId.length + filters.createdById.length) > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#00B050] text-[10px] font-bold text-white">
                {filters.status.length + filters.assigneeId.length + filters.createdById.length}
              </span>
            )}
          </button>

          {filterOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
              <div className="absolute left-0 top-full z-20 mt-1 w-64 space-y-4 rounded-xl border border-[#33415d] bg-[#17233a] p-4 shadow-xl">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-[#94a3c3]">Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          const curr = filters.status;
                          setFilter("status", curr.includes(s) ? curr.filter(x => x !== s) : [...curr, s]);
                        }}
                        className={cn(
                          "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                          filters.status.includes(s)
                            ? "border-[#00B050] bg-[#10301f] text-[#8ff0ba]"
                            : "border-[#33415d] text-[#c8d3eb] hover:bg-[#223150]"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-[#94a3c3]">Assignee</p>
                  <div className="flex flex-wrap gap-1.5">
                    {users.map(u => (
                      <button
                        key={u.id}
                        onClick={() => {
                          const curr = filters.assigneeId;
                          setFilter("assigneeId", curr.includes(u.id) ? curr.filter(x => x !== u.id) : [...curr, u.id]);
                        }}
                        className={cn(
                          "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                          filters.assigneeId.includes(u.id)
                            ? "border-[#00B050] bg-[#10301f] text-[#8ff0ba]"
                            : "border-[#33415d] text-[#c8d3eb] hover:bg-[#223150]"
                        )}
                      >
                        {u.name}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFilter("status", []);
                    setFilter("assigneeId", []);
                    setFilter("createdById", []);
                    setFilter("lifecycle", "active");
                  }}
                  className="text-xs text-[#94a3c3] hover:text-red-300"
                >
                  Clear all filters
                </button>
              </div>
            </>
          )}
        </div>

        {/* Group by */}
        <button className="flex items-center gap-1.5 rounded-md border border-[#33415d] px-3 py-2 text-sm text-[#c8d3eb] hover:bg-[#223150]">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Group by
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </button>

        {/* Fields */}
        <button className="flex items-center gap-1.5 rounded-md border border-[#33415d] px-3 py-2 text-sm text-[#c8d3eb] hover:bg-[#223150]">
          Fields
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right tools */}
        <button className="rounded p-2 text-[#7f91b8] hover:bg-[#223150] hover:text-white">
          <RotateCcw className="h-4 w-4" />
        </button>
        <button className="rounded p-2 text-[#7f91b8] hover:bg-[#223150] hover:text-white">
          <RotateCw className="h-4 w-4" />
        </button>
        <button className="flex items-center gap-1.5 rounded-md border border-[#33415d] px-3 py-2 text-sm text-[#c8d3eb] hover:bg-[#223150]">
          <Link className="h-3.5 w-3.5" />
          Share
        </button>
      </div>
    </div>
  );
}
