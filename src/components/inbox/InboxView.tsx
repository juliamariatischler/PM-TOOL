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
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#111a2c] px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-[#2b3a58] bg-[#17233a] text-[#8ff0ba]">
          <Mail className="h-8 w-8" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">Inbox ist leer</h2>
          <p className="mt-2 max-w-md text-sm text-[#94a3c3]">
            Wenn dich jemand in einem Kommentar mit `@name` markiert, erscheint der Eintrag hier.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#111a2c] px-6 py-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00B050] text-white">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Inbox</h1>
            <p className="text-sm text-[#94a3c3]">Kommentare, in denen du erwaehnt wurdest.</p>
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
                "rounded-md border px-3 py-2 text-xs font-semibold transition-colors",
                filter === item.id
                  ? "border-[#00B050] bg-[#10301f] text-[#8ff0ba]"
                  : "border-[#33415d] bg-[#17233a] text-[#c8d3eb] hover:bg-[#223150]"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#33415d] bg-[#17233a] p-8 text-center text-sm text-[#94a3c3]">
              Keine Eintraege fuer diesen Filter.
            </div>
          ) : (
            filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleOpen(item.id, item.taskId)}
              className={cn(
                "w-full rounded-xl border bg-[#17233a] p-5 text-left shadow-[0_18px_50px_rgba(0,0,0,0.14)] transition hover:-translate-y-0.5 hover:border-[#3f5278] hover:bg-[#1b2944]",
                item.readAt ? "border-[#2b3a58]" : "border-[#00B050]/55 ring-1 ring-[#00B050]/20"
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
                    <span className="text-sm font-semibold text-white">{item.author.name}</span>
                    {!item.readAt ? (
                      <span className="rounded-md bg-[#00B050]/15 px-2.5 py-1 text-[11px] font-semibold text-[#8ff0ba]">
                        Neu
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8393b6]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Gelesen
                      </span>
                    )}
                    <span className="text-xs text-[#8393b6]">{formatDate(item.createdAt)}</span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-[#d4def5]">
                    {renderTextWithMentionHighlights(item.commentBody)}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#94a3c3]">
                    <span className="rounded-md bg-[#0f1728] px-2.5 py-1 text-[#c8d3eb]">{item.spaceName}</span>
                    <span>/</span>
                    <span>{item.folderName}</span>
                    <span>/</span>
                    <span>{item.projectName}</span>
                    <span>/</span>
                    <span className="font-medium text-[#d4def5]">{item.taskTitle}</span>
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

function renderTextWithMentionHighlights(value: string) {
  return value.split(/(@[a-zA-Z0-9._-]+)/g).map((part, index) => {
    if (!part.startsWith("@")) {
      return part;
    }

    return (
      <span
        key={`${part}-${index}`}
        className="inline-flex rounded-md bg-[#0f6a52] px-1.5 py-0.5 font-semibold text-[#c8fff0] shadow-[0_0_0_1px_rgba(21,187,143,0.28)]"
      >
        {part}
      </span>
    );
  });
}
