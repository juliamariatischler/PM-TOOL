"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FileText, FolderOpen, Layers, Plus, Search, Star } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

type Result =
  | { kind: "task"; id: string; title: string; project: string; space: string }
  | { kind: "project"; id: string; name: string; space: string; folderId: string; spaceId: string }
  | { kind: "space"; id: string; name: string };

function searchTasks(
  tasks: import("@/types").Task[],
  q: string,
  project: string,
  space: string,
  out: Result[]
) {
  for (const task of tasks) {
    if (task.title.toLowerCase().includes(q)) {
      out.push({ kind: "task", id: task.id, title: task.title, project, space });
    }
    if (task.subtasks.length > 0) {
      searchTasks(task.subtasks, q, project, space, out);
    }
  }
}

export function CommandPalette() {
  const {
    commandOpen,
    setCommandOpen,
    spaces,
    openTask,
    setActiveView,
    selectSpace,
    selectProject,
    setFilter,
  } = useAppStore();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
      if (e.key === "Escape") setCommandOpen(false);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandOpen, setCommandOpen]);

  useEffect(() => {
    if (commandOpen) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [commandOpen]);

  const results = useMemo<Result[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const out: Result[] = [];

    for (const space of spaces) {
      if (space.name.toLowerCase().includes(q)) {
        out.push({ kind: "space", id: space.id, name: space.name });
      }
      for (const folder of space.folders) {
        for (const project of folder.projects) {
          if (project.name.toLowerCase().includes(q)) {
            out.push({ kind: "project", id: project.id, name: project.name, space: space.name, folderId: folder.id, spaceId: space.id });
          }
          searchTasks(project.tasks, q, project.name, space.name, out);
        }
      }
    }
    return out.slice(0, 10);
  }, [query, spaces]);

  function activate(result: Result) {
    if (result.kind === "task") {
      openTask(result.id);
    } else if (result.kind === "project") {
      setActiveView("table");
      setFilter("lifecycle", "active");
      setFilter("starred", undefined);
      selectSpace(result.spaceId);
      selectProject(result.id);
    } else if (result.kind === "space") {
      setActiveView("table");
      setFilter("lifecycle", "active");
      setFilter("starred", undefined);
      selectSpace(result.id);
      selectProject(null);
    }
    setCommandOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && results[selected]) {
      activate(results[selected]);
    }
  }

  if (!commandOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24"
      onClick={() => setCommandOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <Search className="h-4 w-4 flex-shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            placeholder="Tasks, Projekte, Spaces durchsuchen..."
            className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
          />
          <kbd className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">ESC</kbd>
        </div>

        {results.length > 0 ? (
          <div className="max-h-80 overflow-y-auto py-1">
            {results.map((r, i) => (
              <button
                key={`${r.kind}-${r.kind === "task" ? r.id : r.kind === "project" ? r.id : r.id}`}
                onClick={() => activate(r)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${i === selected ? "bg-gray-50" : "hover:bg-gray-50"}`}
              >
                {r.kind === "task" ? (
                  <FileText className="h-4 w-4 flex-shrink-0 text-gray-400" />
                ) : r.kind === "project" ? (
                  <FolderOpen className="h-4 w-4 flex-shrink-0 text-blue-400" />
                ) : (
                  <Layers className="h-4 w-4 flex-shrink-0 text-purple-400" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm text-gray-800">
                    {r.kind === "task" ? r.title : r.kind === "project" ? r.name : r.name}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {r.kind === "task"
                      ? `${r.space} / ${r.project}`
                      : r.kind === "project"
                      ? `Projekt · ${r.space}`
                      : "Space"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : query ? (
          <div className="py-8 text-center text-sm text-gray-400">
            Keine Ergebnisse für &quot;{query}&quot;
          </div>
        ) : (
          <div className="space-y-1 px-4 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Schnellzugriff</p>
            <button
              onClick={() => {
                setCommandOpen(false);
                useAppStore.getState().setActiveView("table");
                useAppStore.getState().setFilter("starred", true);
                useAppStore.getState().setFilter("lifecycle", "all");
                useAppStore.getState().selectSpace(null);
                useAppStore.getState().selectProject(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <Star className="h-4 w-4 text-amber-400" />
              Markierte Tasks anzeigen
            </button>
            <button
              onClick={() => {
                setCommandOpen(false);
                useAppStore.getState().setActiveView("inbox");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4 text-gray-400" />
              Zur Inbox gehen
            </button>
            <button
              onClick={() => {
                setCommandOpen(false);
                useAppStore.getState().setActiveView("dashboard");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <Layers className="h-4 w-4 text-gray-400" />
              Dashboard öffnen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
