export type AppPlatform = "web" | "ios" | "android";

type CapacitorLike = {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
};

declare global {
  interface Window {
    Capacitor?: CapacitorLike;
  }
}

function getCapacitorRuntime(): CapacitorLike | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.Capacitor;
}

export function getAppPlatform(): AppPlatform {
  const platform = getCapacitorRuntime()?.getPlatform?.();

  if (platform === "ios" || platform === "android") {
    return platform;
  }

  return "web";
}

export function isNativePlatform(): boolean {
  return Boolean(getCapacitorRuntime()?.isNativePlatform?.());
}
