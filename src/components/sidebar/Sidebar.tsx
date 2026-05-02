"use client";
import React, { useState } from "react";
import {
  Inbox, Star, BarChart2, CheckSquare, Layout, Calendar,
  FolderOpen, ChevronRight, ChevronDown, Plus, Search,
  PanelLeftClose, PanelLeft, Users, Folder, FileText, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { Space, Folder as FolderType, Project } from "@/types";

export function Sidebar() {
  const {
    spaces, selectedSpaceId, selectedProjectId,
    sidebarCollapsed, toggleSidebar, selectSpace, selectProject,
    setCommandOpen
  } = useAppStore();

  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  function toggleSpace(id: string) {
    setExpandedSpaces(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleFolder(id: string) {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (sidebarCollapsed) {
    return (
      <aside className="flex h-full w-12 flex-col items-center border-r border-gray-200 bg-[#1a1f2e] py-3 gap-4">
        <button onClick={toggleSidebar} className="text-gray-400 hover:text-white">
          <PanelLeft className="h-5 w-5" />
        </button>
        <button onClick={() => setCommandOpen(true)} className="text-gray-400 hover:text-white">
          <Search className="h-4 w-4" />
        </button>
        <button className="text-gray-400 hover:text-white"><Inbox className="h-4 w-4" /></button>
        <button className="text-gray-400 hover:text-white"><Calendar className="h-4 w-4" /></button>
        <button className="text-gray-400 hover:text-white"><BarChart2 className="h-4 w-4" /></button>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-60 flex-col border-r border-gray-700 bg-[#1a1f2e] text-gray-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-[#00B050] flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">PM Tool</span>
        </div>
        <button onClick={toggleSidebar} className="text-gray-500 hover:text-white">
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <button
        onClick={() => setCommandOpen(true)}
        className="mx-3 mt-3 flex items-center gap-2 rounded-md bg-gray-700/50 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-700"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search</span>
        <kbd className="ml-auto text-[10px] bg-gray-600 px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>

      {/* Nav items */}
      <nav className="mt-3 px-2 space-y-0.5">
        <NavItem icon={<Inbox className="h-4 w-4" />} label="Inbox" badge={3} />
        <NavItem icon={<CheckSquare className="h-4 w-4" />} label="My To-Do" />
        <NavItem icon={<FileText className="h-4 w-4" />} label="Created by me" />
        <NavItem icon={<Star className="h-4 w-4" />} label="Starred" />
        <NavItem icon={<BarChart2 className="h-4 w-4" />} label="Reports" />
        <NavItem icon={<Layout className="h-4 w-4" />} label="Dashboards" />
      </nav>

      <div className="mx-3 my-3 border-t border-gray-700" />

      {/* Spaces */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Spaces</span>
          <button className="text-gray-500 hover:text-white">
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
            onSelectProject={(id) => { selectSpace(space.id); selectProject(id); }}
            onSelectSpace={() => { selectSpace(space.id); selectProject(null); }}
          />
        ))}
      </div>

      {/* Bottom */}
      <div className="border-t border-gray-700 p-3">
        <button className="flex w-full items-center gap-2 rounded-md bg-[#00B050] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#00963f]">
          <Users className="h-3.5 w-3.5" />
          Invite teammates
        </button>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, badge }: { icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors">
      {icon}
      <span>{label}</span>
      {badge && (
        <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

function SpaceItem({
  space, expanded, onToggle, selectedProjectId, expandedFolders,
  onToggleFolder, onSelectProject, onSelectSpace
}: {
  space: Space;
  expanded: boolean;
  onToggle: () => void;
  selectedProjectId: string | null;
  expandedFolders: Set<string>;
  onToggleFolder: (id: string) => void;
  onSelectProject: (id: string) => void;
  onSelectSpace: () => void;
}) {
  return (
    <div>
      <button
        onClick={() => { onToggle(); onSelectSpace(); }}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-gray-700/50 group"
      >
        <span className="text-gray-500 group-hover:text-gray-300">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </span>
        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: space.color }} />
        <span className="truncate text-gray-300 group-hover:text-white text-xs font-medium">{space.name}</span>
      </button>

      {expanded && (
        <div className="ml-3 border-l border-gray-700 pl-2">
          {space.folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              expanded={expandedFolders.has(folder.id)}
              onToggle={() => onToggleFolder(folder.id)}
              selectedProjectId={selectedProjectId}
              onSelectProject={onSelectProject}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FolderItem({
  folder, expanded, onToggle, selectedProjectId, onSelectProject
}: {
  folder: FolderType;
  expanded: boolean;
  onToggle: () => void;
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-gray-700/50 group"
      >
        <span className="text-gray-600">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </span>
        <Folder className="h-3.5 w-3.5 text-gray-500 group-hover:text-gray-300" />
        <span className="truncate text-gray-400 group-hover:text-gray-200">{folder.name}</span>
      </button>

      {expanded && (
        <div className="ml-3 border-l border-gray-700/50 pl-2">
          {folder.projects.map((project) => (
            <button
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className={cn(
                "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-gray-700/50 group",
                selectedProjectId === project.id && "bg-gray-700/60 text-white"
              )}
            >
              <span className="h-2 w-2 rounded-sm flex-shrink-0" style={{ backgroundColor: project.color }} />
              <span className={cn("truncate", selectedProjectId === project.id ? "text-white" : "text-gray-400 group-hover:text-gray-200")}>
                {project.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
