import type { UserRole } from "@/lib/types/profile";

// PROMPT-63: chuyển ra dùng chung (trước đó khai báo riêng trong layout.tsx)
// vì trang /employees cũng cần nhãn tiếng Việt cho role -- 1 nguồn duy nhất,
// tránh lệch nhãn giữa 2 nơi.
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Quản trị viên",
  inspector: "Kiểm định viên",
  accountant: "Kế toán",
  office: "Văn phòng",
};
