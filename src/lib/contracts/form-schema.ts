import { z } from "zod";

export const CONTRACT_STATUS_VALUES = ["dang_thuc_hien", "hoan_thanh", "da_thanh_ly", "huy"] as const;

// PROMPT-59: total_value KHÔNG còn là field nhập tay -- đổi thành cache tự
// tính = SUM(quantity * unit_price) của contract_equipment qua trigger DB
// (migration 0031), nhập/sửa ở trang chi tiết hợp đồng, không phải ở đây.
// PROMPT-66: 6 field cho "Giấy đề nghị thực hiện công việc" -- tất cả
// optional (hợp đồng có thể chưa cần xuất giấy này ngay lúc tạo). Danh
// sách "Kiểm định viên tham gia"/"Người đề nghị" KHÔNG nằm trong schema
// này -- 2 state riêng ngoài react-hook-form (xem contract-form.tsx), vì
// đó là quan hệ nhiều-dòng ở bảng nối, không phải cột của contracts.
export const contractFormSchema = z.object({
  customer_id: z.string().min(1, "Vui lòng chọn khách hàng."),
  contract_no: z.string().trim().min(1, "Vui lòng nhập số hợp đồng."),
  title: z.string().trim().optional(),
  signed_date: z.string().trim().optional(),
  status: z.enum(CONTRACT_STATUS_VALUES),
  note: z.string().trim().optional(),
  site_location: z.string().trim().optional(),
  execution_time_note: z.string().trim().optional(),
  contract_type_note: z.string().trim().optional(),
  using_unit_name: z.string().trim().optional(),
  using_unit_address: z.string().trim().optional(),
  work_request_document_no: z.string().trim().optional(),
});

export type ContractFormValues = z.infer<typeof contractFormSchema>;
