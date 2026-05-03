import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.pmtool.app",
  appName: "PM Tool",
  webDir: "out",
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: true,
      }
    : undefined,
};

export default config;
