"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  Copy,
  CheckSquare,
  ChevronDown,
  Clock3,
  FileSpreadsheet,
  FileText,
  Link2,
  Loader2,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Plus,
  Paperclip,
  Play,
  Presentation,
  Square,
  Trash2,
  Send,
  ExternalLink,
  X,
} from "lucide-react";
import { cn, STATUS_CONFIG, STATUSES, formatDate, getInitials } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showToast } from "@/lib/toast";
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
  const [descriptionDirty, setDescriptionDirty] = useState(false);
  const [descriptionSaving, setDescriptionSaving] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskOpen, setSubtaskOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [microsoftStatus, setMicrosoftStatus] = useState<MicrosoftConnectionStatus | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [now, setNow] = useState(0);
  const [topSectionHeight, setTopSectionHeight] = useState(204);
  const [actionItemsHeight, setActionItemsHeight] = useState(216);
  const [panelWidth, setPanelWidth] = useState(1056);
  const [fullWidth, setFullWidth] = useState(false);
  const [isCommentComposing, setIsCommentComposing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mentionMenuOpen, setMentionMenuOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const resizeStateRef = useRef<
    | { mode: "height"; startY: number; startHeight: number }
    | { mode: "width"; startX: number; startWidth: number }
    | { mode: "action-items"; startY: number; startHeight: number }
    | null
  >(null);

  useEffect(() => {
    if (!selectedTaskId || !taskDetailOpen) return;

    fetch(`/api/tasks/${selectedTaskId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Task konnte nicht geladen werden.");
        }
        return response.json();
      })
      .then((nextTask) => {
        setTask(nextTask);
        setTitleDraft(nextTask.title);
        setDescription(nextTask.description ?? "");
        setDescriptionDirty(false);
        setDescriptionError(null);
        setMenuOpen(false);
      })
      .catch((error) => {
        setTask(null);
        showToast({
          title: "Task konnte nicht geladen werden",
          message: error instanceof Error ? error.message : "Die Anfrage konnte nicht abgeschlossen werden.",
          variant: "error",
        });
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

    const nextHeight = Math.min(624, Math.max(144, textarea.scrollHeight));
    setActionItemsHeight((current) => {
      if (current >= nextHeight) {
        return current;
      }
      return nextHeight;
    });
  }, [description]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const resizeState = resizeStateRef.current;
      if (!resizeState) return;

      if (resizeState.mode === "height") {
        const nextHeight = resizeState.startHeight + (event.clientY - resizeState.startY);
        setTopSectionHeight(Math.min(384, Math.max(168, nextHeight)));
        return;
      }

      if (resizeState.mode === "action-items") {
        const nextHeight = resizeState.startHeight + (event.clientY - resizeState.startY);
        setActionItemsHeight(Math.min(624, Math.max(144, nextHeight)));
        return;
      }

      const nextWidth = resizeState.startWidth - (event.clientX - resizeState.startX);
      setPanelWidth(Math.min(window.innerWidth, Math.max(864, nextWidth)));
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

    const previousTask = task;
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

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (response.ok) {
        const updated = await response.json();
        updateTaskOptimistic(task.id, updated);
        setTask((prev) => (prev ? { ...prev, ...updated } : prev));
        showToast({ title: "Task gespeichert", variant: "success" });
        return;
      }

      updateTaskOptimistic(task.id, previousTask);
      setTask(previousTask);
      showToast({ title: "Task konnte nicht gespeichert werden", variant: "error" });
    } catch (error) {
      updateTaskOptimistic(task.id, previousTask);
      setTask(previousTask);
      showToast({
        title: "Task konnte nicht gespeichert werden",
        message: error instanceof Error ? error.message : "Die Anfrage konnte nicht abgeschlossen werden.",
        variant: "error",
      });
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
    if (description === (task.description ?? "")) {
      setDescriptionDirty(false);
      setDescriptionError(null);
      return;
    }

    setDescriptionSaving(true);
    setDescriptionError(null);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) {
        let message = "Action Items konnten nicht gespeichert werden.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) {
            message = payload.error;
          }
        } catch {
          // ignore json parse failures
        }
        setDescriptionError(message);
        return;
      }

      const updated = (await response.json()) as TaskDetailTask;
      setTask((prev) => (prev ? { ...prev, ...updated } : prev));
      updateTaskOptimistic(task.id, { description: updated.description ?? "" });
      setDescription(updated.description ?? "");
      setDescriptionDirty(false);
    } catch (error) {
      setDescriptionError(error instanceof Error ? error.message : "Action Items konnten nicht gespeichert werden.");
    } finally {
      setDescriptionSaving(false);
    }
  }

  async function reloadWorkspace() {
    const response = await fetch("/api/spaces");
    if (!response.ok) {
      showToast({ title: "Workspace konnte nicht aktualisiert werden", variant: "error" });
      return;
    }
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

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      showToast({ title: "Subtask konnte nicht erstellt werden", message: payload?.error, variant: "error" });
      return;
    }

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
    showToast({ title: "Subtask erstellt", variant: "success" });
  }

  async function addComment() {
    if (!task || !comment.trim()) return;

    const response = await fetch(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment.trim() }),
    });

    if (!response.ok) {
      showToast({ title: "Kommentar konnte nicht gesendet werden", variant: "error" });
      return;
    }

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
    showToast({ title: "Kommentar gesendet", variant: "success" });
  }

  async function submitCommentFromKeyboard() {
    if (!comment.trim()) return;
    await addComment();
  }

  function insertMention(user: User) {
    const textarea = commentRef.current;
    const mentionToken = `@${getUserMentionInsertToken(user)} `;

    setComment((current) => {
      if (!textarea) {
        return `${current}${current && !current.endsWith(" ") ? " " : ""}${mentionToken}`;
      }

      const selectionStart = textarea.selectionStart ?? current.length;
      const selectionEnd = textarea.selectionEnd ?? current.length;
      const nextValue = `${current.slice(0, selectionStart)}${mentionToken}${current.slice(selectionEnd)}`;

      window.requestAnimationFrame(() => {
        textarea.focus();
        const cursor = selectionStart + mentionToken.length;
        textarea.setSelectionRange(cursor, cursor);
      });

      return nextValue;
    });

    setMentionMenuOpen(false);
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
  const taskCreator =
    task?.createdById
      ? users.find((user) => user.id === task.createdById) ?? (currentUser?.id === task.createdById ? currentUser : null)
      : null;
  const availableDependencyTasks = spaces.flatMap((space) =>
    space.folders.flatMap((folder) =>
      folder.projects.flatMap((project) => project.tasks.flatMap((candidate) => flattenTaskTree(candidate)))
    )
  ).filter((candidate) => candidate.id !== task?.id);
  const taskYear = task ? new Date(task.createdAt).getFullYear() : new Date().getFullYear();
  const completedSubtasks = task?.subtasks.filter((subtask) => subtask.status === "Completed").length ?? 0;
  const commentCount = activityItems.length;
  const documentCount = (task?.documents ?? []).length;
  const approvalCount = (task?.approvals ?? []).length;
  const linkCount = (task?.links ?? []).length;
  const taskDateLabel =
    task?.startDate || task?.dueDate
      ? [task.startDate ? formatDate(task.startDate) : null, task.dueDate ? formatDate(task.dueDate) : null].filter(Boolean).join(" - ")
      : "Datum festlegen";
  function getTaskPermalink(taskId: string) {
    if (typeof window === "undefined") return `?task=${taskId}`;
    const url = new URL(window.location.href);
    url.searchParams.set("task", taskId);
    return url.toString();
  }

  async function copyTaskValue(kind: "link" | "id") {
    if (!task) return;
    const value = kind === "link" ? getTaskPermalink(task.id) : task.id;

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      setActionError(kind === "link" ? "Permalink konnte nicht kopiert werden." : "Task-ID konnte nicht kopiert werden.");
    }
  }

  function openTaskInNewTab() {
    if (!task || typeof window === "undefined") return;
    window.open(getTaskPermalink(task.id), "_blank", "noopener,noreferrer");
    setMenuOpen(false);
  }

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
        className="fixed right-0 top-0 z-50 flex h-full flex-col border-l border-[#263451] bg-[#161f34] shadow-2xl"
        style={{ width: fullWidth ? "100vw" : `${panelWidth}px`, maxWidth: "100vw" }}
      >
        <button
          type="button"
          aria-label="Panelbreite anpassen"
          onPointerDown={startWidthResizing}
          className="absolute left-0 top-0 z-50 h-full w-5 -translate-x-1/2 cursor-col-resize"
        />
        <div className="pointer-events-none absolute left-0 top-1/2 z-40 hidden h-24 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#44506c]/90 sm:block" />
        {!task ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#00B050]" />
          </div>
        ) : (
          <>
            <div className="overflow-y-auto border-b border-[#263451]" style={{ height: topSectionHeight }}>
              <div className="px-7 pb-2 pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-[#90a0c4]">
                      {task.archivedAt ? "Archiviert" : task.deletedAt ? "Im Papierkorb" : "Task"} · {taskYear}
                    </div>
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
                        className="mt-2 w-full border-b border-[#00B050] bg-transparent pb-1 text-[2rem] font-semibold leading-tight text-white focus:outline-none"
                      />
                    ) : (
                      <h2
                        onClick={() => setEditingTitle(true)}
                        className="mt-2 cursor-text truncate text-[2rem] font-semibold leading-tight text-white"
                      >
                        {task.title}
                      </h2>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-md border border-[#324160] bg-[#1a2742] px-2.5 py-1 text-sm text-[#c8d3eb]">
                        {location || "Kein Projektkontext"}
                      </span>
                      <span className="inline-flex items-center rounded-md border border-[#324160] bg-[#1a2742] px-2.5 py-1 text-sm text-[#c8d3eb]">
                        {completedSubtasks}/{task.subtasks.length} erledigt
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[#9aa7c3]">
                    <button
                      onClick={() => setFullWidth((current) => !current)}
                      className="rounded-md p-2 hover:bg-[#1f2b45] hover:text-white"
                    >
                      {fullWidth ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => void copyTaskValue("link")}
                      className="rounded-md p-2 hover:bg-[#1f2b45] hover:text-white"
                    >
                      <Link2 className="h-4 w-4" />
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setMenuOpen((current) => !current)}
                        className="rounded-md p-2 hover:bg-[#1f2b45] hover:text-white"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {menuOpen ? (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                          <div className="absolute right-0 top-full z-20 mt-2 min-w-[220px] rounded-xl border border-[#33415d] bg-[#1a2742] py-1 shadow-xl">
                            <button
                              type="button"
                              onClick={() => {
                                setFullWidth((current) => !current);
                                setMenuOpen(false);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#d4def5] hover:bg-[#223150]"
                            >
                              {fullWidth ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                              {fullWidth ? "Normale Breite" : "Vollbild"}
                            </button>
                            <button
                              type="button"
                              onClick={openTaskInNewTab}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#d4def5] hover:bg-[#223150]"
                            >
                              <ExternalLink className="h-4 w-4" />
                              In neuem Tab oeffnen
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void copyTaskValue("link");
                                setMenuOpen(false);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#d4def5] hover:bg-[#223150]"
                            >
                              <Link2 className="h-4 w-4" />
                              Permalink kopieren
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void copyTaskValue("id");
                                setMenuOpen(false);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#d4def5] hover:bg-[#223150]"
                            >
                              <Copy className="h-4 w-4" />
                              Task-ID kopieren
                            </button>
                            {!task.deletedAt ? (
                              <button
                                type="button"
                                onClick={() => {
                                  void deleteCurrentTask();
                                  setMenuOpen(false);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                In Papierkorb
                              </button>
                            ) : null}
                          </div>
                        </>
                      ) : null}
                    </div>
                    <button
                      onClick={closeTask}
                      className="rounded-md p-2 hover:bg-[#1f2b45] hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 items-start gap-2 xl:grid-cols-[1.2fr_1.2fr_1.2fr_180px]">
                  <TaskMetaCard
                    label="Status"
                    value={
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusSelector
                          status={task.status}
                          onChange={(status) => patchTask({ status })}
                        />
                        <button
                          type="button"
                          onClick={() => setApprovalDialogOpen(true)}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-[#33415d] bg-[#111a2c] px-2 text-[11px] font-medium text-[#c8d3eb] hover:bg-[#223150] hover:text-white"
                        >
                          Freigaben
                          <span className="rounded bg-[#223150] px-1 text-[10px] text-[#8ff0ba]">{approvalCount}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLinkDialogOpen(true)}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-[#33415d] bg-[#111a2c] px-2 text-[11px] font-medium text-[#c8d3eb] hover:bg-[#223150] hover:text-white"
                        >
                          Links
                          <span className="rounded bg-[#223150] px-1 text-[10px] text-[#8ff0ba]">{linkCount}</span>
                        </button>
                      </div>
                    }
                  />
                  <TaskMetaCard
                    label="Verantwortliche(r)"
                    value={
                      <AssigneeSelector
                        assigneeIds={task.assigneeIds}
                        onChange={(assigneeIds) => patchTask({ assigneeIds })}
                      />
                    }
                  />
                  <TaskMetaCard
                    label="Datum"
                    value={
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-white">{taskDateLabel}</div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="date"
                            value={task.startDate ? task.startDate.slice(0, 10) : ""}
                            onChange={(event) => patchTask({ startDate: event.target.value || null })}
                            className="h-7 rounded-md border border-[#33415d] bg-[#111a2c] px-2 text-xs text-[#d4def5] focus:outline-none"
                          />
                          <input
                            type="date"
                            value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                            onChange={(event) => patchTask({ dueDate: event.target.value || null })}
                            className="h-7 rounded-md border border-[#33415d] bg-[#111a2c] px-2 text-xs text-[#d4def5] focus:outline-none"
                          />
                        </div>
                      </div>
                    }
                  />
                  <TaskMetaCard
                    label="Weitere"
                    value={
                      <div className="space-y-1.5">
                        <div className="text-xs leading-snug text-[#c8d3eb]">
                          {completedSubtasks} von {task.subtasks.length} Schritte erledigt
                        </div>
                        <button
                          type="button"
                          onClick={() => setMenuOpen((current) => !current)}
                          className="inline-flex h-7 w-full items-center justify-between rounded-md border border-[#33415d] bg-[#111a2c] px-2 text-xs text-[#d4def5] hover:bg-[#223150]"
                        >
                          Mehr Optionen
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    }
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
                  <CompactMetaCard
                    label="Erstellt von"
                    value={taskCreator?.name ?? "Unbekannt"}
                  />
                  <CompactMetaCard
                    label="Faelligkeit"
                    value={taskDateLabel}
                  />
                  <CompactMetaCard
                    label="Kommentare"
                    value={`${commentCount}`}
                  />
                  <CompactMetaCard
                    label="Dateien"
                    value={`${documentCount}`}
                  />
                </div>

                <div className="mt-3 flex justify-end">
                  {task.deletedAt ? (
                    <button
                      onClick={restoreTask}
                      className="mr-2 inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20"
                    >
                      Wiederherstellen
                    </button>
                  ) : (
                    <button
                      onClick={toggleArchiveTask}
                      className="mr-2 inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-500/20"
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
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    {task.deletedAt ? "Im Papierkorb" : "In Papierkorb"}
                  </button>
                </div>
                {actionError ? (
                  <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {actionError}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-[#263451] px-7 py-3 text-sm text-[#afbdd8]">
                <TaskActionChip
                  icon={<CheckSquare className="h-4 w-4" />}
                  label="Schritt hinzufuegen"
                  onClick={() => setSubtaskOpen((current) => !current)}
                />
                <TaskActionChip icon={<Paperclip className="h-4 w-4" />} label="Datei anhangen" onClick={() => setDocumentDialogOpen(true)} />
                <TaskActionChip icon={<CheckSquare className="h-4 w-4" />} label="Freigabe anfragen" onClick={() => setApprovalDialogOpen(true)} />
                <TaskActionChip icon={<Link2 className="h-4 w-4" />} label="Task verknuepfen" onClick={() => setLinkDialogOpen(true)} />
                <span className="mx-1 h-5 w-px bg-[#324160]" />
                <TaskActionChip
                  icon={<Play className="h-4 w-4" />}
                  label={`Zeit ${displayedActualTime}`}
                  onClick={toggleTimeTracking}
                />
              </div>
            </div>

            <div className="border-b border-[#263451] px-7 py-2">
              <button
                type="button"
                aria-label="Bereichsgroesse anpassen"
                onPointerDown={startResizing}
                className="group flex w-full cursor-row-resize items-center justify-center"
              >
                <span className="h-1.5 w-16 rounded-full bg-[#324160] transition-colors group-hover:bg-[#415170]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#18233a] px-7 py-6">
              {subtaskOpen ? (
                <div className="mb-5 flex gap-2 rounded-2xl border border-[#00B050]/30 bg-[#10301f] p-3">
                  <input
                    value={subtaskTitle}
                    onChange={(event) => setSubtaskTitle(event.target.value)}
                    placeholder="Teilelement anlegen"
                    className="flex-1 rounded-lg border border-[#33415d] bg-[#111a2c] px-3 py-2 text-sm text-white focus:border-[#00B050] focus:outline-none"
                  />
                  <Button size="sm" onClick={addSubtask} disabled={!subtaskTitle.trim()}>
                    Hinzufugen
                  </Button>
                </div>
              ) : null}

              <section className="rounded-[28px] border border-[#273754] bg-[#161f34] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
                <div className="border-b border-[#25324b] pb-4">
                  <div className="inline-flex rounded-md bg-[#285f92] px-2 py-1 text-sm font-semibold text-white">
                    Beschreibung
                  </div>
                  <p className="mt-3 text-sm text-[#c5d0e8]">
                    Halte hier kurz fest, worum es geht und welche Schritte als Nächstes anstehen.
                  </p>
                </div>

                <div className="mt-4 rounded-2xl border border-[#2d3a58] bg-[#111a2c] p-3">
                  <textarea
                    ref={descriptionRef}
                    value={description}
                    onChange={(event) => {
                      setDescription(event.target.value);
                      setDescriptionDirty(true);
                      setDescriptionError(null);
                    }}
                    onKeyDown={(event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                        event.preventDefault();
                        void saveDescription();
                      }
                    }}
                    placeholder="Beschreibe die Aufgabe in einfachen Worten..."
                    style={{ height: actionItemsHeight }}
                    className="w-full overflow-y-auto rounded-xl border border-transparent bg-[#111a2c] px-3 py-3 text-[1rem] leading-8 text-[#e7edf9] placeholder:text-[#6f7f9f] focus:border-[#00B050]/50 focus:outline-none focus:ring-2 focus:ring-[#00B050]/20"
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-sm text-[#90a0c4]">
                      {descriptionError ? (
                        <span className="text-red-300">{descriptionError}</span>
                      ) : descriptionDirty ? (
                        <span>Nicht gespeichert</span>
                      ) : (
                        <span>Gespeichert</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void saveDescription()}
                      disabled={descriptionSaving || !descriptionDirty}
                      className="rounded-lg bg-[#00B050] px-3 py-2 text-sm font-medium text-white hover:bg-[#00963f] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {descriptionSaving ? "Speichert..." : "Beschreibung speichern"}
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
                    <span className="h-1.5 w-14 rounded-full bg-[#324160] transition-colors group-hover:bg-[#415170]" />
                  </button>
                </div>

                {task.subtasks.length > 0 ? (
                  <div className="mt-3 space-y-3 border-t border-[#25324b] pt-4">
                    <div className="text-sm font-medium text-white">Schritte</div>
                    {task.subtasks.map((subtask) => (
                      <label key={subtask.id} className="flex items-start gap-3 text-base text-[#e7edf9]">
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
                          className="mt-1 h-4 w-4 rounded border-[#51607e] bg-[#111a2c]"
                        />
                        <span className={cn(subtask.status === "Completed" && "text-[#6f7f9f] line-through")}>
                          {subtask.title}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="mt-6 rounded-[28px] border border-[#273754] bg-[#161f34] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-[#7f91b8]">Dateien</div>
                    <h3 className="mt-1 text-sm font-semibold text-white">Angehaengte Dateien</h3>
                    <p className="mt-1 text-xs text-[#90a0c4]">Hier findest du alle Dokumente, die zu dieser Aufgabe gehoeren.</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {!microsoftStatus?.configured ? (
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-1 font-medium text-amber-100">
                          Microsoft OAuth noch nicht konfiguriert
                        </span>
                      ) : microsoftStatus.connected ? (
                        <span className="rounded-full bg-green-500/15 px-2.5 py-1 font-medium text-green-100">
                          Verbunden als {microsoftStatus.email ?? "Microsoft-User"}
                        </span>
                      ) : (
                        <a
                          href="/api/integrations/microsoft/connect"
                          className="rounded-full bg-sky-500/15 px-2.5 py-1 font-medium text-sky-100 hover:bg-sky-500/25"
                        >
                          Mit Microsoft verbinden
                        </a>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setDocumentDialogOpen(true)}>
                      <Plus className="h-4 w-4" />
                      Datei
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  {(task.documents ?? []).length > 0 ? (
                    (task.documents ?? []).map((document) => (
                      <div key={document.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#293754] bg-[#111a2c] px-4 py-3">
                        <div className="flex items-center gap-3">
                          <DocumentIcon type={document.documentType} />
                          <div>
                            <div className="text-sm font-medium text-white">{document.title}</div>
                            <div className="text-xs text-[#90a0c4]">{formatDate(document.createdAt)} · {document.provider} · {document.documentType}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={document.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-[#33415d] bg-[#1a2742] px-3 py-2 text-xs text-[#d4def5] hover:bg-[#223150]"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Oeffnen
                          </a>
                          <button
                            onClick={() => removeDocument(document.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100 hover:bg-red-500/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Entfernen
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#33415d] px-4 py-5 text-sm text-[#90a0c4]">
                      Noch kein Microsoft-Dokument verknuepft.
                    </div>
                  )}
                </div>
              </section>

              <section className="mt-8">
                <div className="text-center text-sm font-medium text-[#7f91b8]">Kommentare und Aktivitaet</div>
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
                          <span className="text-sm font-semibold text-white">{item.author.name}</span>
                          <span className="text-xs text-[#7f91b8]">{formatDate(item.createdAt)}</span>
                        </div>
                        {(item.mentions ?? []).length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-2">
                            {item.mentions.map((mentionedUser) => {
                              const mentionsCurrentUser = currentUser?.id === mentionedUser.id;
                              return (
                                <span
                                  key={`${item.id}-${mentionedUser.id}`}
                                  className={cn(
                                    "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold",
                                    mentionsCurrentUser
                                      ? "bg-[#0f6a52] text-[#c8fff0] shadow-[0_0_0_1px_rgba(21,187,143,0.2)]"
                                      : "bg-[#153b33] text-[#88dfc5]"
                                  )}
                                >
                                  @{mentionedUser.name}
                                </span>
                              );
                            })}
                          </div>
                        ) : null}
                        <div className="mt-1 whitespace-pre-wrap text-sm text-[#c5d0e8]">
                          {renderCommentWithMentions(item)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="border-t border-[#263451] bg-[#161f34] px-7 py-5">
              <div className="rounded-2xl border-2 border-[#00B050]/60 bg-[#111a2c] px-4 py-3 shadow-[0_0_0_1px_rgba(0,176,80,0.08)]">
                <textarea
                  ref={commentRef}
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
                  placeholder="Einen Kommentar hinzufuegen..."
                  rows={comment.trim() ? 3 : 1}
                  className="w-full resize-none bg-transparent text-base text-[#e7edf9] placeholder:text-[#6f7f9f] focus:outline-none"
                />
                <p className="mt-2 text-xs text-[#7f91b8]">
                  Mit `@` kannst du direkt eine Person erwaehnen.
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="relative flex items-center gap-3 text-[#7f91b8]">
                    <Paperclip className="h-4 w-4" />
                    <button
                      type="button"
                      onClick={() => setMentionMenuOpen((current) => !current)}
                      className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-[#33415d] bg-[#1a2742] px-2 text-sm font-semibold text-[#d4def5] hover:bg-[#223150]"
                    >
                      @
                    </button>
                    {mentionMenuOpen ? (
                      <div className="absolute bottom-10 left-7 z-30 min-w-[260px] rounded-xl border border-[#33415d] bg-[#1a2742] p-2 shadow-xl">
                        <div className="px-2 pb-2 text-xs uppercase tracking-[0.14em] text-[#7f91b8]">Person auswaehlen</div>
                        <div className="max-h-56 overflow-y-auto">
                          {users.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => insertMention(user)}
                              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-[#223150]"
                            >
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-[10px]" style={{ backgroundColor: `${user.color}30`, color: user.color }}>
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-white">{user.name}</div>
                                <div className="truncate text-xs text-[#7f91b8]">@{getUserMentionInsertToken(user)}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
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
                    Senden
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

function normalizeMentionToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getUserMentionKeys(user: User) {
  const fullName = normalizeMentionToken(user.name);
  const firstName = normalizeMentionToken(user.name.split(/\s+/)[0] ?? "");
  const emailName = normalizeMentionToken(user.email.split("@")[0] ?? "");
  return Array.from(new Set([fullName, firstName, emailName].filter(Boolean)));
}

function getUserMentionInsertToken(user: User) {
  const keys = getUserMentionKeys(user);
  return keys[1] ?? keys[2] ?? keys[0] ?? "team";
}

function renderCommentWithMentions(comment: TaskComment) {
  const mentionCandidates = (comment.mentions ?? []).flatMap((mentionedUser) => {
    const rawKeys = [
      mentionedUser.name,
      mentionedUser.name.split(/\s+/)[0] ?? "",
      mentionedUser.email.split("@")[0] ?? "",
    ].filter(Boolean);

    return rawKeys.map((key) => ({
      key,
      normalizedKey: normalizeMentionToken(key),
      mentionedUser,
    }));
  }).sort((left, right) => right.key.length - left.key.length);

  const parts: React.ReactNode[] = [];
  let index = 0;

  while (index < comment.body.length) {
    const atIndex = comment.body.indexOf("@", index);
    if (atIndex === -1) {
      parts.push(comment.body.slice(index));
      break;
    }

    if (atIndex > index) {
      parts.push(comment.body.slice(index, atIndex));
    }

    const matchingCandidate = mentionCandidates.find((candidate) => {
      const mentionText = comment.body.slice(atIndex + 1, atIndex + 1 + candidate.key.length);
      return normalizeMentionToken(mentionText) === candidate.normalizedKey;
    });

    if (!matchingCandidate) {
      const rawMention = comment.body.slice(atIndex).match(/^@[a-zA-Z0-9._-]+/)?.[0] ?? "@";
      parts.push(rawMention);
      index = atIndex + rawMention.length;
      continue;
    }

    parts.push(
      <span
        key={`${comment.id}-${atIndex}`}
        className="inline-flex rounded-md bg-[#0f6a52] px-1.5 py-0.5 font-semibold text-[#c8fff0] shadow-[0_0_0_1px_rgba(21,187,143,0.28)]"
      >
        @{matchingCandidate.mentionedUser.name}
      </span>
    );
    index = atIndex + 1 + matchingCandidate.key.length;
  }

  return parts.map((part, partIndex) => (
    <React.Fragment key={`${comment.id}-body-${partIndex}`}>{part}</React.Fragment>
  ));
}

function TaskMetaCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="self-start rounded-lg border border-[#2c3b58] bg-[#0f3d63] px-2 py-1.5">
      <div className="mb-1 text-[10px] font-medium leading-none text-[#89a9d1]">{label}</div>
      {value}
    </div>
  );
}

function CompactMetaCard({
  label,
  value,
  actionLabel,
  onAction,
}: {
  label: string;
  value: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#273754] bg-[#161f34] px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] leading-none text-[#7f91b8]">{label}</div>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <span className="truncate text-[12px] font-medium leading-none text-white">{value}</span>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[#8fd9af] hover:bg-[#00B050]/10"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
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
      className="inline-flex items-center gap-1.5 rounded-xl border border-[#2d3a58] bg-[#161f34] px-3 py-2 text-sm text-[#d4def5] hover:bg-[#1f2b45]"
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
        className="flex h-7 items-center gap-1.5 rounded-md border border-[#33415d] bg-[#111a2c] px-2 text-xs font-medium text-white"
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: config.color }} />
        {config.label}
        <ChevronDown className="h-3 w-3 text-[#8da0c4]" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1.5 min-w-[170px] rounded-lg border border-[#33415d] bg-[#1a2742] py-1 shadow-xl">
            {STATUSES.map((candidate) => {
              const candidateConfig = STATUS_CONFIG[candidate];
              return (
                <button
                  key={candidate}
                  onClick={() => {
                    onChange(candidate);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-sm text-[#d4def5] hover:bg-[#223150]"
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: candidateConfig.color }} />
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
  const assigneeSummary = assignees.map((assignee) => assignee.name).join(", ");

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-7 w-full items-center gap-1.5 rounded-md border border-[#33415d] bg-[#111a2c] px-2 text-left text-xs leading-none text-white hover:text-[#9ce0b8]"
      >
        {assignees.length > 0 ? (
          <>
            <div className="flex -space-x-2">
              {assignees.slice(0, 3).map((assignee) => (
                <Avatar key={assignee.id} className="h-5 w-5 border border-[#111a2c]">
                  <AvatarFallback className="text-[9px]" style={{ backgroundColor: `${assignee.color}30`, color: assignee.color }}>
                    {getInitials(assignee.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="truncate">{assigneeSummary}</span>
          </>
        ) : (
          <span className="text-[#7f91b8]">Niemand zugewiesen</span>
        )}
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1.5 min-w-[220px] rounded-lg border border-[#33415d] bg-[#1a2742] py-1 shadow-xl">
            <AssigneeOption label="Niemand" onClick={() => { onChange([]); setOpen(false); }} />
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
    <button onClick={onClick} className={cn("flex w-full items-center gap-2 px-2.5 py-2 text-sm hover:bg-[#223150]", active && "bg-[#10301f]")}>
      {user ? (
        <>
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[8px]" style={{ backgroundColor: `${user.color}30`, color: user.color }}>
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-[#d4def5]">{user.name}</span>
        </>
      ) : (
        <span className="text-[#90a0c4]">{label}</span>
      )}
      {active ? <Square className="ml-auto h-3.5 w-3.5 fill-[#00B050] text-[#00B050]" /> : null}
    </button>
  );
}
