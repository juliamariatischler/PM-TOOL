"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  Inbox,
  Star,
  BarChart2,
  CheckSquare,
  Layout,
  Calendar,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  PanelLeftClose,
  PanelLeft,
  Users,
  Folder,
  FileText,
  Zap,
  Pencil,
  Trash2,
  ArrowRightLeft,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { showToast } from "@/lib/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Space, Folder as FolderType } from "@/types";

export function Sidebar({
  currentUserId,
  onCreateSpace,
  onReload,
}: {
  currentUserId: string;
  onCreateSpace: () => void;
  onReload: () => Promise<void>;
}) {
  const {
    spaces,
    inboxItems,
    selectedProjectId,
    sidebarCollapsed,
    sidebarWidth,
    toggleSidebar,
    setSidebarWidth,
    selectSpace,
    selectProject,
    setActiveView,
    setCommandOpen,
    setFilter,
  } = useAppStore();
  const unreadInboxCount = inboxItems.filter((item) => !item.readAt).length;

  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [folderSpaceId, setFolderSpaceId] = useState<string | null>(null);
  const [projectFolderId, setProjectFolderId] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState<{ id: string; name: string } | null>(null);
  const [movingFolder, setMovingFolder] = useState<{ id: string; name: string; spaceId: string } | null>(null);
  const [editingProject, setEditingProject] = useState<{ id: string; name: string; color: string; folderId: string } | null>(null);
  const [movingProject, setMovingProject] = useState<{ id: string; name: string; folderId: string } | null>(null);
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const resizeState = resizeStateRef.current;
      if (!resizeState) return;
      const nextWidth = resizeState.startWidth + (event.clientX - resizeState.startX);
      setSidebarWidth(Math.min(504, Math.max(288, nextWidth)));
    }

    function handlePointerUp() {
      resizeStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [setSidebarWidth]);

  function toggleSpace(id: string) {
    setExpandedSpaces((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleFolder(id: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function openTaskView({
    assigneeIds = [],
    createdByIds = [],
    lifecycle = "active",
  }: {
    assigneeIds?: string[];
    createdByIds?: string[];
    lifecycle?: "active" | "archived" | "deleted" | "all";
  }) {
    setActiveView("table");
    selectSpace(null);
    selectProject(null);
    setFilter("assigneeId", assigneeIds);
    setFilter("createdById", createdByIds);
    setFilter("status", []);
    setFilter("search", "");
    setFilter("lifecycle", lifecycle);
  }

  function startSidebarResize(event: React.PointerEvent<HTMLButtonElement>) {
    resizeStateRef.current = { startX: event.clientX, startWidth: sidebarWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  if (sidebarCollapsed) {
    return (
      <aside className="flex h-full w-12 flex-col items-center gap-4 border-r border-[#283754] bg-[#0f1728] py-3">
        <button onClick={toggleSidebar} className="text-gray-400 hover:text-white">
          <PanelLeft className="h-5 w-5" />
        </button>
        <button onClick={() => setCommandOpen(true)} className="text-gray-400 hover:text-white">
          <Search className="h-4 w-4" />
        </button>
        <button onClick={() => setActiveView("inbox")} className="text-gray-400 hover:text-white relative">
          <Inbox className="h-4 w-4" />
          {unreadInboxCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {Math.min(unreadInboxCount, 9)}
            </span>
          ) : null}
        </button>
        <button className="text-gray-400 hover:text-white">
          <Calendar className="h-4 w-4" />
        </button>
        <button onClick={() => setActiveView("dashboard")} className="text-gray-400 hover:text-white">
          <BarChart2 className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <>
      <aside className="relative flex h-full flex-col border-r border-[#283754] bg-[#0f1728] text-[#c8d3eb]" style={{ width: sidebarWidth }}>
        <div className="border-b border-[#283754] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-[#00B050]">
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-base font-semibold text-white">PM Tool</span>
            </div>
            <button onClick={toggleSidebar} className="text-gray-500 hover:text-white">
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          onClick={() => setCommandOpen(true)}
          className="mx-3 mt-3 flex items-center gap-2 rounded-md border border-[#2b3a58] bg-[#17233a] px-3 py-2 text-sm text-[#b7c4dd] hover:bg-[#223150]"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search</span>
          <kbd className="ml-auto rounded bg-[#2b3a58] px-1.5 py-0.5 text-[10px] text-[#d4def5]">⌘K</kbd>
        </button>

        <nav className="mt-3 space-y-0.5 px-2">
          <NavItem
            icon={<Inbox className="h-4 w-4" />}
            label="Inbox"
            badge={unreadInboxCount}
            onClick={() => {
              setActiveView("inbox");
              selectProject(null);
              selectSpace(null);
            }}
          />
          <NavItem
            icon={<CheckSquare className="h-4 w-4" />}
            label="My To-Do"
            onClick={() => openTaskView({ assigneeIds: [currentUserId] })}
          />
          <NavItem
            icon={<FileText className="h-4 w-4" />}
            label="Created by me"
            onClick={() => openTaskView({ createdByIds: [currentUserId] })}
          />
          <NavItem icon={<Star className="h-4 w-4" />} label="Starred" />
          <NavItem icon={<BarChart2 className="h-4 w-4" />} label="Reports" />
          <NavItem
            icon={<Layout className="h-4 w-4" />}
            label="Dashboards"
            onClick={() => {
              setActiveView("dashboard");
              selectProject(null);
            }}
          />
        </nav>

        <div className="mx-3 my-3 border-t border-[#283754]" />

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          <div className="mb-1 flex items-center justify-between px-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#7f91b8]">Spaces</span>
            <button onClick={onCreateSpace} className="text-gray-500 hover:text-white">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {spaces.map((space) => (
            <SpaceItem
              key={space.id}
              space={space}
              expanded={expandedSpaces.has(space.id)}
              onToggle={() => toggleSpace(space.id)}
              selectedProjectId={selectedProjectId}
              expandedFolders={expandedFolders}
              onToggleFolder={toggleFolder}
              onSelectProject={(projectId) => {
                setActiveView("table");
                setFilter("lifecycle", "active");
                selectSpace(space.id);
                selectProject(projectId);
              }}
              onSelectSpace={() => {
                setActiveView("table");
                setFilter("lifecycle", "active");
                selectSpace(space.id);
                selectProject(null);
              }}
              onDeleteSpace={async () => {
                const confirmed = window.confirm(`Space "${space.name}" wirklich loeschen? Alle Folder, Projekte und Tasks darin werden mitgeloescht.`);
                if (!confirmed) return;

                const response = await fetch(`/api/spaces/${space.id}`, { method: "DELETE" });

                if (!response.ok) {
                  showToast({ title: "Space konnte nicht gelöscht werden", variant: "error" });
                  return;
                }

                if (selectedProjectId) selectProject(null);
                selectSpace(null);
                await onReload();
              }}
              onCreateFolder={() => setFolderSpaceId(space.id)}
              onCreateProject={(folderId) => setProjectFolderId(folderId)}
              onEditFolder={(folder) => setEditingFolder(folder)}
              onMoveFolder={(folder) => setMovingFolder(folder)}
              onEditProject={(project) => setEditingProject(project)}
              onMoveProject={(project) => setMovingProject(project)}
              onDeleteProject={async (project) => {
                const confirmed = window.confirm(`Projekt "${project.name}" wirklich loeschen? Alle Tasks darin werden mitgeloescht.`);
                if (!confirmed) return;

                const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
                if (!response.ok) {
                  showToast({ title: "Projekt konnte nicht gelöscht werden", variant: "error" });
                  return;
                }

                if (selectedProjectId === project.id) selectProject(null);
                await onReload();
              }}
              onDeleteFolder={async (folder) => {
                const confirmed = window.confirm(`Folder "${folder.name}" wirklich loeschen? Alle Projekte und Tasks darin werden mitgeloescht.`);
                if (!confirmed) return;

                const response = await fetch(`/api/folders/${folder.id}`, { method: "DELETE" });
                if (!response.ok) {
                  showToast({ title: "Folder konnte nicht gelöscht werden", variant: "error" });
                  return;
                }

                await onReload();
              }}
            />
          ))}
        </div>

        <div className="border-t border-[#283754] p-3">
          <div className="mb-3 space-y-0.5">
            <NavItem icon={<Archive className="h-4 w-4" />} label="Archiviert" onClick={() => openTaskView({ lifecycle: "archived" })} />
            <NavItem icon={<Trash2 className="h-4 w-4" />} label="Papierkorb" onClick={() => openTaskView({ lifecycle: "deleted" })} />
          </div>
          <button className="flex w-full items-center gap-2 rounded-md bg-[#00B050] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#00963f]">
            <Users className="h-3.5 w-3.5" />
            Invite teammates
          </button>
        </div>

        <button
          type="button"
          aria-label="Sidebarbreite anpassen"
          onPointerDown={startSidebarResize}
          className="absolute inset-y-0 right-0 z-20 w-4 cursor-col-resize"
        />
        <div className="pointer-events-none absolute right-0 top-1/2 z-10 hidden h-24 w-px -translate-y-1/2 bg-white/25 sm:block" />
      </aside>

      <CreateFolderDialog
        open={folderSpaceId !== null}
        onClose={() => setFolderSpaceId(null)}
        onCreated={async () => {
          await onReload();
          if (folderSpaceId) {
            setExpandedSpaces((prev) => new Set(prev).add(folderSpaceId));
          }
        }}
        spaceId={folderSpaceId}
      />

      <CreateProjectDialog
        open={projectFolderId !== null}
        onClose={() => setProjectFolderId(null)}
        onCreated={async (projectId) => {
          await onReload();
          selectProject(projectId);
        }}
        folderId={projectFolderId}
      />

      <EditFolderDialog
        key={editingFolder?.id ?? "closed-edit-folder"}
        open={editingFolder !== null}
        folder={editingFolder}
        onClose={() => setEditingFolder(null)}
        onSaved={onReload}
      />

      <MoveFolderDialog
        key={movingFolder?.id ?? "closed-move-folder"}
        open={movingFolder !== null}
        folder={movingFolder}
        spaces={spaces}
        onClose={() => setMovingFolder(null)}
        onSaved={onReload}
      />

      <EditProjectDialog
        key={editingProject?.id ?? "closed-edit-project"}
        open={editingProject !== null}
        project={editingProject}
        onClose={() => setEditingProject(null)}
        onSaved={onReload}
      />

      <MoveProjectDialog
        key={movingProject?.id ?? "closed-move-project"}
        open={movingProject !== null}
        project={movingProject}
        spaces={spaces}
        onClose={() => setMovingProject(null)}
        onSaved={onReload}
      />
    </>
  );
}

function NavItem({ icon, label, badge, onClick }: { icon: React.ReactNode; label: string; badge?: number; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-[#b7c4dd] transition-colors hover:bg-[#223150] hover:text-white">
      {icon}
      <span>{label}</span>
      {badge ? (
        <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function SpaceItem({
  space,
  expanded,
  onToggle,
  selectedProjectId,
  expandedFolders,
  onToggleFolder,
  onSelectProject,
  onSelectSpace,
  onDeleteSpace,
  onCreateFolder,
  onCreateProject,
  onEditFolder,
  onMoveFolder,
  onEditProject,
  onMoveProject,
  onDeleteProject,
  onDeleteFolder,
}: {
  space: Space;
  expanded: boolean;
  onToggle: () => void;
  selectedProjectId: string | null;
  expandedFolders: Set<string>;
  onToggleFolder: (id: string) => void;
  onSelectProject: (id: string) => void;
  onSelectSpace: () => void;
  onDeleteSpace: () => Promise<void>;
  onCreateFolder: () => void;
  onCreateProject: (folderId: string) => void;
  onEditFolder: (folder: { id: string; name: string }) => void;
  onMoveFolder: (folder: { id: string; name: string; spaceId: string }) => void;
  onEditProject: (project: { id: string; name: string; color: string; folderId: string }) => void;
  onMoveProject: (project: { id: string; name: string; folderId: string }) => void;
  onDeleteProject: (project: { id: string; name: string }) => Promise<void>;
  onDeleteFolder: (folder: { id: string; name: string }) => Promise<void>;
}) {
  return (
    <div>
      <div className="group flex items-center">
        <button
          onClick={() => {
            onToggle();
            onSelectSpace();
          }}
          className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-2 text-sm hover:bg-[#223150]"
        >
          <span className="text-[#7282a5] group-hover:text-[#b7c4dd]">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>
          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: space.color }} />
          <span className="truncate text-sm font-semibold text-[#d4def5] group-hover:text-white">{space.name}</span>
        </button>
        <button
          onClick={onCreateFolder}
          className="opacity-0 transition-opacity group-hover:opacity-100 text-gray-500 hover:text-white"
          title="Folder erstellen"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => {
            void onDeleteSpace();
          }}
          className="opacity-0 transition-opacity group-hover:opacity-100 text-gray-500 hover:text-red-400"
          title="Space loeschen"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded ? (
        <div className="ml-3 border-l border-[#283754] pl-2">
          {space.folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              expanded={expandedFolders.has(folder.id)}
              onToggle={() => onToggleFolder(folder.id)}
              selectedProjectId={selectedProjectId}
              onSelectProject={onSelectProject}
              onCreateProject={() => onCreateProject(folder.id)}
              onEditFolder={() => onEditFolder({ id: folder.id, name: folder.name })}
              onMoveFolder={() => onMoveFolder({ id: folder.id, name: folder.name, spaceId: folder.spaceId })}
              onEditProject={(project) => onEditProject(project)}
              onMoveProject={(project) => onMoveProject(project)}
              onDeleteProject={(project) => void onDeleteProject(project)}
              onDeleteFolder={() => void onDeleteFolder({ id: folder.id, name: folder.name })}
            />
          ))}

          {space.folders.length === 0 ? (
            <button
              onClick={onCreateFolder}
              className="mt-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-[#8393b6] hover:bg-[#223150] hover:text-[#d4def5]"
            >
              <Plus className="h-3 w-3" />
              Folder anlegen
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FolderItem({
  folder,
  expanded,
  onToggle,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onEditFolder,
  onMoveFolder,
  onEditProject,
  onMoveProject,
  onDeleteProject,
  onDeleteFolder,
}: {
  folder: FolderType;
  expanded: boolean;
  onToggle: () => void;
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onEditFolder: () => void;
  onMoveFolder: () => void;
  onEditProject: (project: { id: string; name: string; color: string; folderId: string }) => void;
  onMoveProject: (project: { id: string; name: string; folderId: string }) => void;
  onDeleteProject: (project: { id: string; name: string }) => void;
  onDeleteFolder: () => void;
}) {
  return (
    <div>
      <div className="group flex items-center">
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-2 text-sm hover:bg-[#223150]"
        >
          <span className="text-gray-600">
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
          <Folder className="h-3.5 w-3.5 text-[#7282a5] group-hover:text-[#b7c4dd]" />
          <span className="truncate text-[#b7c4dd] group-hover:text-white">{folder.name}</span>
        </button>
        <button
          onClick={onCreateProject}
          className="opacity-0 transition-opacity group-hover:opacity-100 text-gray-500 hover:text-white"
          title="Projekt erstellen"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onEditFolder}
          className="opacity-0 transition-opacity group-hover:opacity-100 text-gray-500 hover:text-white"
          title="Folder bearbeiten"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onMoveFolder}
          className="opacity-0 transition-opacity group-hover:opacity-100 text-gray-500 hover:text-white"
          title="Folder verschieben"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDeleteFolder}
          className="opacity-0 transition-opacity group-hover:opacity-100 text-gray-500 hover:text-red-400"
          title="Folder loeschen"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded ? (
        <div className="ml-3 border-l border-[#283754]/80 pl-2">
          {folder.projects.map((project) => (
            <div key={project.id} className="group flex items-center">
              <button
                onClick={() => onSelectProject(project.id)}
                className={cn(
                "flex flex-1 items-center gap-1.5 rounded-md px-2 py-2 text-sm hover:bg-[#223150]",
                selectedProjectId === project.id && "bg-[#24406d] text-white"
              )}
            >
                <span className="h-2 w-2 flex-shrink-0 rounded-sm" style={{ backgroundColor: project.color }} />
                <span
                  className={cn(
                    "truncate",
                    selectedProjectId === project.id ? "text-white" : "text-[#aab8d3] group-hover:text-white"
                  )}
                >
                  {project.name}
                </span>
              </button>
              <button
                onClick={() => onEditProject({ id: project.id, name: project.name, color: project.color, folderId: project.folderId })}
                className="opacity-0 transition-opacity group-hover:opacity-100 text-gray-500 hover:text-white"
                title="Projekt bearbeiten"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onMoveProject({ id: project.id, name: project.name, folderId: project.folderId })}
                className="opacity-0 transition-opacity group-hover:opacity-100 text-gray-500 hover:text-white"
                title="Projekt verschieben"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDeleteProject({ id: project.id, name: project.name })}
                className="opacity-0 transition-opacity group-hover:opacity-100 text-gray-500 hover:text-red-400"
                title="Projekt loeschen"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <button
            onClick={onCreateProject}
            className="mt-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-[#8393b6] hover:bg-[#223150] hover:text-[#d4def5]"
          >
            <Plus className="h-3 w-3" />
            Projekt anlegen
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CreateFolderDialog({
  open,
  onClose,
  onCreated,
  spaceId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
  spaceId: string | null;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!spaceId || !name.trim()) return;

    setSaving(true);
    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), spaceId }),
      });

      if (!response.ok) {
        showToast({ title: "Folder konnte nicht erstellt werden", variant: "error" });
        return;
      }

      setName("");
      await onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Folder erstellen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-6">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="z. B. Vertrieb Q3"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600">
              Abbrechen
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !name.trim()}
              className="rounded-lg bg-[#00B050] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Speichert..." : "Folder erstellen"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateProjectDialog({
  open,
  onClose,
  onCreated,
  folderId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (projectId: string) => Promise<void>;
  folderId: string | null;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!folderId || !name.trim()) return;

    setSaving(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), folderId, color }),
      });

      if (!response.ok) {
        showToast({ title: "Projekt konnte nicht erstellt werden", variant: "error" });
        return;
      }

      const project = await response.json();
      setName("");
      setColor("#6366f1");
      await onCreated(project.id);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Projekt erstellen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-6">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="z. B. Website Relaunch"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-10 w-14 rounded-md border border-gray-200 bg-white p-1"
            />
            <input
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase tracking-wide text-gray-600 focus:border-[#00B050] focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600">
              Abbrechen
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !name.trim()}
              className="rounded-lg bg-[#00B050] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Speichert..." : "Projekt erstellen"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditProjectDialog({
  open,
  project,
  onClose,
  onSaved,
}: {
  open: boolean;
  project: { id: string; name: string; color: string; folderId: string } | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [color, setColor] = useState(project?.color ?? "#6366f1");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!project || !name.trim()) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color }),
      });

      if (!response.ok) return;

      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Projekt bearbeiten</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-6">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Projekt-Name"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-10 w-14 rounded-md border border-gray-200 bg-white p-1"
            />
            <input
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase tracking-wide text-gray-600 focus:border-[#00B050] focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600">
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="rounded-lg bg-[#00B050] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Speichert..." : "Speichern"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MoveProjectDialog({
  open,
  project,
  spaces,
  onClose,
  onSaved,
}: {
  open: boolean;
  project: { id: string; name: string; folderId: string } | null;
  spaces: Space[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [folderId, setFolderId] = useState(project?.folderId ?? "");
  const [saving, setSaving] = useState(false);
  const allFolders = spaces.flatMap((space) => space.folders.map((folder) => ({ ...folder, spaceName: space.name })));

  async function handleMove() {
    if (!project || !folderId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });

      if (!response.ok) return;

      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Projekt verschieben</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-6">
          <select
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
          >
            {allFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.spaceName} / {folder.name}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600">
              Abbrechen
            </button>
            <button
              onClick={handleMove}
              disabled={saving || !folderId}
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

function EditFolderDialog({
  open,
  folder,
  onClose,
  onSaved,
}: {
  open: boolean;
  folder: { id: string; name: string } | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(folder?.name ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!folder || !name.trim()) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/folders/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!response.ok) return;

      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Folder bearbeiten</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-6">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Folder-Name"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600">
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="rounded-lg bg-[#00B050] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Speichert..." : "Speichern"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MoveFolderDialog({
  open,
  folder,
  spaces,
  onClose,
  onSaved,
}: {
  open: boolean;
  folder: { id: string; name: string; spaceId: string } | null;
  spaces: Space[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [spaceId, setSpaceId] = useState(folder?.spaceId ?? "");
  const [saving, setSaving] = useState(false);

  async function handleMove() {
    if (!folder || !spaceId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/folders/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceId }),
      });

      if (!response.ok) return;

      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Folder verschieben</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-6">
          <select
            value={spaceId}
            onChange={(event) => setSpaceId(event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
          >
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600">
              Abbrechen
            </button>
            <button
              onClick={handleMove}
              disabled={saving || !spaceId}
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
