import { defineConfig, devices } from "@playwright/test";
import { loadEnvLocal } from "./e2e/helpers/env";

loadEnvLocal();

export default defineConfig({
  testDir: "./e2e",
  // Test seed/dọn dữ liệu chung trên cùng project Supabase -- chạy tuần tự
  // để tránh 2 file test seed/cleanup đè lên nhau.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
