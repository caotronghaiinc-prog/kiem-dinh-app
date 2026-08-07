import {
  EXPIRY_COLOR_DOT_CLASS,
  EXPIRY_COLOR_TEXT_CLASS,
  getExpiryStatus,
} from "@/lib/utils/expiry-status";

/**
 * Chấm màu + text trạng thái hạn kiểm định — dùng chung giữa tab "Thiết bị"
 * ở trang chi tiết khách hàng (PROMPT-06) và danh sách thiết bị (PROMPT-07),
 * sau này cả widget cảnh báo hạn trên Dashboard (PROMPT-10/11).
 */
export function ExpiryIndicator({ expiryDate }: { expiryDate: string | null }) {
  const status = getExpiryStatus(expiryDate);
  return (
    <span
      className={`inline-flex items-center gap-2 text-sm ${EXPIRY_COLOR_TEXT_CLASS[status.color]}`}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${EXPIRY_COLOR_DOT_CLASS[status.color]}`}
      />
      {status.label}
    </span>
  );
}
