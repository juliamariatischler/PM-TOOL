import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL || "http://localhost:3000";

const config: CapacitorConfig = {
  appId: "com.pmtool.app",
  appName: "PM Tool",
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
  },
};

export default config;

