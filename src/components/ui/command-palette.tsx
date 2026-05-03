"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Search, FileText, FolderOpen, Layers } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export function CommandPalette() {
  const { commandOpen, setCommandOpen, spaces, openTask } = useAppStore();
  const [query, setQuery] = useState("");

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

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const tasks: { id: string; title: string; project: string; space: string }[] = [];
    for (const space of spaces) {
      for (const folder of space.folders) {
        for (const project of folder.projects) {
          for (const task of project.tasks) {
            if (task.title.toLowerCase().includes(q)) {
              tasks.push({ id: task.id, title: task.title, project: project.name, space: space.name });
            }
            for (const sub of task.subtasks) {
              if (sub.title.toLowerCase().includes(q)) {
                tasks.push({ id: sub.id, title: sub.title, project: project.name, space: space.name });
              }
            }
          }
        }
      }
    }
    return tasks.slice(0, 8);
  }, [query, spaces]);

  if (!commandOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-24" onClick={() => setCommandOpen(false)}>
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search tasks, projects, spaces..."
              className="flex-1 text-sm focus:outline-none text-gray-800 placeholder:text-gray-400"
            />
            <kbd className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">ESC</kbd>
          </div>

          {results.length > 0 ? (
            <div className="py-1 max-h-80 overflow-y-auto">
              {results.map(r => (
                <button
                  key={r.id}
                  onClick={() => { openTask(r.id); setCommandOpen(false); setQuery(""); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
                >
                  <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">{r.title}</p>
                    <p className="text-xs text-gray-400 truncate">{r.space} / {r.project}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : query ? (
            <div className="py-8 text-center text-sm text-gray-400">No results for &quot;{query}&quot;</div>
          ) : (
            <div className="py-4 px-4 space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Quick actions</p>
              <div className="flex items-center gap-2 text-sm text-gray-500 py-1"><FileText className="h-4 w-4" /> Create new task</div>
              <div className="flex items-center gap-2 text-sm text-gray-500 py-1"><FolderOpen className="h-4 w-4" /> Go to project</div>
              <div className="flex items-center gap-2 text-sm text-gray-500 py-1"><Layers className="h-4 w-4" /> Switch space</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
