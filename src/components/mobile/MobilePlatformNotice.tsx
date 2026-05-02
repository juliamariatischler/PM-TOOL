"use client";

import { Smartphone } from "lucide-react";
import { getAppPlatform, isNativePlatform } from "@/services/platform/runtime";

export function MobilePlatformNotice() {
  const platform = getAppPlatform();
  const nativeRuntime = isNativePlatform();

  if (!nativeRuntime) {
    return null;
  }

  const platformLabel = platform === "ios" ? "iOS" : "Android";

  return (
    <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-900">
      <Smartphone className="h-3.5 w-3.5" />
      <span>{platformLabel} runtime aktiv</span>
    </div>
  );
}
