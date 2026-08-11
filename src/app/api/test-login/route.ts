import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * CHỈ dùng cho test Playwright chạy local (xem e2e/helpers/auth.ts) -- nhận
 * `token_hash` do supabase.auth.admin.generateLink() (service role, chạy
 * trong tiến trình Node của Playwright) tạo ra, verify bằng
 * supabase.auth.verifyOtp() để có phiên đăng nhập hợp lệ mà KHÔNG cần biết
 * mật khẩu thật của tài khoản test -- tránh phải lưu mật khẩu tài khoản
 * thật vào code/CI.
 *
 * Chặn 2 lớp độc lập, không lớp nào tự đủ:
 * 1. NODE_ENV === "production" -> 404. `next build`/`next start` chỉ set
 *    NODE_ENV mặc định NẾU chưa có sẵn trong shell (xem node_modules/next/
 *    dist/bin/next) -- nên nếu 1 máy nào đó lỡ chạy build/start với
 *    NODE_ENV bị set sai từ trước, lớp này KHÔNG đảm bảo chặn được.
 * 2. Header `x-test-login-secret` phải khớp E2E_TEST_LOGIN_SECRET -- biến
 *    này CHỈ được đặt trong .env.local, KHÔNG BAO GIỜ đặt trên Vercel hay
 *    bất kỳ môi trường production/preview nào. Nếu biến này không tồn tại
 *    (đúng trạng thái trên mọi deployment thật) thì route luôn 404 dù
 *    NODE_ENV có bị lệch thế nào đi nữa -- đây là lớp chặn thực sự đáng
 *    tin cậy, lớp (1) chỉ là phòng thủ thêm.
 */
export async function GET(request: NextRequest) {
  const testLoginSecret = process.env.E2E_TEST_LOGIN_SECRET;
  if (
    process.env.NODE_ENV === "production" ||
    !testLoginSecret ||
    request.headers.get("x-test-login-secret") !== testLoginSecret
  ) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const redirectParam = searchParams.get("redirect") || "/dashboard";
  const redirectTo = redirectParam.startsWith("/") ? redirectParam : "/dashboard";

  if (!tokenHash) {
    return NextResponse.json({ error: "Missing token_hash" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.redirect(new URL(redirectTo, origin));
}
