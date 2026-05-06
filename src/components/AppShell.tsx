"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { TableView } from "@/components/table/TableView";
import { BoardView } from "@/components/board/BoardView";
import { WorkloadView } from "@/components/workload/WorkloadView";
import { InboxView } from "@/components/inbox/InboxView";
import { TaskDetailPanel } from "@/components/task-detail/TaskDetailPanel";
import { GanttView } from "@/components/gantt/GanttView";
import { CommandPalette } from "@/components/ui/command-palette";
import { Loader2, FolderOpen, LogOut, Plus } from "lucide-react";
import { CreateSpaceDialog } from "@/components/sidebar/CreateSpaceDialog";

async function fetchJson<T>(input: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(input);
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      return fallback;
    }

    if (!contentType.includes("application/json")) {
      return fallback;
    }

    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export function AppShell({ currentUser }: { currentUser: { id: string; name: string; email: string } }) {
  const { setSpaces, setUsers, setInboxItems, activeView, selectedSpaceId, spaces, openTask, selectedTaskId, taskDetailOpen } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const initialTaskHandledRef = useRef(false);

  const reload = useCallback(async () => {
    const [spacesData, usersData, inboxData] = await Promise.all([
      fetchJson("/api/spaces", []),
      fetchJson("/api/users", []),
      fetchJson("/api/inbox", []),
    ]);
    setSpaces(spacesData);
    setUsers(usersData);
    setInboxItems(inboxData);
  }, [setInboxItems, setSpaces, setUsers]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => {
    if (initialTaskHandledRef.current || typeof window === "undefined") return;
    initialTaskHandledRef.current = true;

    const taskId = new URL(window.location.href).searchParams.get("task");
    if (taskId) {
      openTask(taskId);
    }
  }, [openTask]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (taskDetailOpen && selectedTaskId) {
      url.searchParams.set("task", selectedTaskId);
    } else {
      url.searchParams.delete("task");
    }
    window.history.replaceState({}, "", url);
  }, [selectedTaskId, taskDetailOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } finally {
      setLoggingOut(false);
    }
  }

  const currentSpace = spaces.find(s => s.id === selectedSpaceId);

  return (
    <div className="flex h-full overflow-hidden bg-[#111a2c] text-[#e7edf9]">
      <Sidebar currentUserId={currentUser.id} onCreateSpace={() => setCreateSpaceOpen(true)} onReload={reload} />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between gap-4 border-b border-[#283754] bg-[#121b2f] px-5 py-3">
          <span className="text-sm font-medium text-[#b7c4dd]">{currentSpace ? currentSpace.name : "All Spaces"}</span>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-semibold text-white">{currentUser.name}</div>
              <div className="text-xs text-[#8393b6]">{currentUser.email}</div>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#33415d] bg-[#17233a] px-3 py-2 text-xs font-semibold text-[#d4def5] hover:bg-[#223150] disabled:opacity-60"
            >
              <LogOut className="h-3.5 w-3.5" />
              {loggingOut ? "..." : "Logout"}
            </button>
          </div>
        </div>

        {activeView !== "inbox" ? <Toolbar /> : null}

        {/* Main content */}
        <div className="flex-1 overflow-hidden relative">
          {loading ? (
          <div className="flex h-full items-center justify-center bg-[#111a2c]">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#00B050]" />
                <p className="text-sm text-[#94a3c3]">Laden...</p>
              </div>
            </div>
          ) : spaces.length === 0 ? (
            <EmptyWorkspace onCreateSpace={() => setCreateSpaceOpen(true)} />
          ) : (
            <>
              {activeView === "table" && <TableView currentUserId={currentUser.id} />}
              {activeView === "board" && <BoardView />}
              {activeView === "workload" && <WorkloadView />}
              {activeView === "gantt" && <GanttView />}
              {activeView === "inbox" && <InboxView />}
              {activeView === "dashboard" && <ComingSoon view={activeView} />}
            </>
          )}
        </div>
      </div>

      <TaskDetailPanel />
      <CommandPalette />

      <CreateSpaceDialog
        open={createSpaceOpen}
        onClose={() => setCreateSpaceOpen(false)}
        onCreated={reload}
      />
    </div>
  );
}

function EmptyWorkspace({ onCreateSpace }: { onCreateSpace: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-[#2b3a58] bg-[#17233a]">
        <FolderOpen className="h-10 w-10 text-[#6f7f9f]" />
      </div>
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white">Workspace ist leer</h3>
        <p className="mt-1 max-w-xs text-sm text-[#94a3c3]">
          Erstelle deinen ersten Space, um Projekte und Aufgaben zu verwalten.
        </p>
      </div>
      <button
        onClick={onCreateSpace}
        className="flex items-center gap-2 rounded-lg bg-[#00B050] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#00963f] transition-colors"
      >
        <Plus className="h-4 w-4" />
        Ersten Space erstellen
      </button>
    </div>
  );
}

function ComingSoon({ view }: { view: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-[#2b3a58] bg-[#17233a]">
        <span className="text-2xl">{view === "gantt" ? "📅" : "📊"}</span>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white capitalize">{view} View</h3>
        <p className="mt-1 text-sm text-[#94a3c3]">Coming soon.</p>
      </div>
    </div>
  );
}
