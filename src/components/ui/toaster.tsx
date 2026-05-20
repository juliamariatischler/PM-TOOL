"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppToastPayload, AppToastVariant } from "@/lib/toast";

type ToastItem = Required<Pick<AppToastPayload, "title" | "variant">> & {
  id: number;
  message?: string;
};

const ICONS: Record<AppToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4" />,
  error: <XCircle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handleToast(event: Event) {
      const detail = (event as CustomEvent<AppToastPayload>).detail;
      const item: ToastItem = {
        id: Date.now() + Math.random(),
        title: detail.title,
        message: detail.message,
        variant: detail.variant ?? "info",
      };

      setItems((current) => [...current.slice(-2), item]);
      window.setTimeout(() => {
        setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      }, 4200);
    }

    window.addEventListener("app-toast", handleToast);
    return () => window.removeEventListener("app-toast", handleToast);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[80] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "flex gap-3 rounded-lg border bg-[#17233a] p-3 text-sm shadow-xl",
            item.variant === "success" && "border-[#00B050]/50 text-[#dffbea]",
            item.variant === "error" && "border-red-500/50 text-red-100",
            item.variant === "info" && "border-[#33415d] text-[#d4def5]"
          )}
        >
          <span
            className={cn(
              "mt-0.5",
              item.variant === "success" && "text-[#8ff0ba]",
              item.variant === "error" && "text-red-300",
              item.variant === "info" && "text-[#94a3c3]"
            )}
          >
            {ICONS[item.variant]}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{item.title}</div>
            {item.message ? <div className="mt-0.5 text-xs opacity-80">{item.message}</div> : null}
          </div>
          <button
            type="button"
            onClick={() => setItems((current) => current.filter((candidate) => candidate.id !== item.id))}
            className="rounded p-1 text-current opacity-60 hover:bg-white/10 hover:opacity-100"
            aria-label="Meldung schließen"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

