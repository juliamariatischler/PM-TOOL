"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Columns3,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LinkIcon,
  ListChecks,
  Plus,
  Rows3,
  Trash2,
} from "lucide-react";
import { cn, formatDate, matchesTaskLifecycle } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type {
  DashboardBlock,
  DashboardBlockType,
  DashboardPage,
  SavedTaskView,
  SavedTaskViewFilters,
  SavedTaskViewType,
  Task,
} from "@/types";

const BLOCK_OPTIONS: Array<{ type: DashboardBlockType; label: string; icon: React.ReactNode }> = [
  { type: "task_view", label: "Aufgaben", icon: <ListChecks className="h-3.5 w-3.5" /> },
  { type: "shortcuts", label: "Shortcuts", icon: <Rows3 className="h-3.5 w-3.5" /> },
  { type: "links", label: "Links", icon: <LinkIcon className="h-3.5 w-3.5" /> },
  { type: "stats", label: "Statistik", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { type: "text", label: "Notiz", icon: <FileText className="h-3.5 w-3.5" /> },
];

const VIEW_TYPES: Array<{ type: SavedTaskViewType; label: string }> = [
  { type: "table", label: "Tabelle" },
  { type: "list", label: "Liste" },
  { type: "board", label: "Board" },
];

export function DashboardView({ currentUserId }: { currentUserId: string }) {
  const { spaces, selectedSpaceId, setActiveView, selectProject, setFilter } = useAppStore();
  const [pages, setPages] = useState<DashboardPage[]>([]);
  const [savedViews, setSavedViews] = useState<SavedTaskView[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const allProjects = useMemo(
    () =>
      spaces.flatMap((space) =>
        space.folders.flatMap((folder) =>
          folder.projects.map((project) => ({
            id: project.id,
            name: project.name,
            spaceId: space.id,
            spaceName: space.name,
            tasks: project.tasks,
          }))
        )
      ),
    [spaces]
  );

  const loadDashboard = useCallback(async (signal?: AbortSignal) => {
    const scope = selectedSpaceId ? `?spaceId=${selectedSpaceId}` : "";
    const [pagesResponse, viewsResponse] = await Promise.all([
      fetch(`/api/pages${scope}`, { signal }),
      fetch("/api/saved-task-views", { signal }),
    ]);

    const nextPages = pagesResponse.ok ? await pagesResponse.json() as DashboardPage[] : [];
    const nextViews = viewsResponse.ok ? await viewsResponse.json() as SavedTaskView[] : [];
    setPages(nextPages);
    setSavedViews(nextViews);
    setActivePageId((current) => nextPages.some((page) => page.id === current) ? current : nextPages[0]?.id ?? null);
    setLoading(false);
  }, [selectedSpaceId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    loadDashboard(controller.signal).catch(() => {});
    return () => controller.abort();
  }, [loadDashboard]);

  const activePage = pages.find((page) => page.id === activePageId) ?? null;

  async function createStarterPage() {
    setCreating(true);
    const response = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: selectedSpaceId ? "Space Dashboard" : "Workspace Dashboard",
        icon: "Layout",
        spaceId: selectedSpaceId,
        template: "starter",
      }),
    });

    if (response.ok) {
      await loadDashboard();
    }
    setCreating(false);
  }

  async function createBlankPage() {
    setCreating(true);
    const response = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Neue Seite", icon: "Layout", spaceId: selectedSpaceId }),
    });

    if (response.ok) {
      const page = await response.json() as DashboardPage;
      setPages((current) => [...current, page]);
      setActivePageId(page.id);
    }
    setCreating(false);
  }

  async function addBlock(blockType: DashboardBlockType) {
    if (!activePage) return;

    let savedViewId: string | null = null;
    if (blockType === "task_view") {
      const viewResponse = await fetch("/api/saved-task-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Neue Aufgabenansicht",
          viewType: "table",
          spaceId: selectedSpaceId,
          filters: { lifecycle: "active" },
          columns: ["title", "status", "assignee", "dueDate"],
        }),
      });

      if (viewResponse.ok) {
        const view = await viewResponse.json() as SavedTaskView;
        setSavedViews((current) => [...current, view]);
        savedViewId = view.id;
      }
    }

    const response = await fetch(`/api/pages/${activePage.id}/blocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blockType,
        title: getBlockTitle(blockType),
        width: blockType === "stats" ? "full" : "half",
        position: activePage.blocks.length,
        config: savedViewId ? { savedViewId } : {},
        content: getDefaultBlockContent(blockType),
      }),
    });

    if (response.ok) {
      const block = await response.json() as DashboardBlock;
      setPages((current) => current.map((page) =>
        page.id === activePage.id ? { ...page, blocks: [...page.blocks, block] } : page
      ));
    }
  }

  async function updateBlock(blockId: string, patch: Partial<DashboardBlock>) {
    const response = await fetch(`/api/page-blocks/${blockId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (!response.ok) return;
    const block = await response.json() as DashboardBlock;
    setPages((current) => current.map((page) => ({
      ...page,
      blocks: page.blocks.map((candidate) => candidate.id === block.id ? block : candidate),
    })));
  }

  async function deleteBlock(blockId: string) {
    const response = await fetch(`/api/page-blocks/${blockId}`, { method: "DELETE" });
    if (!response.ok) return;
    setPages((current) => current.map((page) => ({
      ...page,
      blocks: page.blocks.filter((block) => block.id !== blockId),
    })));
  }

  async function moveBlock(block: DashboardBlock, direction: -1 | 1) {
    if (!activePage) return;
    const ordered = [...activePage.blocks].sort((a, b) => a.position - b.position);
    const index = ordered.findIndex((candidate) => candidate.id === block.id);
    const swap = ordered[index + direction];
    if (!swap) return;

    await Promise.all([
      updateBlock(block.id, { position: swap.position }),
      updateBlock(swap.id, { position: block.position }),
    ]);
  }

  function openTasksView(filters: SavedTaskViewFilters = {}) {
    setActiveView("table");
    selectProject(null);
    setFilter("status", filters.status ?? []);
    setFilter("assigneeId", filters.assigneeId ?? []);
    setFilter("createdById", filters.createdById ?? []);
    setFilter("search", filters.search ?? "");
    setFilter("lifecycle", filters.lifecycle ?? "active");
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center text-sm text-[#94a3c3]">Dashboard wird geladen...</div>;
  }

  return (
    <div className="h-full overflow-y-auto bg-[#111a2c]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">{activePage?.title ?? "Dashboards"}</h1>
            <p className="mt-1 text-sm text-[#8ea0c4]">
              {selectedSpaceId ? "Flexibles Dashboard für den gewählten Space" : "Flexibles Workspace-Dashboard"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => setActivePageId(page.id)}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-medium",
                  activePageId === page.id
                    ? "border-[#00B050] bg-[#10301f] text-[#8ff0ba]"
                    : "border-[#33415d] bg-[#17233a] text-[#c8d3eb] hover:bg-[#223150]"
                )}
              >
                {page.title}
              </button>
            ))}
            <button
              onClick={createBlankPage}
              disabled={creating}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#33415d] bg-[#17233a] px-3 py-2 text-sm font-medium text-[#c8d3eb] hover:bg-[#223150] disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" />
              Seite
            </button>
          </div>
        </div>

        {!activePage ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-lg border border-[#283754] bg-[#121b2f]">
            <LayoutDashboard className="h-10 w-10 text-[#7f91b8]" />
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white">Noch keine Dashboard-Seite</h2>
              <p className="mt-1 max-w-md text-sm text-[#94a3c3]">
                Starte mit einem Layout aus Shortcuts, Links, Aufgabenansichten und Statistik.
              </p>
            </div>
            <button
              onClick={createStarterPage}
              disabled={creating}
              className="rounded-md bg-[#00B050] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00963f] disabled:opacity-60"
            >
              Starter-Dashboard erstellen
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#283754] bg-[#121b2f] px-3 py-3">
              {BLOCK_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  onClick={() => addBlock(option.type)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#33415d] bg-[#17233a] px-3 py-2 text-sm text-[#d4def5] hover:bg-[#223150]"
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {[...activePage.blocks].sort((a, b) => a.position - b.position).map((block) => (
                <DashboardBlockPanel
                  key={block.id}
                  block={block}
                  className={block.width === "full" ? "lg:col-span-2" : undefined}
                  savedViews={savedViews}
                  allProjects={allProjects}
                  currentUserId={currentUserId}
                  onOpenTasksView={openTasksView}
                  onUpdate={updateBlock}
                  onDelete={deleteBlock}
                  onMove={moveBlock}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DashboardBlockPanel({
  block,
  className,
  savedViews,
  allProjects,
  currentUserId,
  onOpenTasksView,
  onUpdate,
  onDelete,
  onMove,
}: {
  block: DashboardBlock;
  className?: string;
  savedViews: SavedTaskView[];
  allProjects: Array<{ id: string; name: string; spaceId: string; spaceName: string; tasks: Task[] }>;
  currentUserId: string;
  onOpenTasksView: (filters?: SavedTaskViewFilters) => void;
  onUpdate: (blockId: string, patch: Partial<DashboardBlock>) => Promise<void>;
  onDelete: (blockId: string) => Promise<void>;
  onMove: (block: DashboardBlock, direction: -1 | 1) => Promise<void>;
}) {
  const savedViewId = typeof block.config.savedViewId === "string" ? block.config.savedViewId : null;
  const savedView = savedViews.find((view) => view.id === savedViewId) ?? null;

  return (
    <section className={cn("min-h-[220px] rounded-lg border border-[#283754] bg-[#121b2f]", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-[#22304b] px-4 py-3">
        <EditableBlockTitle
          blockId={block.id}
          title={block.title}
          onUpdate={onUpdate}
        />
        <div className="flex items-center gap-1">
          <button title="Nach oben" onClick={() => onMove(block, -1)} className="rounded p-1.5 text-[#7f91b8] hover:bg-[#223150] hover:text-white">
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button title="Nach unten" onClick={() => onMove(block, 1)} className="rounded p-1.5 text-[#7f91b8] hover:bg-[#223150] hover:text-white">
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            title="Breite wechseln"
            onClick={() => onUpdate(block.id, { width: block.width === "full" ? "half" : "full" })}
            className="rounded p-1.5 text-[#7f91b8] hover:bg-[#223150] hover:text-white"
          >
            <Columns3 className="h-3.5 w-3.5" />
          </button>
          <button title="Löschen" onClick={() => onDelete(block.id)} className="rounded p-1.5 text-[#7f91b8] hover:bg-red-500/10 hover:text-red-300">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {block.blockType === "task_view" && savedView ? (
          <TaskViewBlock
            savedView={savedView}
            allProjects={allProjects}
            onOpenTasksView={onOpenTasksView}
          />
        ) : null}
        {block.blockType === "stats" ? <StatsBlock allProjects={allProjects} currentUserId={currentUserId} /> : null}
        {block.blockType === "shortcuts" ? <ShortcutsBlock onOpenTasksView={onOpenTasksView} /> : null}
        {block.blockType === "links" ? <LinksBlock block={block} onUpdate={onUpdate} /> : null}
        {block.blockType === "text" ? <TextBlock block={block} onUpdate={onUpdate} /> : null}
      </div>
    </section>
  );
}

function TaskViewBlock({
  savedView,
  allProjects,
  onOpenTasksView,
}: {
  savedView: SavedTaskView;
  allProjects: Array<{ id: string; name: string; spaceId: string; spaceName: string; tasks: Task[] }>;
  onOpenTasksView: (filters?: SavedTaskViewFilters) => void;
}) {
  const tasks = useMemo(() => {
    const candidates = allProjects
      .filter((project) => !savedView.spaceId || project.spaceId === savedView.spaceId)
      .filter((project) => !savedView.projectId || project.id === savedView.projectId)
      .flatMap((project) => flattenTasks(project.tasks).map((task) => ({ ...task, projectName: project.name })));

    return candidates
      .filter((task) => taskMatchesSavedView(task, savedView.filters))
      .sort((a, b) => {
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
      })
      .slice(0, 8);
  }, [allProjects, savedView]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {VIEW_TYPES.map((viewType) => (
            <span
              key={viewType.type}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium",
                savedView.viewType === viewType.type ? "bg-[#10301f] text-[#8ff0ba]" : "bg-[#17233a] text-[#7f91b8]"
              )}
            >
              {viewType.label}
            </span>
          ))}
        </div>
        <button
          onClick={() => onOpenTasksView(savedView.filters)}
          className="inline-flex items-center gap-1 rounded-md border border-[#33415d] px-2.5 py-1.5 text-xs font-medium text-[#d4def5] hover:bg-[#223150]"
        >
          Oeffnen
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-md border border-dashed border-[#33415d] px-3 py-8 text-center text-sm text-[#7f91b8]">
          Keine Aufgaben in dieser Ansicht.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-[#22304b]">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onOpenTasksView(savedView.filters)}
              className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-[#22304b] px-3 py-2 text-left last:border-b-0 hover:bg-[#17233a]"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-[#eef4ff]">{task.title}</span>
                <span className="block truncate text-xs text-[#7f91b8]">{task.projectName}</span>
              </span>
              <span className="rounded-full bg-[#223150] px-2 py-1 text-xs text-[#c8d3eb]">{task.status}</span>
              <span className={cn("text-xs", task.dueDate && new Date(task.dueDate) < new Date() ? "text-red-300" : "text-[#9fb0d0]")}>
                {formatDate(task.dueDate)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EditableBlockTitle({
  blockId,
  title,
  onUpdate,
}: {
  blockId: string;
  title: string;
  onUpdate: (blockId: string, patch: Partial<DashboardBlock>) => Promise<void>;
}) {
  const [value, setValue] = useState(title);

  async function save() {
    const nextTitle = value.trim() || "Block";
    if (nextTitle !== title) {
      await onUpdate(blockId, { title: nextTitle });
    }
  }

  return (
    <input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={save}
      className="min-w-0 flex-1 bg-transparent text-base font-semibold text-white outline-none"
    />
  );
}

function StatsBlock({
  allProjects,
  currentUserId,
}: {
  allProjects: Array<{ tasks: Task[] }>;
  currentUserId: string;
}) {
  const tasks = allProjects.flatMap((project) => flattenTasks(project.tasks));
  const active = tasks.filter((task) => matchesTaskLifecycle(task, "active"));
  const dueSoon = active.filter((task) => task.dueDate && withinDays(task.dueDate, 7));
  const myTasks = active.filter((task) => task.assigneeIds.includes(currentUserId));
  const completed = active.filter((task) => task.status === "Completed");

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatTile label="Aktiv" value={active.length} />
      <StatTile label="Diese Woche" value={dueSoon.length} />
      <StatTile label="Meine Aufgaben" value={myTasks.length} />
      <StatTile label="Erledigt" value={completed.length} />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#22304b] bg-[#17233a] px-3 py-3">
      <div className="text-xs font-medium text-[#8ea0c4]">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function ShortcutsBlock({ onOpenTasksView }: { onOpenTasksView: (filters?: SavedTaskViewFilters) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => onOpenTasksView({ lifecycle: "active" })} className="rounded-md bg-[#dff2ea] px-3 py-2 text-sm font-semibold text-[#183527] hover:bg-[#ccebdd]">
        Aufgaben
      </button>
      <button onClick={() => onOpenTasksView({ lifecycle: "active", due: "week" })} className="rounded-md bg-[#e7eefc] px-3 py-2 text-sm font-semibold text-[#1f335a] hover:bg-[#d8e4fb]">
        Diese Woche
      </button>
      <button onClick={() => onOpenTasksView({ lifecycle: "archived" })} className="rounded-md bg-[#f3e8d7] px-3 py-2 text-sm font-semibold text-[#4a341d] hover:bg-[#eadbc5]">
        Archiv
      </button>
    </div>
  );
}

function LinksBlock({
  block,
  onUpdate,
}: {
  block: DashboardBlock;
  onUpdate: (blockId: string, patch: Partial<DashboardBlock>) => Promise<void>;
}) {
  const links = Array.isArray(block.content.links)
    ? block.content.links.filter((link): link is { label: string; url: string } =>
        Boolean(link) && typeof link.label === "string" && typeof link.url === "string"
      )
    : [];

  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  function validateUrl(value: string) {
    try {
      const parsed = new URL(value.startsWith("http") ? value : `https://${value}`);
      return ["https:", "http:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  async function confirmAdd() {
    if (!label.trim()) return;
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    if (!validateUrl(normalized)) {
      setUrlError("Ungültige URL");
      return;
    }
    await onUpdate(block.id, { content: { ...block.content, links: [...links, { label: label.trim(), url: normalized }] } });
    setLabel("");
    setUrl("");
    setUrlError("");
    setAdding(false);
  }

  async function removeLink(index: number) {
    await onUpdate(block.id, { content: { ...block.content, links: links.filter((_, i) => i !== index) } });
  }

  return (
    <div className="space-y-2">
      {links.map((link, index) => (
        <div key={`${link.url}-${index}`} className="group flex items-center gap-2">
          <a href={link.url} target="_blank" rel="noreferrer" className="flex flex-1 items-center gap-2 rounded-md px-2 py-2 text-sm text-[#d4def5] hover:bg-[#17233a]">
            <LinkIcon className="h-3.5 w-3.5 shrink-0 text-[#7f91b8]" />
            <span className="truncate">{link.label}</span>
          </a>
          <button
            onClick={() => removeLink(index)}
            className="opacity-0 group-hover:opacity-100 rounded p-1 text-[#7f91b8] hover:text-red-400"
            aria-label="Link entfernen"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {adding ? (
        <div className="space-y-2 rounded-md border border-[#33415d] bg-[#111a2c] p-3">
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Link-Name"
            className="w-full rounded-md border border-[#33415d] bg-[#0f1728] px-2 py-1.5 text-xs text-[#e7edf9] outline-none focus:ring-1 focus:ring-[#00B050]/50"
          />
          <div>
            <input
              value={url}
              onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
              placeholder="https://..."
              className={`w-full rounded-md border px-2 py-1.5 text-xs text-[#e7edf9] outline-none focus:ring-1 focus:ring-[#00B050]/50 bg-[#0f1728] ${urlError ? "border-red-500" : "border-[#33415d]"}`}
              onKeyDown={(e) => e.key === "Enter" && confirmAdd()}
            />
            {urlError ? <p className="mt-1 text-[10px] text-red-400">{urlError}</p> : null}
          </div>
          <div className="flex gap-2">
            <button
              onClick={confirmAdd}
              disabled={!label.trim() || !url.trim()}
              className="rounded-md bg-[#00B050] px-3 py-1 text-xs font-medium text-white hover:bg-[#00963f] disabled:opacity-50"
            >
              Hinzufügen
            </button>
            <button
              onClick={() => { setAdding(false); setLabel(""); setUrl(""); setUrlError(""); }}
              className="rounded-md border border-[#33415d] px-3 py-1 text-xs text-[#b7c4dd] hover:bg-[#223150]"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-md border border-[#33415d] px-2.5 py-1.5 text-xs font-medium text-[#d4def5] hover:bg-[#223150]">
          <Plus className="h-3 w-3" />
          Link
        </button>
      )}
    </div>
  );
}

function TextBlock({
  block,
  onUpdate,
}: {
  block: DashboardBlock;
  onUpdate: (blockId: string, patch: Partial<DashboardBlock>) => Promise<void>;
}) {
  const body = typeof block.content.body === "string" ? block.content.body : "";
  const [value, setValue] = useState(body);

  async function save() {
    if (value !== body) {
      await onUpdate(block.id, { content: { ...block.content, body: value } });
    }
  }

  return (
    <textarea
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={save}
      className="min-h-32 w-full resize-y rounded-md border border-[#33415d] bg-[#0f1728] px-3 py-2 text-sm text-[#e7edf9] outline-none focus:ring-2 focus:ring-[#00B050]/50"
      placeholder="Notiz schreiben..."
    />
  );
}

function getBlockTitle(blockType: DashboardBlockType) {
  if (blockType === "task_view") return "Aufgabenansicht";
  if (blockType === "shortcuts") return "Shortcuts";
  if (blockType === "links") return "Links";
  if (blockType === "stats") return "Überblick";
  return "Notiz";
}

function getDefaultBlockContent(blockType: DashboardBlockType) {
  if (blockType === "links") return { links: [] };
  if (blockType === "text") return { body: "" };
  if (blockType === "shortcuts") return { actions: [] };
  return {};
}

function flattenTasks(tasks: Task[]): Task[] {
  return tasks.flatMap((task) => [task, ...flattenTasks(task.subtasks)]);
}

function taskMatchesSavedView(task: Task, filters: SavedTaskViewFilters) {
  if (!matchesTaskLifecycle(task, filters.lifecycle ?? "active")) return false;
  if (filters.status?.length && !filters.status.includes(task.status)) return false;
  if (filters.assigneeId?.length && !task.assigneeIds.some((id) => filters.assigneeId?.includes(id))) return false;
  if (filters.createdById?.length && !filters.createdById.includes(task.createdById ?? "")) return false;
  if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
  if (filters.due === "overdue" && (!task.dueDate || new Date(task.dueDate) >= new Date())) return false;
  if (filters.due === "today" && (!task.dueDate || !sameDay(task.dueDate, new Date()))) return false;
  if (filters.due === "week" && (!task.dueDate || !withinDays(task.dueDate, 7))) return false;
  return true;
}

function sameDay(value: string, date: Date) {
  const target = new Date(value);
  return target.getFullYear() === date.getFullYear() &&
    target.getMonth() === date.getMonth() &&
    target.getDate() === date.getDate();
}

function withinDays(value: string, days: number) {
  const target = new Date(value).getTime();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setDate(end.getDate() + days);
  end.setHours(23, 59, 59, 999);
  return target >= now.getTime() && target <= end.getTime();
}
