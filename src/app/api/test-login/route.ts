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
 * Chặn cứng ở production: route này chỉ có tác dụng khi đã có sẵn 1
 * token_hash hợp lệ (vốn chỉ tạo được bằng SUPABASE_SERVICE_ROLE_KEY), nên
 * không phải lỗ hổng cho phép đăng nhập tùy ý -- nhưng vẫn chặn hẳn ở
 * production cho chắc, đúng tinh thần "test-only".
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
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
