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
  // Mặc định 30s đôi khi không đủ cho lần đầu Next dev compile on-demand
  // 1 route chưa ai ghé (vd /customers/[id]/edit) -- nhất là những test
  // điều hướng qua nhiều trang liên tiếp trong 1 test (PROMPT-14). Không
  // liên quan tới tốc độ thật của app khi build production.
  timeout: 60_000,
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
