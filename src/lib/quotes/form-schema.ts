import { z } from "zod";

export const QUOTE_STATUS_VALUES = ["nhap", "da_gui", "da_chap_nhan", "tu_choi", "het_han"] as const;

// customer_id rỗng ("") nghĩa là khách CHƯA có trong /customers -- 5 ô
// snapshot khi đó bắt buộc nhập tay (chỉ customer_name_snapshot bắt buộc,
// 4 ô còn lại tùy chọn giống hồ sơ customer thật cũng cho phép thiếu).
export const quoteFormSchema = z.object({
  customer_id: z.string().optional(),
  customer_name_snapshot: z.string().trim().min(1, "Vui lòng nhập tên khách hàng."),
  customer_address_snapshot: z.string().trim().optional(),
  customer_contact_snapshot: z.string().trim().optional(),
  customer_phone_snapshot: z.string().trim().optional(),
  customer_tax_code_snapshot: z.string().trim().optional(),
  title: z.string().trim().optional(),
  valid_until: z.string().trim().optional(),
  status: z.enum(QUOTE_STATUS_VALUES),
  note: z.string().trim().optional(),
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;
