"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  Calendar,
  CheckSquare,
  ChevronDown,
  Clock3,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Link2,
  Loader2,
  Maximize2,
  Minimize2,
  Plus,
  Paperclip,
  Play,
  Presentation,
  Trash2,
  Send,
  Tag,
  ExternalLink,
  X,
} from "lucide-react";
import { cn, STATUS_CONFIG, STATUSES, formatDate, getInitials } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MicrosoftConnectionStatus, Task, TaskApproval, TaskComment, TaskDocument, TaskLink, User } from "@/types";

type TaskDetailTask = Task & {
  project?: { id: string; name: string };
  comments?: TaskComment[];
  documents?: TaskDocument[];
  approvals?: TaskApproval[];
  links?: TaskLink[];
};

export function TaskDetailPanel() {
  const {
    taskDetailOpen,
    selectedTaskId,
    closeTask,
    users,
    updateTaskOptimistic,
    addSubtaskOptimistic,
    spaces,
    setSpaces,
    setActiveView,
    setFilter,
    selectProject,
    selectSpace,
  } = useAppStore();
  const [task, setTask] = useState<TaskDetailTask | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskOpen, setSubtaskOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [microsoftStatus, setMicrosoftStatus] = useState<MicrosoftConnectionStatus | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [now, setNow] = useState(0);
  const [topSectionHeight, setTopSectionHeight] = useState(320);
  const [actionItemsHeight, setActionItemsHeight] = useState(180);
  const [panelWidth, setPanelWidth] = useState(880);
  const [fullWidth, setFullWidth] = useState(false);
  const [isCommentComposing, setIsCommentComposing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const resizeStateRef = useRef<
    | { mode: "height"; startY: number; startHeight: number }
    | { mode: "width"; startX: number; startWidth: number }
    | { mode: "action-items"; startY: number; startHeight: number }
    | null
  >(null);

  useEffect(() => {
    if (!selectedTaskId || !taskDetailOpen) return;

    fetch(`/api/tasks/${selectedTaskId}`)
      .then((response) => response.json())
      .then((nextTask) => {
        setTask(nextTask);
        setTitleDraft(nextTask.title);
        setDescription(nextTask.description ?? "");
      });
  }, [selectedTaskId, taskDetailOpen]);

  useEffect(() => {
    if (editingTitle) {
      titleRef.current?.focus();
    }
  }, [editingTitle]);

  useEffect(() => {
    if (!taskDetailOpen) return;

    fetch("/api/integrations/microsoft/status")
      .then((response) => (response.ok ? response.json() : null))
      .then((status) => {
        if (status) {
          setMicrosoftStatus(status as MicrosoftConnectionStatus);
        }
      });
  }, [taskDetailOpen]);

  useEffect(() => {
    if (!taskDetailOpen) return;

    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((user) => {
        if (user) {
          setCurrentUser(user as User);
        }
      });
  }, [taskDetailOpen]);

  useEffect(() => {
    if (!task?.timerStartedAt) return;
    const interval = window.setInterval(() => setNow(new Date().getTime()), 1000);
    return () => window.clearInterval(interval);
  }, [task?.timerStartedAt]);

  useEffect(() => {
    const textarea = descriptionRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    const nextHeight = textarea.scrollHeight;
    const minHeight = description.trim() ? 180 : 120;
    setActionItemsHeight((current) => {
      const clamped = Math.min(520, Math.max(minHeight, nextHeight));
      return Math.abs(current - clamped) > 4 ? clamped : current;
    });
  }, [description]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const resizeState = resizeStateRef.current;
      if (!resizeState) return;

      if (resizeState.mode === "height") {
        const nextHeight = resizeState.startHeight + (event.clientY - resizeState.startY);
        setTopSectionHeight(Math.min(560, Math.max(260, nextHeight)));
        return;
      }

      if (resizeState.mode === "action-items") {
        const nextHeight = resizeState.startHeight + (event.clientY - resizeState.startY);
        setActionItemsHeight(Math.min(520, Math.max(120, nextHeight)));
        return;
      }

      const nextWidth = resizeState.startWidth - (event.clientX - resizeState.startX);
      setPanelWidth(Math.min(window.innerWidth, Math.max(720, nextWidth)));
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
  }, []);

  async function patchTask(patch: Partial<Task>) {
    if (!task) return;

    const optimisticPatch = { ...patch } as Partial<TaskDetailTask>;
    if ("assigneeIds" in patch) {
      const assignees = users.filter((user) => patch.assigneeIds?.includes(user.id));
      optimisticPatch.assigneeIds = assignees.map((user) => user.id);
      optimisticPatch.assignees = assignees;
      optimisticPatch.assignee = assignees[0] ?? null;
      optimisticPatch.assigneeId = assignees[0]?.id ?? null;
    } else if ("assigneeId" in patch) {
      optimisticPatch.assignee = users.find((user) => user.id === patch.assigneeId) ?? null;
    }

    updateTaskOptimistic(task.id, optimisticPatch);
    setTask((prev) => (prev ? { ...prev, ...optimisticPatch } : prev));

    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (response.ok) {
      const updated = await response.json();
      updateTaskOptimistic(task.id, updated);
      setTask((prev) => (prev ? { ...prev, ...updated } : prev));
    }
  }

  async function saveTitle() {
    if (!task) return;
    const trimmedTitle = titleDraft.trim();
    if (!trimmedTitle || trimmedTitle === task.title) {
      setEditingTitle(false);
      setTitleDraft(task.title);
      return;
    }

    await patchTask({ title: trimmedTitle });
    setEditingTitle(false);
  }

  async function saveDescription() {
    if (!task) return;
    if (description === (task.description ?? "")) return;
    await patchTask({ description });
  }

  async function reloadWorkspace() {
    const response = await fetch("/api/spaces");
    if (!response.ok) return;
    const nextSpaces = await response.json();
    setSpaces(nextSpaces);
  }

  async function addSubtask() {
    if (!task || !subtaskTitle.trim()) return;

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: subtaskTitle.trim(),
        projectId: task.projectId,
        parentId: task.id,
        status: "New",
      }),
    });

    if (!response.ok) return;

    const created = await response.json();
    addSubtaskOptimistic(task.id, created);
    setTask((prev) =>
      prev
        ? {
            ...prev,
            subtasks: [...prev.subtasks, created],
          }
        : prev
    );
    setSubtaskTitle("");
    setSubtaskOpen(false);
  }

  async function addComment() {
    if (!task || !comment.trim()) return;

    const response = await fetch(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment.trim() }),
    });

    if (!response.ok) return;

    const created = (await response.json()) as TaskComment;
    setTask((prev) =>
      prev
        ? {
            ...prev,
            comments: [...(prev.comments ?? []), created],
          }
        : prev
    );
    setComment("");
  }

  async function submitCommentFromKeyboard() {
    if (!comment.trim()) return;
    await addComment();
  }

  async function deleteCurrentTask() {
    if (!task) return;

    setActionError(null);
    const previousTask = task;
    const deletedAt = new Date().toISOString();

    updateTaskOptimistic(task.id, { archivedAt: null, deletedAt });
    setTask((prev) => (prev ? { ...prev, archivedAt: null, deletedAt } : prev));
    setActiveView("table");
    selectProject(null);
    selectSpace(null);
    setFilter("status", []);
    setFilter("assigneeId", []);
    setFilter("createdById", []);
    setFilter("search", "");
    setFilter("lifecycle", "deleted");
    closeTask();

    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        archivedAt: null,
        deletedAt,
      }),
    });

    if (!response.ok) {
      let message = "Task konnte nicht in den Papierkorb verschoben werden.";
      try {
        const payload = (await response.json()) as { error?: string };
        if (payload.error) {
          message = payload.error;
        }
      } catch {
        // ignore json parse failures
      }
      updateTaskOptimistic(previousTask.id, {
        archivedAt: previousTask.archivedAt,
        deletedAt: previousTask.deletedAt,
      });
      setTask(previousTask);
      setActionError(message);
      return;
    }

    await reloadWorkspace();
  }

  async function toggleArchiveTask() {
    if (!task) return;

    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        archivedAt: task.archivedAt ? null : new Date().toISOString(),
        deletedAt: null,
      }),
    });

    if (!response.ok) return;

    const updated = await response.json();
    setTask((prev) => (prev ? { ...prev, ...updated } : prev));
    updateTaskOptimistic(task.id, updated);
    await reloadWorkspace();
  }

  async function restoreTask() {
    if (!task) return;

    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivedAt: null, deletedAt: null }),
    });

    if (!response.ok) return;

    const updated = await response.json();
    setTask((prev) => (prev ? { ...prev, ...updated } : prev));
    updateTaskOptimistic(task.id, updated);
    await reloadWorkspace();
  }

  async function addDocument(input: { title: string; url: string; documentType: TaskDocument["documentType"] }) {
    if (!task) return;

    const response = await fetch(`/api/tasks/${task.id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) return;

    const created = (await response.json()) as TaskDocument;
    setTask((prev) =>
      prev
        ? {
            ...prev,
            documents: [created, ...(prev.documents ?? [])],
          }
        : prev
    );
    setDocumentDialogOpen(false);
  }

  async function removeDocument(documentId: string) {
    const response = await fetch(`/api/task-documents/${documentId}`, {
      method: "DELETE",
    });

    if (!response.ok) return;

    setTask((prev) =>
      prev
        ? {
            ...prev,
            documents: (prev.documents ?? []).filter((document) => document.id !== documentId),
          }
        : prev
    );
  }

  async function addApproval(input: { approverUserId: string; note?: string }) {
    if (!task) return;

    const response = await fetch(`/api/tasks/${task.id}/approvals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) return;

    const created = (await response.json()) as TaskApproval;
    setTask((prev) =>
      prev
        ? {
            ...prev,
            approvals: [created, ...(prev.approvals ?? []).filter((item) => item.id !== created.id)],
          }
        : prev
    );
    setApprovalDialogOpen(false);
  }

  async function updateApproval(approvalId: string, patch: { status?: "pending" | "approved" | "rejected"; note?: string | null }) {
    const response = await fetch(`/api/task-approvals/${approvalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (!response.ok) return;

    const updated = (await response.json()) as TaskApproval;
    setTask((prev) =>
      prev
        ? {
            ...prev,
            approvals: (prev.approvals ?? []).map((approval) => (approval.id === updated.id ? updated : approval)),
          }
        : prev
    );
  }

  async function addLink(input: { linkType: "internal" | "external"; linkedTaskId?: string; title: string; url?: string }) {
    if (!task) return;

    const response = await fetch(`/api/tasks/${task.id}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) return;

    const created = (await response.json()) as TaskLink;
    setTask((prev) =>
      prev
        ? {
            ...prev,
            links: [created, ...(prev.links ?? [])],
          }
        : prev
    );
    setLinkDialogOpen(false);
  }

  async function removeLink(linkId: string) {
    const response = await fetch(`/api/task-links/${linkId}`, {
      method: "DELETE",
    });

    if (!response.ok) return;

    setTask((prev) =>
      prev
        ? {
            ...prev,
            links: (prev.links ?? []).filter((link) => link.id !== linkId),
          }
        : prev
    );
  }

  function getDisplayedActualTimeMinutes(currentTask: TaskDetailTask) {
    if (!currentTask.timerStartedAt) {
      return currentTask.actualTimeMinutes;
    }

    const startedAt = new Date(currentTask.timerStartedAt).getTime();
    const elapsedMinutes = Math.max(0, Math.floor((now - startedAt) / 60000));
    return currentTask.actualTimeMinutes + elapsedMinutes;
  }

  function formatDisplayedActualTime(currentTask: TaskDetailTask) {
    const baseSeconds = currentTask.actualTimeMinutes * 60;
    const runningSeconds = currentTask.timerStartedAt
      ? Math.max(0, Math.floor((now - new Date(currentTask.timerStartedAt).getTime()) / 1000))
      : 0;
    const totalSeconds = baseSeconds + runningSeconds;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (currentTask.timerStartedAt) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${hours}:${String(minutes).padStart(2, "0")}`;
  }

  async function toggleTimeTracking() {
    if (!task) return;

    if (task.timerStartedAt) {
      const actualTimeMinutes = getDisplayedActualTimeMinutes(task);
      await patchTask({
        actualTimeMinutes,
        timerStartedAt: null,
      });
      return;
    }

    await patchTask({
      timerStartedAt: new Date().toISOString(),
    });
  }

  if (!taskDetailOpen) return null;

  let location = "";
  if (task) {
    outer: for (const space of spaces) {
      for (const folder of space.folders) {
        for (const project of folder.projects) {
          if (project.id === task.projectId) {
            location = `${space.name} / ${folder.name} / ${project.name}`;
            break outer;
          }
        }
      }
    }
  }

  const activityItems = task?.comments ?? [];
  const displayedActualTime = task ? formatDisplayedActualTime(task) : "0:00";
  const availableDependencyTasks = spaces.flatMap((space) =>
    space.folders.flatMap((folder) =>
      folder.projects.flatMap((project) => project.tasks.flatMap((candidate) => flattenTaskTree(candidate)))
    )
  ).filter((candidate) => candidate.id !== task?.id);

  function startResizing(event: React.PointerEvent<HTMLButtonElement>) {
    resizeStateRef.current = {
      mode: "height",
      startY: event.clientY,
      startHeight: topSectionHeight,
    };
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }

  function startWidthResizing(event: React.PointerEvent<HTMLButtonElement>) {
    setFullWidth(false);
    resizeStateRef.current = {
      mode: "width",
      startX: event.clientX,
      startWidth: panelWidth,
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function startActionItemsResizing(event: React.PointerEvent<HTMLButtonElement>) {
    resizeStateRef.current = {
      mode: "action-items",
      startY: event.clientY,
      startHeight: actionItemsHeight,
    };
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={closeTask} />

      <div
        className="fixed right-0 top-0 z-50 flex h-full flex-col border-l border-gray-200 bg-white shadow-2xl"
        style={{ width: fullWidth ? "100vw" : `${panelWidth}px`, maxWidth: "100vw" }}
      >
        <button
          type="button"
          aria-label="Panelbreite anpassen"
          onPointerDown={startWidthResizing}
          className="absolute left-0 top-0 z-50 h-full w-5 -translate-x-1/2 cursor-col-resize"
        />
        <div className="pointer-events-none absolute left-0 top-1/2 z-40 hidden h-24 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-300/80 sm:block" />
        {!task ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#00B050]" />
          </div>
        ) : (
          <>
            <div className="border-b border-gray-100 overflow-y-auto" style={{ height: topSectionHeight }}>
              <div className="px-7 pb-4 pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {editingTitle ? (
                      <input
                        ref={titleRef}
                        value={titleDraft}
                        onChange={(event) => setTitleDraft(event.target.value)}
                        onBlur={saveTitle}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            saveTitle();
                          }
                        }}
                        className="w-full border-b-2 border-[#00B050] bg-transparent text-[1.75rem] font-semibold leading-tight text-gray-900 focus:outline-none"
                      />
                    ) : (
                      <h2
                        onClick={() => setEditingTitle(true)}
                        className="cursor-text truncate text-[1.75rem] font-semibold leading-tight text-gray-900"
                      >
                        {task.title}
                      </h2>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-600">
                        {location || "No project context"}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-[#00B050] px-3 py-1 text-sm font-semibold text-white">
                        {task.subtasks.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-gray-400">
                    <button
                      onClick={() => setFullWidth((current) => !current)}
                      className="rounded-md p-2 hover:bg-gray-100 hover:text-gray-600"
                    >
                      {fullWidth ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                    <button className="rounded-md p-2 hover:bg-gray-100 hover:text-gray-600">
                      <Link2 className="h-4 w-4" />
                    </button>
                    <button className="rounded-md p-2 hover:bg-gray-100 hover:text-gray-600">
                      <Tag className="h-4 w-4" />
                    </button>
                    <button
                      onClick={closeTask}
                      className="rounded-md p-2 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <TaskMetaCard
                    label="Status"
                    value={
                      <StatusSelector
                        status={task.status}
                        onChange={(status) => patchTask({ status })}
                      />
                    }
                  />
                  <TaskMetaCard
                    label="Assignee"
                    value={
                      <AssigneeSelector
                        assigneeIds={task.assigneeIds}
                        onChange={(assigneeIds) => patchTask({ assigneeIds })}
                      />
                    }
                  />
                  <TaskMetaCard
                    label="Start"
                    value={
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <input
                          type="date"
                          value={task.startDate ? task.startDate.slice(0, 10) : ""}
                          onChange={(event) => patchTask({ startDate: event.target.value || null })}
                          className="w-full bg-transparent text-sm text-gray-700 focus:outline-none"
                        />
                      </div>
                    }
                  />
                  <TaskMetaCard
                    label="Ende"
                    value={
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <input
                          type="date"
                          value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                          onChange={(event) => patchTask({ dueDate: event.target.value || null })}
                          className="w-full bg-transparent text-sm text-gray-700 focus:outline-none"
                        />
                      </div>
                    }
                  />
                  <TaskMetaCard
                    label="Prioritaet"
                    value={
                      <select
                        value={task.priority}
                        onChange={(event) => patchTask({ priority: event.target.value })}
                        className="w-full bg-transparent text-sm text-gray-700 focus:outline-none"
                      >
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    }
                  />
                  <TaskMetaCard
                    label="Aufwand / Kosten"
                    value={
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={String(task.effort)}
                            onChange={(event) => patchTask({ effort: Number(event.target.value || 0) })}
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-700 focus:outline-none"
                          />
                          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-2">
                            <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={String(task.plannedCost)}
                              onChange={(event) => patchTask({ plannedCost: Number(event.target.value || 0) })}
                              className="w-full bg-transparent text-sm text-gray-700 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          Tatsaechliche Zeit: <span className="font-semibold text-gray-700">{displayedActualTime}</span>
                        </div>
                      </div>
                    }
                  />
                </div>

                <div className="mt-3 flex justify-end">
                  {task.deletedAt ? (
                    <button
                      onClick={restoreTask}
                      className="mr-2 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      Wiederherstellen
                    </button>
                  ) : (
                    <button
                      onClick={toggleArchiveTask}
                      className="mr-2 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
                    >
                      {task.archivedAt ? "Aus Archiv holen" : "Archivieren"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void deleteCurrentTask();
                    }}
                    disabled={Boolean(task.deletedAt)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    {task.deletedAt ? "Im Papierkorb" : "In Papierkorb"}
                  </button>
                </div>
                {actionError ? (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {actionError}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2 border-t border-gray-100 px-7 py-3 text-sm text-gray-500">
                <TaskActionChip
                  icon={<CheckSquare className="h-4 w-4" />}
                  label="Add subitem"
                  onClick={() => setSubtaskOpen((current) => !current)}
                />
                <TaskActionChip icon={<Paperclip className="h-4 w-4" />} label="Add files" onClick={() => setDocumentDialogOpen(true)} />
                <TaskActionChip icon={<CheckSquare className="h-4 w-4" />} label="Add approval" onClick={() => setApprovalDialogOpen(true)} />
                <TaskActionChip icon={<Link2 className="h-4 w-4" />} label="Add dependency" onClick={() => setLinkDialogOpen(true)} />
                <span className="mx-1 h-5 w-px bg-gray-200" />
                <TaskActionChip
                  icon={<Play className="h-4 w-4" />}
                  label={displayedActualTime}
                  onClick={toggleTimeTracking}
                />
              </div>
            </div>

            <div className="border-b border-gray-100 px-7 py-2">
              <button
                type="button"
                aria-label="Bereichsgroesse anpassen"
                onPointerDown={startResizing}
                className="group flex w-full cursor-row-resize items-center justify-center"
              >
                <span className="h-1.5 w-16 rounded-full bg-gray-200 transition-colors group-hover:bg-gray-300" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-7 py-5">
              {subtaskOpen ? (
                <div className="mb-4 flex gap-2 rounded-2xl border border-[#00B050]/30 bg-[#00B050]/5 p-3">
                  <input
                    value={subtaskTitle}
                    onChange={(event) => setSubtaskTitle(event.target.value)}
                    placeholder="Subtask title"
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
                  />
                  <Button size="sm" onClick={addSubtask} disabled={!subtaskTitle.trim()}>
                    Hinzufugen
                  </Button>
                </div>
              ) : null}

              <section className="rounded-3xl border-2 border-[#00B050] bg-white p-4 shadow-[0_8px_30px_rgba(18,85,42,0.06)]">
                <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3 text-sm text-gray-500">
                  <button className="rounded-md px-2 py-1 font-semibold text-gray-700 hover:bg-gray-100">H</button>
                  <button className="rounded-md px-2 py-1 font-semibold text-gray-700 hover:bg-gray-100">B</button>
                  <button className="rounded-md px-2 py-1 font-semibold text-gray-700 hover:bg-gray-100">I</button>
                  <button className="rounded-md px-2 py-1 font-semibold text-gray-700 hover:bg-gray-100">U</button>
                  <span className="h-5 w-px bg-gray-200" />
                  <button className="rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100">1.</button>
                  <button className="rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100">-</button>
                  <button className="rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100">Link</button>
                  <button className="rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100">Table</button>
                </div>

                <label className="mb-2 block text-sm font-semibold text-gray-600">Action Items:</label>

                <div className="rounded-2xl border border-gray-200 bg-slate-50/50 p-3">
                  <textarea
                    ref={descriptionRef}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    onKeyDown={(event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                        event.preventDefault();
                        void saveDescription();
                      }
                    }}
                    placeholder="Describe the task, scope, stakeholders, and next action items..."
                    style={{ height: actionItemsHeight }}
                    className="w-full overflow-y-auto resize-none bg-transparent text-[1.02rem] leading-8 text-gray-800 focus:outline-none"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void saveDescription()}
                      className="rounded-lg bg-[#00B050] px-3 py-2 text-sm font-medium text-white hover:bg-[#00963f]"
                    >
                      Action Items speichern
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex justify-center">
                  <button
                    type="button"
                    aria-label="Action-Items-Hoehe anpassen"
                    onPointerDown={startActionItemsResizing}
                    className="group flex w-full cursor-row-resize items-center justify-center py-1"
                  >
                    <span className="h-1.5 w-14 rounded-full bg-gray-200 transition-colors group-hover:bg-gray-300" />
                  </button>
                </div>

                {task.subtasks.length > 0 ? (
                  <div className="mt-3 space-y-2 border-t border-gray-100 pt-4">
                    {task.subtasks.map((subtask) => (
                      <label key={subtask.id} className="flex items-start gap-3 text-base text-gray-700">
                        <input
                          type="checkbox"
                          checked={subtask.status === "Completed"}
                          onChange={() =>
                            fetch(`/api/tasks/${subtask.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                status: subtask.status === "Completed" ? "New" : "Completed",
                              }),
                            }).then(async (response) => {
                              if (!response.ok) return;
                              const updated = await response.json();
                              setTask((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      subtasks: prev.subtasks.map((item) =>
                                        item.id === subtask.id ? updated : item
                                      ),
                                    }
                                  : prev
                              );
                              updateTaskOptimistic(subtask.id, updated);
                            })
                          }
                          className="mt-1 h-4 w-4 rounded border-gray-300"
                        />
                        <span className={cn(subtask.status === "Completed" && "text-gray-400 line-through")}>
                          {subtask.title}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Approvals</h3>
                  <p className="mt-1 text-xs text-gray-500">Zugewiesene Personen koennen den Task pruefen und freigeben.</p>
                </div>

                <div className="space-y-3">
                  {(task.approvals ?? []).length > 0 ? (
                    (task.approvals ?? []).map((approval) => {
                      const canAct = currentUser?.id === approval.approver.id && approval.status === "pending";

                      return (
                        <div key={approval.id} className="rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{approval.approver.name}</div>
                              <div className="mt-1 text-xs text-gray-500">
                                Status: <span className="font-semibold capitalize text-gray-700">{approval.status}</span>
                              </div>
                              {approval.note ? <div className="mt-1 text-xs text-gray-500">{approval.note}</div> : null}
                            </div>
                            {canAct ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateApproval(approval.id, { status: "approved" })}
                                  className="rounded-lg bg-green-100 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-200"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => updateApproval(approval.id, { status: "rejected" })}
                                  className="rounded-lg bg-red-100 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-200"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-5 text-sm text-gray-500">
                      Noch keine Freigabe angelegt.
                    </div>
                  )}
                </div>
              </section>

              <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Dependencies und externe Tasks</h3>
                  <p className="mt-1 text-xs text-gray-500">Interne Abhaengigkeiten oder externe Task-Links am Vorgang speichern.</p>
                </div>

                <div className="space-y-3">
                  {(task.links ?? []).length > 0 ? (
                    (task.links ?? []).map((link) => (
                      <div key={link.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{link.title}</div>
                          <div className="mt-1 text-xs text-gray-500">
                            {link.linkType === "internal" ? "Interner Task" : "Externer Task"}
                            {link.linkedTaskTitle ? ` · ${link.linkedTaskTitle}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {link.linkType === "internal" && link.linkedTaskId ? (
                            <button
                              onClick={() => useAppStore.getState().openTask(link.linkedTaskId!)}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                            >
                              Oeffnen
                            </button>
                          ) : null}
                          {link.linkType === "external" && link.url ? (
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Oeffnen
                            </a>
                          ) : null}
                          <button
                            onClick={() => removeLink(link.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 hover:bg-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Entfernen
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-5 text-sm text-gray-500">
                      Noch keine Dependencies oder externen Task-Links vorhanden.
                    </div>
                  )}
                </div>
              </section>

              <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Microsoft-Dokumente</h3>
                    <p className="mt-1 text-xs text-gray-500">Word, Excel, PowerPoint oder OneDrive-Dateien zum Task verlinken.</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {!microsoftStatus?.configured ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700">
                          Microsoft OAuth noch nicht konfiguriert
                        </span>
                      ) : microsoftStatus.connected ? (
                        <span className="rounded-full bg-green-100 px-2.5 py-1 font-medium text-green-700">
                          Verbunden als {microsoftStatus.email ?? "Microsoft-User"}
                        </span>
                      ) : (
                        <a
                          href="/api/integrations/microsoft/connect"
                          className="rounded-full bg-blue-100 px-2.5 py-1 font-medium text-blue-700 hover:bg-blue-200"
                        >
                          Mit Microsoft verbinden
                        </a>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setDocumentDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Dokument
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  {(task.documents ?? []).length > 0 ? (
                    (task.documents ?? []).map((document) => (
                      <div key={document.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <DocumentIcon type={document.documentType} />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{document.title}</div>
                            <div className="text-xs text-gray-500">{document.provider} · {document.documentType}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={document.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Oeffnen
                          </a>
                          <button
                            onClick={() => removeDocument(document.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 hover:bg-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Entfernen
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-5 text-sm text-gray-500">
                      Noch kein Microsoft-Dokument verknuepft.
                    </div>
                  )}
                </div>
              </section>

              <section className="mt-8">
                <div className="text-center text-sm font-medium text-gray-400">This month</div>
                <div className="mt-4 space-y-4">
                  {activityItems.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <Avatar className="mt-1 h-9 w-9 flex-shrink-0">
                        <AvatarFallback
                          className="text-[11px]"
                          style={{ backgroundColor: `${item.author.color}25`, color: item.author.color }}
                        >
                          {getInitials(item.author.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800">{item.author.name}</span>
                          <span className="text-xs text-gray-400">{formatDate(item.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-500">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="border-t border-gray-100 px-7 py-5">
              <div className="rounded-2xl border-2 border-[#00B050] bg-white px-4 py-3">
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  onCompositionStart={() => setIsCommentComposing(true)}
                  onCompositionEnd={() => setIsCommentComposing(false)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || event.shiftKey || isCommentComposing) {
                      return;
                    }
                    event.preventDefault();
                    void submitCommentFromKeyboard();
                  }}
                  placeholder="Add a comment... Use @julia or @rafaela"
                  rows={comment.trim() ? 3 : 1}
                  className="w-full resize-none bg-transparent text-base text-gray-700 placeholder:text-gray-400 focus:outline-none"
                />
                <p className="mt-2 text-xs text-gray-400">
                  Mentions work with simple handles like `@julia`, `@rafaela`, `@amy`.
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-gray-400">
                    <Paperclip className="h-4 w-4" />
                    <Link2 className="h-4 w-4" />
                    <Clock3 className="h-4 w-4" />
                  </div>
                  <Button
                    size="sm"
                    disabled={!comment.trim()}
                    onClick={addComment}
                    className="rounded-xl px-5"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <AddDocumentDialog
        open={documentDialogOpen}
        onClose={() => setDocumentDialogOpen(false)}
        onCreate={addDocument}
      />
      <AddApprovalDialog
        open={approvalDialogOpen}
        onClose={() => setApprovalDialogOpen(false)}
        onCreate={addApproval}
        users={users}
      />
      <AddLinkDialog
        open={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        onCreate={addLink}
        tasks={availableDependencyTasks}
      />
    </>
  );
}

function flattenTaskTree(task: Task): Task[] {
  return [task, ...task.subtasks.flatMap((subtask) => flattenTaskTree(subtask))];
}

function TaskMetaCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-[#f8fafc] px-4 py-3">
      <div className="mb-2 text-sm font-medium text-gray-500">{label}</div>
      {value}
    </div>
  );
}

function TaskActionChip({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function DocumentIcon({ type }: { type: TaskDocument["documentType"] }) {
  if (type === "excel") return <FileSpreadsheet className="h-4 w-4 text-emerald-600" />;
  if (type === "powerpoint") return <Presentation className="h-4 w-4 text-orange-500" />;
  return <FileText className="h-4 w-4 text-blue-600" />;
}

function AddDocumentDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { title: string; url: string; documentType: TaskDocument["documentType"] }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [documentType, setDocumentType] = useState<TaskDocument["documentType"]>("word");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim() || !url.trim()) return;
    setSaving(true);
    try {
      await onCreate({ title: title.trim(), url: url.trim(), documentType });
      setTitle("");
      setUrl("");
      setDocumentType("word");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Microsoft-Dokument verlinken</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Titel</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="z. B. Angebot Version 3"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Typ</label>
            <select
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value as TaskDocument["documentType"])}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
            >
              <option value="word">Word</option>
              <option value="excel">Excel</option>
              <option value="powerpoint">PowerPoint</option>
              <option value="file">Datei</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Microsoft-Link</label>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={saving || !title.trim() || !url.trim()}>
              {saving ? "Speichert..." : "Verlinken"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddApprovalDialog({
  open,
  onClose,
  onCreate,
  users,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { approverUserId: string; note?: string }) => Promise<void>;
  users: User[];
}) {
  const [approverUserId, setApproverUserId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!approverUserId) return;
    setSaving(true);
    try {
      await onCreate({ approverUserId, note: note.trim() || undefined });
      setApproverUserId("");
      setNote("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Approval anfragen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Person</label>
            <select
              value={approverUserId}
              onChange={(event) => setApproverUserId(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
            >
              <option value="">Bitte waehlen</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Notiz</label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="Optional: was genau geprueft werden soll"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={saving || !approverUserId}>
              {saving ? "Speichert..." : "Approval anlegen"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddLinkDialog({
  open,
  onClose,
  onCreate,
  tasks,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { linkType: "internal" | "external"; linkedTaskId?: string; title: string; url?: string }) => Promise<void>;
  tasks: Task[];
}) {
  const [linkType, setLinkType] = useState<"internal" | "external">("internal");
  const [linkedTaskId, setLinkedTaskId] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    if (linkType === "internal" && !linkedTaskId) return;
    if (linkType === "external" && !url.trim()) return;

    setSaving(true);
    try {
      await onCreate({
        linkType,
        linkedTaskId: linkType === "internal" ? linkedTaskId : undefined,
        title: title.trim(),
        url: linkType === "external" ? url.trim() : undefined,
      });
      setLinkedTaskId("");
      setTitle("");
      setUrl("");
      setLinkType("internal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dependency oder externer Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Typ</label>
            <select
              value={linkType}
              onChange={(event) => setLinkType(event.target.value as "internal" | "external")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
            >
              <option value="internal">Interner Task</option>
              <option value="external">Externer Task</option>
            </select>
          </div>
          {linkType === "internal" ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Task</label>
              <select
                value={linkedTaskId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setLinkedTaskId(nextId);
                  const selectedTask = tasks.find((task) => task.id === nextId);
                  if (selectedTask) {
                    setTitle(selectedTask.title);
                  }
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
              >
                <option value="">Bitte waehlen</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">URL</label>
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Titel</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Anzeigetitel"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#00B050] focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={saving || !title.trim() || (linkType === "internal" ? !linkedTaskId : !url.trim())}>
              {saving ? "Speichert..." : "Link anlegen"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusSelector({ status, onChange }: { status: string; onChange: (status: string) => void }) {
  const [open, setOpen] = useState(false);
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.New;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((current) => !current)}
        className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium", config.bg, config.text)}
      >
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: config.color }} />
        {config.label}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 min-w-[200px] rounded-2xl border border-gray-200 bg-white py-1 shadow-xl">
            {STATUSES.map((candidate) => {
              const candidateConfig = STATUS_CONFIG[candidate];
              return (
                <button
                  key={candidate}
                  onClick={() => {
                    onChange(candidate);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: candidateConfig.color }} />
                  {candidateConfig.label}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

function AssigneeSelector({
  assigneeIds,
  onChange,
}: {
  assigneeIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const { users } = useAppStore();
  const [open, setOpen] = useState(false);
  const assignees = users.filter((user) => assigneeIds.includes(user.id));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-[40px] w-full items-center gap-2 rounded-xl border border-transparent bg-white/70 px-1 text-left text-sm hover:text-[#00B050]"
      >
        {assignees.length > 0 ? (
          <>
            <div className="flex -space-x-2">
              {assignees.slice(0, 3).map((assignee) => (
                <Avatar key={assignee.id} className="h-7 w-7 border border-white">
                  <AvatarFallback className="text-[10px]" style={{ backgroundColor: `${assignee.color}30`, color: assignee.color }}>
                    {getInitials(assignee.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-gray-700">{assignees.map((assignee) => assignee.name).join(", ")}</span>
          </>
        ) : (
          <span className="text-gray-400">Empty</span>
        )}
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 min-w-[220px] rounded-2xl border border-gray-200 bg-white py-1 shadow-xl">
            <AssigneeOption label="Empty" onClick={() => { onChange([]); setOpen(false); }} />
            {users.map((user) => (
              <AssigneeOption
                key={user.id}
                user={user}
                active={assigneeIds.includes(user.id)}
                onClick={() => {
                  onChange(
                    assigneeIds.includes(user.id)
                      ? assigneeIds.filter((id) => id !== user.id)
                      : [...assigneeIds, user.id]
                  );
                }}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function AssigneeOption({
  user,
  label,
  active,
  onClick,
}: {
  user?: { name: string; color: string };
  label?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={cn("flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50", active && "bg-green-50")}>
      {user ? (
        <>
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[9px]" style={{ backgroundColor: `${user.color}30`, color: user.color }}>
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-gray-700">{user.name}</span>
        </>
      ) : (
        <span className="text-gray-400">{label}</span>
      )}
    </button>
  );
}
