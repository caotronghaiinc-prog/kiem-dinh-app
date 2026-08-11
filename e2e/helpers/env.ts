import { readFileSync, existsSync } from "fs";
import path from "path";

/**
 * Next.js tự nạp .env.local cho tiến trình `next dev`, nhưng tiến trình
 * Playwright (Node thuần) thì không -- cần tự đọc để có
 * NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY khi seed dữ liệu test
 * và tạo magic link. Không dùng thư viện `dotenv` để khỏi thêm dependency
 * mới chỉ cho việc parse vài dòng KEY=value đơn giản.
 */
export function loadEnvLocal(): void {
  const envPath = path.resolve(__dirname, "../../.env.local");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}
