import type { AppPlatform } from "@/services/platform/runtime";

export type HealthAvailability = "available" | "unavailable" | "unsupported";

export type HealthSnapshot = {
  steps: number;
  source: AppPlatform;
  updatedAt: string | null;
};

export interface HealthService {
  readonly platform: AppPlatform;
  isSupported(): boolean;
  getAvailability(): Promise<HealthAvailability>;
  getSnapshot(): Promise<HealthSnapshot | null>;
}
