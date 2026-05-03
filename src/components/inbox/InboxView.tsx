"use client";

import { useMemo, useState } from "react";
import { Mail, MessageSquare, CheckCircle2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { formatDate, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function InboxView() {
  const { inboxItems, openTask, setActiveView, setInboxItems } = useAppStore();
  const [filter, setFilter] = useState<"all" | "unread" | "completed" | "archived">("all");

  const filteredItems = useMemo(
    () =>
      inboxItems.filter((item) => {
        if (item.taskDeletedAt) return false;
        if (filter === "unread") return !item.readAt;
        if (filter === "completed") return item.taskStatus === "Completed";
        if (filter === "archived") return Boolean(item.taskArchivedAt);
        return true;
      }),
    [filter, inboxItems]
  );

  async function handleOpen(itemId: string, taskId: string) {
    const response = await fetch("/api/inbox", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mentionId: itemId }),
    });

    if (response.ok) {
      setInboxItems(
        inboxItems.map((item) =>
          item.id === itemId ? { ...item, readAt: new Date().toISOString() } : item
        )
      );
    }

    setActiveView("table");
    openTask(taskId);
  }

  if (inboxItems.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00B050]/10 text-[#00B050]">
          <Mail className="h-8 w-8" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900">Inbox ist leer</h2>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Wenn dich jemand in einem Kommentar mit `@name` markiert, erscheint der Eintrag hier.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top,#eef7f1_0%,#f7faf8_45%,#ffffff_100%)] px-6 py-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00B050] text-white">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Inbox</h1>
            <p className="text-sm text-slate-500">Kommentare, in denen du erwaehnt wurdest.</p>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {[
            { id: "all", label: "Alle" },
            { id: "unread", label: "Ungelesen" },
            { id: "completed", label: "Erledigte Tasks" },
            { id: "archived", label: "Archiviert" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id as typeof filter)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === item.id
                  ? "border-[#00B050] bg-[#00B050]/10 text-[#0e6d36]"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Keine Eintraege fuer diesen Filter.
            </div>
          ) : (
            filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleOpen(item.id, item.taskId)}
              className={cn(
                "w-full rounded-[1.5rem] border bg-white p-5 text-left shadow-[0_18px_50px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.09)]",
                item.readAt ? "border-slate-200" : "border-[#00B050]/35 ring-1 ring-[#00B050]/15"
              )}
            >
              <div className="flex items-start gap-4">
                <Avatar className="mt-0.5 h-10 w-10">
                  <AvatarFallback
                    className="text-[11px]"
                    style={{ backgroundColor: `${item.author.color}25`, color: item.author.color }}
                  >
                    {getInitials(item.author.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{item.author.name}</span>
                    {!item.readAt ? (
                      <span className="rounded-full bg-[#00B050]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0e6d36]">
                        Neu
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Gelesen
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.commentBody}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{item.spaceName}</span>
                    <span>/</span>
                    <span>{item.folderName}</span>
                    <span>/</span>
                    <span>{item.projectName}</span>
                    <span>/</span>
                    <span className="font-medium text-slate-500">{item.taskTitle}</span>
                  </div>
                </div>
              </div>
            </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
