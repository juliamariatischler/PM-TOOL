"use client";

export type AppToastVariant = "success" | "error" | "info";

export type AppToastPayload = {
  title: string;
  message?: string;
  variant?: AppToastVariant;
};

export function showToast(payload: AppToastPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AppToastPayload>("app-toast", { detail: payload }));
}

