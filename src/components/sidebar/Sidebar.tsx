"use client";
import React, { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
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
    toggleSidebar,
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

  if (sidebarCollapsed) {
    return (
      <aside className="flex h-full w-12 flex-col items-center gap-4 border-r border-gray-200 bg-[#1a1f2e] py-3">
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
        <button className="text-gray-400 hover:text-white">
          <BarChart2 className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <>
      <aside className="flex h-full w-60 flex-col border-r border-gray-700 bg-[#1a1f2e] text-gray-300">
        <div className="border-b border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-[#00B050]">
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-white">PM Tool</span>
            </div>
            <button onClick={toggleSidebar} className="text-gray-500 hover:text-white">
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          onClick={() => setCommandOpen(true)}
          className="mx-3 mt-3 flex items-center gap-2 rounded-md bg-gray-700/50 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-700"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search</span>
          <kbd className="ml-auto rounded bg-gray-600 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
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
            onClick={() => {
              setActiveView("table");
              setFilter("assigneeId", [currentUserId]);
              setFilter("createdById", []);
            }}
          />
          <NavItem
            icon={<FileText className="h-4 w-4" />}
            label="Created by me"
            onClick={() => {
              setActiveView("table");
              setFilter("createdById", [currentUserId]);
              setFilter("assigneeId", []);
            }}
          />
          <NavItem icon={<Star className="h-4 w-4" />} label="Starred" />
          <NavItem icon={<BarChart2 className="h-4 w-4" />} label="Reports" />
          <NavItem icon={<Layout className="h-4 w-4" />} label="Dashboards" />
        </nav>

        <div className="mx-3 my-3 border-t border-gray-700" />

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          <div className="mb-1 flex items-center justify-between px-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Spaces</span>
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
                selectSpace(space.id);
                selectProject(projectId);
              }}
              onSelectSpace={() => {
                setActiveView("table");
                selectSpace(space.id);
                selectProject(null);
              }}
              onCreateFolder={() => setFolderSpaceId(space.id)}
              onCreateProject={(folderId) => setProjectFolderId(folderId)}
            />
          ))}
        </div>

        <div className="border-t border-gray-700 p-3">
          <button className="flex w-full items-center gap-2 rounded-md bg-[#00B050] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#00963f]">
            <Users className="h-3.5 w-3.5" />
            Invite teammates
          </button>
        </div>
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
    </>
  );
}

function NavItem({ icon, label, badge, onClick }: { icon: React.ReactNode; label: string; badge?: number; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-700/50 hover:text-white">
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
  onCreateFolder,
  onCreateProject,
}: {
  space: Space;
  expanded: boolean;
  onToggle: () => void;
  selectedProjectId: string | null;
  expandedFolders: Set<string>;
  onToggleFolder: (id: string) => void;
  onSelectProject: (id: string) => void;
  onSelectSpace: () => void;
  onCreateFolder: () => void;
  onCreateProject: (folderId: string) => void;
}) {
  return (
    <div>
      <div className="group flex items-center">
        <button
          onClick={() => {
            onToggle();
            onSelectSpace();
          }}
          className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-gray-700/50"
        >
          <span className="text-gray-500 group-hover:text-gray-300">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>
          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: space.color }} />
          <span className="truncate text-xs font-medium text-gray-300 group-hover:text-white">{space.name}</span>
        </button>
        <button
          onClick={onCreateFolder}
          className="opacity-0 transition-opacity group-hover:opacity-100 text-gray-500 hover:text-white"
          title="Folder erstellen"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded ? (
        <div className="ml-3 border-l border-gray-700 pl-2">
          {space.folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              expanded={expandedFolders.has(folder.id)}
              onToggle={() => onToggleFolder(folder.id)}
              selectedProjectId={selectedProjectId}
              onSelectProject={onSelectProject}
              onCreateProject={() => onCreateProject(folder.id)}
            />
          ))}

          {space.folders.length === 0 ? (
            <button
              onClick={onCreateFolder}
              className="mt-1 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-700/50 hover:text-gray-200"
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
}: {
  folder: FolderType;
  expanded: boolean;
  onToggle: () => void;
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
}) {
  return (
    <div>
      <div className="group flex items-center">
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-gray-700/50"
        >
          <span className="text-gray-600">
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
          <Folder className="h-3.5 w-3.5 text-gray-500 group-hover:text-gray-300" />
          <span className="truncate text-gray-400 group-hover:text-gray-200">{folder.name}</span>
        </button>
        <button
          onClick={onCreateProject}
          className="opacity-0 transition-opacity group-hover:opacity-100 text-gray-500 hover:text-white"
          title="Projekt erstellen"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded ? (
        <div className="ml-3 border-l border-gray-700/50 pl-2">
          {folder.projects.map((project) => (
            <button
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className={cn(
                "group flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-gray-700/50",
                selectedProjectId === project.id && "bg-gray-700/60 text-white"
              )}
            >
              <span className="h-2 w-2 flex-shrink-0 rounded-sm" style={{ backgroundColor: project.color }} />
              <span
                className={cn(
                  "truncate",
                  selectedProjectId === project.id ? "text-white" : "text-gray-400 group-hover:text-gray-200"
                )}
              >
                {project.name}
              </span>
            </button>
          ))}

          {folder.projects.length === 0 ? (
            <button
              onClick={onCreateProject}
              className="mt-1 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-700/50 hover:text-gray-200"
            >
              <Plus className="h-3 w-3" />
              Projekt anlegen
            </button>
          ) : null}
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

      if (!response.ok) return;

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

      if (!response.ok) return;

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
