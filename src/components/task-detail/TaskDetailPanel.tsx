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
import type { MicrosoftConnectionStatus, Task, TaskComment, TaskDocument } from "@/types";

type TaskDetailTask = Task & {
  project?: { id: string; name: string };
  comments?: TaskComment[];
  documents?: TaskDocument[];
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
  } = useAppStore();
  const [task, setTask] = useState<TaskDetailTask | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskOpen, setSubtaskOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [microsoftStatus, setMicrosoftStatus] = useState<MicrosoftConnectionStatus | null>(null);
  const [now, setNow] = useState(0);
  const titleRef = useRef<HTMLInputElement>(null);

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
    if (!task?.timerStartedAt) return;
    const interval = window.setInterval(() => setNow(new Date().getTime()), 1000);
    return () => window.clearInterval(interval);
  }, [task?.timerStartedAt]);

  async function patchTask(patch: Partial<Task>) {
    if (!task) return;

    const optimisticPatch = { ...patch } as Partial<TaskDetailTask>;
    if ("assigneeId" in patch) {
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
    await patchTask({ description });
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

  async function deleteCurrentTask() {
    if (!task) return;

    const confirmed = window.confirm(`Task "${task.title}" wirklich loeschen?`);
    if (!confirmed) return;

    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "DELETE",
    });

    if (!response.ok) return;

    useAppStore.getState().deleteTaskOptimistic(task.id);
    closeTask();
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

  function getDisplayedActualTimeMinutes(currentTask: TaskDetailTask) {
    if (!currentTask.timerStartedAt) {
      return currentTask.actualTimeMinutes;
    }

    const startedAt = new Date(currentTask.timerStartedAt).getTime();
    const elapsedMinutes = Math.max(0, Math.floor((now - startedAt) / 60000));
    return currentTask.actualTimeMinutes + elapsedMinutes;
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
  const displayedActualTimeMinutes = task ? getDisplayedActualTimeMinutes(task) : 0;
  const displayedActualTime = `${Math.floor(displayedActualTimeMinutes / 60)}:${String(displayedActualTimeMinutes % 60).padStart(2, "0")}`;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={closeTask} />

      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[880px] flex-col border-l border-gray-200 bg-white shadow-2xl">
        {!task ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#00B050]" />
          </div>
        ) : (
          <>
            <div className="border-b border-gray-100 px-7 pb-5 pt-6">
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
                      className="w-full border-b-2 border-[#00B050] bg-transparent text-[2rem] font-semibold leading-tight text-gray-900 focus:outline-none"
                    />
                  ) : (
                    <h2
                      onClick={() => setEditingTitle(true)}
                      className="cursor-text truncate text-[2rem] font-semibold leading-tight text-gray-900"
                    >
                      {task.title}
                    </h2>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-600">
                      {location || "No project context"}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-[#00B050] px-3 py-1 text-sm font-semibold text-white">
                      {task.subtasks.length}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-400">
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

              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
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
                      assigneeId={task.assigneeId}
                      onChange={(assigneeId) => patchTask({ assigneeId })}
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
                <button
                  onClick={deleteCurrentTask}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Task loeschen
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 border-b border-gray-100 px-7 py-3 text-sm text-gray-500">
              <TaskActionChip
                icon={<CheckSquare className="h-4 w-4" />}
                label="Add subitem"
                onClick={() => setSubtaskOpen((current) => !current)}
              />
              <TaskActionChip icon={<Paperclip className="h-4 w-4" />} label="Add files" onClick={() => setDocumentDialogOpen(true)} />
              <TaskActionChip icon={<CheckSquare className="h-4 w-4" />} label="Add approval" />
              <TaskActionChip icon={<Link2 className="h-4 w-4" />} label="Add dependency" />
              <span className="mx-1 h-5 w-px bg-gray-200" />
              <TaskActionChip
                icon={<Play className="h-4 w-4" />}
                label={displayedActualTime}
                onClick={toggleTimeTracking}
              />
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

                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  onBlur={saveDescription}
                  placeholder="Describe the task, scope, stakeholders, and next action items..."
                  rows={10}
                  className="w-full resize-none bg-transparent text-[1.02rem] leading-8 text-gray-800 focus:outline-none"
                />

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
                <input
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Add a comment... Use @julia or @rafaela"
                  className="w-full text-base text-gray-700 placeholder:text-gray-400 focus:outline-none"
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
    </>
  );
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
  assigneeId,
  onChange,
}: {
  assigneeId: string | null;
  onChange: (id: string | null) => void;
}) {
  const { users } = useAppStore();
  const [open, setOpen] = useState(false);
  const assignee = users.find((user) => user.id === assigneeId) ?? null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-[40px] w-full items-center gap-2 rounded-xl border border-transparent bg-white/70 px-1 text-left text-sm hover:text-[#00B050]"
      >
        {assignee ? (
          <>
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-[10px]" style={{ backgroundColor: `${assignee.color}30`, color: assignee.color }}>
                {getInitials(assignee.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-gray-700">{assignee.name}</span>
          </>
        ) : (
          <span className="text-gray-400">Empty</span>
        )}
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 min-w-[220px] rounded-2xl border border-gray-200 bg-white py-1 shadow-xl">
            <AssigneeOption label="Empty" onClick={() => { onChange(null); setOpen(false); }} />
            {users.map((user) => (
              <AssigneeOption
                key={user.id}
                user={user}
                onClick={() => {
                  onChange(user.id);
                  setOpen(false);
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
  onClick,
}: {
  user?: { name: string; color: string };
  label?: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50">
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
