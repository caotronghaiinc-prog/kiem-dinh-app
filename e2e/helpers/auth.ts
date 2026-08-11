import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";
import { loadEnvLocal } from "./env";

loadEnvLocal();

/**
 * Client service-role dùng riêng cho test (seed/dọn dữ liệu, tạo magic
 * link) -- bypass RLS hoàn toàn, KHÔNG dùng lại cho code ứng dụng.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local -- cần để chạy e2e test."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getTestLoginSecret(): string {
  const secret = process.env.E2E_TEST_LOGIN_SECRET;
  if (!secret) {
    throw new Error(
      "Thiếu E2E_TEST_LOGIN_SECRET trong .env.local -- cần để gọi /api/test-login (route yêu cầu header x-test-login-secret khớp biến này, xem src/app/api/test-login/route.ts)."
    );
  }
  return secret;
}

/**
 * Đăng nhập trong Playwright mà KHÔNG cần biết mật khẩu thật: dùng service
 * role tạo magic link (admin.generateLink), lấy token_hash rồi điều hướng
 * tới route nội bộ /api/test-login (chặn 2 lớp: NODE_ENV !== production
 * VÀ header x-test-login-secret khớp E2E_TEST_LOGIN_SECRET -- biến này chỉ
 * có trong .env.local, không bao giờ đặt trên Vercel) để route đó verify +
 * set cookie phiên đăng nhập đúng cách @supabase/ssr đang dùng trong toàn
 * bộ app (không tự dựng cookie thủ công, tránh sai định dạng).
 */
export async function loginAs(
  page: Page,
  email: string,
  redirectTo = "/dashboard"
): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (error || !data?.properties?.hashed_token) {
    throw new Error(`Không tạo được magic link cho ${email}: ${error?.message ?? "không rõ lỗi"}`);
  }

  const url = `/api/test-login?token_hash=${encodeURIComponent(data.properties.hashed_token)}&redirect=${encodeURIComponent(redirectTo)}`;

  // Chỉ gắn header bí mật cho đúng request này rồi gỡ ngay -- tránh gửi
  // kèm secret trên mọi request khác của context (setExtraHTTPHeaders áp
  // dụng cho cả context, không phải 1 request đơn lẻ).
  const context = page.context();
  await context.setExtraHTTPHeaders({ "x-test-login-secret": getTestLoginSecret() });
  await page.goto(url);
  await context.setExtraHTTPHeaders({});
}
