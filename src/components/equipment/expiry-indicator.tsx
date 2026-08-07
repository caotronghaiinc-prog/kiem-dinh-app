import { Badge } from "@/components/ui/badge";
import {
  EXPIRY_COLOR_DOT_CLASS,
  EXPIRY_COLOR_TEXT_CLASS,
  getExpiryStatus,
} from "@/lib/utils/expiry-status";

const INACTIVE_BADGE_CLASS =
  "border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-100";

/**
 * Chấm màu + text trạng thái hạn kiểm định — dùng chung giữa tab "Thiết bị"
 * ở trang chi tiết khách hàng (PROMPT-06) và danh sách thiết bị (PROMPT-07),
 * sau này cả widget cảnh báo hạn trên Dashboard (PROMPT-10/11).
 *
 * Nếu status === 'inactive' (đã tick "Ngừng sử dụng" ở form PROMPT-08),
 * hiện badge xám "Ngừng sử dụng" thay vì đỏ/vàng/xanh theo expiry_date —
 * hạn kiểm định không còn ý nghĩa với thiết bị đã ngừng dùng. Xử lý ngay
 * trong component dùng chung này để mọi nơi gọi <ExpiryIndicator> tự động
 * đúng, không phải sửa riêng từng chỗ.
 */
export function ExpiryIndicator({
  expiryDate,
  status,
}: {
  expiryDate: string | null;
  status?: string | null;
}) {
  if (status === "inactive") {
    return (
      <Badge variant="outline" className={INACTIVE_BADGE_CLASS}>
        Ngừng sử dụng
      </Badge>
    );
  }

  const expiryStatus = getExpiryStatus(expiryDate);
  return (
    <span
      className={`inline-flex items-center gap-2 text-sm ${EXPIRY_COLOR_TEXT_CLASS[expiryStatus.color]}`}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${EXPIRY_COLOR_DOT_CLASS[expiryStatus.color]}`}
      />
      {expiryStatus.label}
    </span>
  );
}
