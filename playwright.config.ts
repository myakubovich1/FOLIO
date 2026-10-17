import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  workers: 2,
  timeout: 60000,
  use: { baseURL: "http://127.0.0.1:3101" },
  webServer: [
    {
      command: "PORT=3101 APP_URL=http://127.0.0.1:3101 npm start",
      url: "http://127.0.0.1:3101",
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command:
        "FOLIO_IDENTITY_TEST_SERVER=1 APP_URL=http://127.0.0.1:3102 npx tsx tests/owner-server.ts",
      url: "http://127.0.0.1:3102",
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: { viewport: { width: 390, height: 844 }, isMobile: true },
    },
  ],
});
