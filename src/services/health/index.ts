import { androidHealthService } from "@/services/health/health.android";
import { iosHealthService } from "@/services/health/health.ios";
import { webHealthService } from "@/services/health/health.web";
import type { HealthService } from "@/services/health/types";
import { getAppPlatform } from "@/services/platform/runtime";

export * from "@/services/health/types";

export function getHealthService(): HealthService {
  const platform = getAppPlatform();

  if (platform === "ios") {
    return iosHealthService;
  }

  if (platform === "android") {
    return androidHealthService;
  }

  return webHealthService;
}
