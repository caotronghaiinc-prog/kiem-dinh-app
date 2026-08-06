export type ExpiryColor = "red" | "yellow" | "green";

export interface ExpiryStatus {
  color: ExpiryColor;
  label: string;
}

/**
 * Trạng thái hạn kiểm định theo expiry_date, dùng chung cho tab "Thiết bị"
 * ở trang chi tiết khách hàng và widget cảnh báo hạn KĐ trên Dashboard
 * (PROMPT-10/11) — không tính lại logic màu ở nơi khác.
 *
 * Đỏ: còn <=30 ngày hoặc đã quá hạn
 * Vàng: còn 31-60 ngày
 * Xanh lá: còn >60 ngày hoặc chưa có expiry_date
 */
export function getExpiryStatus(expiryDate: string | null): ExpiryStatus {
  if (!expiryDate) {
    return { color: "green", label: "Chưa có hạn" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return { color: "red", label: `Quá hạn ${Math.abs(diffDays)} ngày` };
  }
  if (diffDays <= 30) {
    return { color: "red", label: `Còn ${diffDays} ngày` };
  }
  if (diffDays <= 60) {
    return { color: "yellow", label: `Còn ${diffDays} ngày` };
  }
  return { color: "green", label: `Còn ${diffDays} ngày` };
}

export const EXPIRY_COLOR_DOT_CLASS: Record<ExpiryColor, string> = {
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
};

export const EXPIRY_COLOR_TEXT_CLASS: Record<ExpiryColor, string> = {
  red: "text-red-700",
  yellow: "text-yellow-700",
  green: "text-green-700",
};
