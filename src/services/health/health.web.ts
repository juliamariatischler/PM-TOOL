import type { HealthAvailability, HealthService, HealthSnapshot } from "@/services/health/types";

export const webHealthService: HealthService = {
  platform: "web",
  isSupported() {
    return false;
  },
  async getAvailability(): Promise<HealthAvailability> {
    return "unsupported";
  },
  async getSnapshot(): Promise<HealthSnapshot | null> {
    return null;
  },
};
