import { z } from "zod";

export const CONTRACT_STATUS_VALUES = ["dang_thuc_hien", "hoan_thanh", "da_thanh_ly", "huy"] as const;

// PROMPT-59: total_value KHÔNG còn là field nhập tay -- đổi thành cache tự
// tính = SUM(quantity * unit_price) của contract_equipment qua trigger DB
// (migration 0031), nhập/sửa ở trang chi tiết hợp đồng, không phải ở đây.
export const contractFormSchema = z.object({
  customer_id: z.string().min(1, "Vui lòng chọn khách hàng."),
  contract_no: z.string().trim().min(1, "Vui lòng nhập số hợp đồng."),
  title: z.string().trim().optional(),
  signed_date: z.string().trim().optional(),
  status: z.enum(CONTRACT_STATUS_VALUES),
  note: z.string().trim().optional(),
});

export type ContractFormValues = z.infer<typeof contractFormSchema>;
