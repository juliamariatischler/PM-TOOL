"use client";
import React, { useEffect, useState, useRef } from "react";
import {
  X, Calendar, MapPin, User, Tag, ChevronDown,
  MessageSquare, Paperclip, CheckSquare, FileText,
  Clock, ThumbsUp, Loader2
} from "lucide-react";
import { cn, STATUS_CONFIG, STATUSES, formatDate, getInitials } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Task } from "@/types";

export function TaskDetailPanel() {
  const { taskDetailOpen, selectedTaskId, closeTask, users, updateTaskOptimistic, spaces } = useAppStore();
  const [task, setTask] = useState<Task & { project?: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedTaskId || !taskDetailOpen) return;
    setLoading(true);
    fetch(`/api/tasks/${selectedTaskId}`)
      .then(r => r.json())
      .then(t => {
        setTask(t);
        setTitleDraft(t.title);
        setDescription(t.description ?? "");
      })
      .finally(() => setLoading(false));
  }, [selectedTaskId, taskDetailOpen]);

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);

  async function patchTask(patch: Partial<Task>) {
    if (!task) return;
    updateTaskOptimistic(task.id, patch);
    setTask(prev => prev ? { ...prev, ...patch } : prev);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function saveTitle() {
    if (!task || titleDraft === task.title) { setEditingTitle(false); return; }
    await patchTask({ title: titleDraft });
    setEditingTitle(false);
  }

  async function saveDescription() {
    if (!task) return;
    await patchTask({ description });
  }

  if (!taskDetailOpen) return null;

  const statusCfg = task ? (STATUS_CONFIG[task.status] ?? STATUS_CONFIG["New"]) : null;

  // Find location
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

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={closeTask} />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right-4 duration-200">
        {loading || !task ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#00B050]" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-gray-100">
              <div className="flex-1 min-w-0 mr-4">
                {editingTitle ? (
                  <input
                    ref={titleRef}
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={e => e.key === "Enter" && saveTitle()}
                    className="w-full text-xl font-semibold text-gray-900 focus:outline-none border-b-2 border-[#00B050]"
                  />
                ) : (
                  <h2
                    className="text-xl font-semibold text-gray-900 cursor-text hover:text-[#00B050] truncate"
                    onClick={() => setEditingTitle(true)}
                  >
                    {task.title}
                  </h2>
                )}
                <p className="text-xs text-gray-400 mt-1 truncate">{location}</p>
              </div>
              <button onClick={closeTask} className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status bar */}
            <div className="px-6 py-3 border-b border-gray-100">
              <StatusSelector
                status={task.status}
                onChange={status => patchTask({ status })}
              />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 border-b border-gray-100">
                <TabsList className="border-b-0">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="subitems">
                    Subitems
                    {task.subtasks.length > 0 && (
                      <span className="ml-1 text-xs bg-gray-100 rounded-full px-1.5">{task.subtasks.length}</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="files">Files</TabsTrigger>
                  <TabsTrigger value="timetracking">Time</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {/* Fields grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Owner */}
                  <FieldRow label="Owner" icon={<User className="h-4 w-4" />}>
                    <AssigneeSelector
                      assigneeId={task.assigneeId}
                      onChange={assigneeId => patchTask({ assigneeId })}
                    />
                  </FieldRow>

                  {/* Priority */}
                  <FieldRow label="Priority" icon={<Tag className="h-4 w-4" />}>
                    <PrioritySelector priority={task.priority} onChange={p => patchTask({ priority: p })} />
                  </FieldRow>

                  {/* Start Date */}
                  <FieldRow label="Start Date" icon={<Calendar className="h-4 w-4" />}>
                    <input
                      type="date"
                      defaultValue={task.startDate ? task.startDate.slice(0, 10) : ""}
                      onChange={e => patchTask({ startDate: e.target.value || null })}
                      className="text-sm border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#00B050]"
                    />
                  </FieldRow>

                  {/* Due Date */}
                  <FieldRow label="Due Date" icon={<Calendar className="h-4 w-4" />}>
                    <input
                      type="date"
                      defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                      onChange={e => patchTask({ dueDate: e.target.value || null })}
                      className="text-sm border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#00B050]"
                    />
                  </FieldRow>

                  {/* Effort */}
                  <FieldRow label="Effort (h)" icon={<Clock className="h-4 w-4" />}>
                    <input
                      type="number"
                      step="0.5"
                      defaultValue={task.effort}
                      onBlur={e => patchTask({ effort: parseFloat(e.target.value) || 0 })}
                      className="w-20 text-sm border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#00B050]"
                    />
                  </FieldRow>

                  {/* Cost */}
                  <FieldRow label="Planned Cost" icon={<Tag className="h-4 w-4" />}>
                    <input
                      type="number"
                      step="10"
                      defaultValue={task.plannedCost}
                      onBlur={e => patchTask({ plannedCost: parseFloat(e.target.value) || 0 })}
                      className="w-24 text-sm border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#00B050]"
                    />
                  </FieldRow>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    onBlur={saveDescription}
                    placeholder="Add a description..."
                    rows={4}
                    className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00B050] resize-none"
                  />
                </div>
              </TabsContent>

              <TabsContent value="subitems" className="flex-1 overflow-y-auto px-6 py-4">
                {task.subtasks.length === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-8">No subtasks yet</div>
                ) : (
                  <div className="space-y-2">
                    {task.subtasks.map(sub => (
                      <div key={sub.id} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2">
                        <span
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: STATUS_CONFIG[sub.status]?.color ?? "#6b7280" }}
                        />
                        <span className="text-sm text-gray-700 flex-1 truncate">{sub.title}</span>
                        {sub.assignee && (
                          <Avatar className="h-5 w-5 flex-shrink-0">
                            <AvatarFallback className="text-[9px]" style={{ backgroundColor: sub.assignee.color + "30", color: sub.assignee.color }}>
                              {getInitials(sub.assignee.name)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="files" className="flex-1 px-6 py-4">
                <div className="text-sm text-gray-400 text-center py-8">No files attached</div>
              </TabsContent>

              <TabsContent value="timetracking" className="flex-1 px-6 py-4">
                <div className="text-sm text-gray-400 text-center py-8">Time tracking coming soon</div>
              </TabsContent>
            </Tabs>

            {/* Comment input */}
            <div className="border-t border-gray-100 px-6 py-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="text-[10px] bg-[#00B050]/20 text-[#00B050]">ME</AvatarFallback>
                </Avatar>
                <div className="flex-1 flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
                  <input
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                    onKeyDown={e => { if (e.key === "Enter") setComment(""); }}
                  />
                  <button className="text-gray-400 hover:text-gray-600">
                    <Paperclip className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function FieldRow({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        {icon}
        <span className="font-medium uppercase tracking-wide">{label}</span>
      </div>
      {children}
    </div>
  );
}

function StatusSelector({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["New"];

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
          cfg.bg, cfg.text
        )}
      >
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cfg.color }} />
        {cfg.label}
        <ChevronDown className="h-3.5 w-3.5 ml-1" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 min-w-[180px] rounded-xl border border-gray-200 bg-white shadow-xl py-1">
            {STATUSES.map(s => {
              const c = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => { onChange(s); setOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function AssigneeSelector({ assigneeId, onChange }: { assigneeId: string | null; onChange: (id: string | null) => void }) {
  const { users } = useAppStore();
  const [open, setOpen] = useState(false);
  const assignee = users.find(u => u.id === assigneeId);

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-sm hover:text-[#00B050]">
        {assignee ? (
          <>
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px]" style={{ backgroundColor: assignee.color + "30", color: assignee.color }}>
                {getInitials(assignee.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-gray-700">{assignee.name}</span>
          </>
        ) : (
          <span className="text-gray-400">Unassigned</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 min-w-[180px] rounded-xl border border-gray-200 bg-white shadow-xl py-1">
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:bg-gray-50"
            >
              Unassigned
            </button>
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => { onChange(u.id); setOpen(false); }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[9px]" style={{ backgroundColor: u.color + "30", color: u.color }}>
                    {getInitials(u.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-gray-700">{u.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PrioritySelector({ priority, onChange }: { priority: string; onChange: (p: string) => void }) {
  const [open, setOpen] = useState(false);
  const priorities = ["Critical", "High", "Medium", "Low"];
  const colors: Record<string, string> = { Critical: "#ef4444", High: "#f97316", Medium: "#f59e0b", Low: "#9ca3af" };

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#00B050]">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[priority] ?? "#9ca3af" }} />
        {priority}
        <ChevronDown className="h-3 w-3 text-gray-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 min-w-[130px] rounded-xl border border-gray-200 bg-white shadow-xl py-1">
            {priorities.map(p => (
              <button
                key={p}
                onClick={() => { onChange(p); setOpen(false); }}
                className="flex w-full items-center gap-2 px-4 py-1.5 text-sm hover:bg-gray-50"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[p] }} />
                {p}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
