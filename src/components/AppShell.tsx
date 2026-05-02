"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { TableView } from "@/components/table/TableView";
import { BoardView } from "@/components/board/BoardView";
import { WorkloadView } from "@/components/workload/WorkloadView";
import { TaskDetailPanel } from "@/components/task-detail/TaskDetailPanel";
import { CommandPalette } from "@/components/ui/command-palette";
import { MobilePlatformNotice } from "@/components/mobile/MobilePlatformNotice";
import { Loader2, FolderOpen, LogOut, Plus } from "lucide-react";
import { CreateSpaceDialog } from "@/components/sidebar/CreateSpaceDialog";

export function AppShell({ currentUser }: { currentUser: { name: string; email: string } }) {
  const { setSpaces, setUsers, activeView, selectedSpaceId, spaces } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const reload = useCallback(async () => {
    const [spacesData, usersData] = await Promise.all([
      fetch("/api/spaces").then(r => r.json()),
      fetch("/api/users").then(r => r.json()),
    ]);
    setSpaces(spacesData);
    setUsers(usersData);
  }, [setSpaces, setUsers]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

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
    <div className="flex h-full bg-white overflow-hidden">
      <Sidebar onCreateSpace={() => setCreateSpaceOpen(true)} onReload={reload} />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <MobilePlatformNotice />

        {/* Breadcrumb */}
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 bg-white px-4 py-2">
          <span className="text-sm text-gray-400">{currentSpace ? currentSpace.name : "All Spaces"}</span>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-700">{currentUser.name}</div>
              <div className="text-xs text-gray-400">{currentUser.email}</div>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
            >
              <LogOut className="h-3.5 w-3.5" />
              {loggingOut ? "..." : "Logout"}
            </button>
          </div>
        </div>

        <Toolbar />

        {/* Main content */}
        <div className="flex-1 overflow-hidden relative">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#00B050]" />
                <p className="text-sm text-gray-400">Laden...</p>
              </div>
            </div>
          ) : spaces.length === 0 ? (
            <EmptyWorkspace onCreateSpace={() => setCreateSpaceOpen(true)} />
          ) : (
            <>
              {activeView === "table" && <TableView />}
              {activeView === "board" && <BoardView />}
              {activeView === "workload" && <WorkloadView />}
              {(activeView === "gantt" || activeView === "dashboard") && <ComingSoon view={activeView} />}
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
      <div className="h-20 w-20 rounded-2xl bg-gray-100 flex items-center justify-center">
        <FolderOpen className="h-10 w-10 text-gray-300" />
      </div>
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-800">Workspace ist leer</h3>
        <p className="text-sm text-gray-400 mt-1 max-w-xs">
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
      <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center">
        <span className="text-2xl">{view === "gantt" ? "📅" : "📊"}</span>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 capitalize">{view} View</h3>
        <p className="text-sm text-gray-400 mt-1">Coming soon.</p>
      </div>
    </div>
  );
}
