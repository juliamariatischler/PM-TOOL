import type { HealthAvailability, HealthService, HealthSnapshot } from "@/services/health/types";

export const androidHealthService: HealthService = {
  platform: "android",
  isSupported() {
    return true;
  },
  async getAvailability(): Promise<HealthAvailability> {
    return "unavailable";
  },
  async getSnapshot(): Promise<HealthSnapshot | null> {
    return null;
  },
};
