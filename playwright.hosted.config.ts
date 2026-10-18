import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Exercises Next's native API route, not the local Express listening server.
export default defineConfig({
  ...base,
  use: { ...base.use, baseURL: "http://127.0.0.1:3105" },
  webServer: [
    {
      command:
        "APP_URL=http://127.0.0.1:3105 npx next start --hostname 127.0.0.1 --port 3105",
      url: "http://127.0.0.1:3105",
      reuseExistingServer: false,
      timeout: 30000,
    },
    ...(Array.isArray(base.webServer) ? [base.webServer[1]] : []),
  ],
});
