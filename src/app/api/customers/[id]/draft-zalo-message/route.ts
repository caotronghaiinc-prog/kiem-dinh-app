import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getExpiryStatus } from "@/lib/utils/expiry-status";
import { draftZaloMessage } from "@/lib/ai/draft-message";
import { logAndGetSafeMessage } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";

// OWASP RULE-16: route này gọi OpenAI (tốn phí thực tế mỗi lần gọi) nên giới
// hạn chặt hơn nhiều so với các route chỉ đọc dữ liệu -- đủ dùng cho quy
// trình soạn tin nhắn bình thường (soạn, chỉnh, soạn lại vài lần) nhưng chặn
// được việc gọi lặp lại liên tục gây tốn chi phí.
const RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW_MS = 5 * 60_000;

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { allowed, retryAfterSeconds } = checkRateLimit(
    `draft-zalo-message:${user.id}`,
    RATE_LIMIT,
    RATE_LIMIT_WINDOW_MS
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Soạn tin nhắn quá nhiều lần, vui lòng thử lại sau ít phút." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("company_name, contact_name, phone")
    .eq("id", params.id)
    .maybeSingle();

  if (customerError || !customer) {
    return NextResponse.json({ error: "Không tìm thấy khách hàng." }, { status: 404 });
  }

  const { data: equipmentData, error: equipmentError } = await supabase
    .from("equipment")
    .select("name, code, expiry_date")
    .eq("customer_id", params.id)
    .neq("status", "inactive");

  if (equipmentError) {
    return NextResponse.json({ error: "Không tải được danh sách thiết bị." }, { status: 500 });
  }

  // Chỉ lấy thiết bị đỏ/vàng -- tính qua getExpiryStatus(expiry_date), không
  // dùng cột status (status không phân biệt được đỏ/vàng, xem PROGRESS.md).
  const alertEquipment = (equipmentData ?? [])
    .map((item) => ({ ...item, expiryStatus: getExpiryStatus(item.expiry_date) }))
    .filter((item) => item.expiryStatus.color === "red" || item.expiryStatus.color === "yellow");

  if (alertEquipment.length === 0) {
    return NextResponse.json(
      { error: "Khách hàng này hiện không có thiết bị nào sắp/đã hết hạn kiểm định." },
      { status: 400 }
    );
  }

  try {
    const message = await draftZaloMessage({
      companyName: customer.company_name,
      contactName: customer.contact_name,
      phone: customer.phone,
      equipment: alertEquipment.map((item) => ({
        name: item.name,
        code: item.code,
        expiryDate: item.expiry_date,
        statusLabel: item.expiryStatus.label,
      })),
    });

    return NextResponse.json({ message });
  } catch (error) {
    // OWASP RULE-20: không trả nguyên văn lỗi từ OpenAI SDK về client (có
    // thể lộ chi tiết config/API key/nội bộ) -- log ở server, trả message
    // chung.
    const safeMessage = logAndGetSafeMessage(
      error,
      "Soạn tin nhắn thất bại, vui lòng thử lại."
    );
    return NextResponse.json({ error: safeMessage }, { status: 502 });
  }
}
