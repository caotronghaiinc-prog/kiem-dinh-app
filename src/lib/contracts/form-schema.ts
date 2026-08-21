import { z } from "zod";

export const CONTRACT_STATUS_VALUES = ["dang_thuc_hien", "hoan_thanh", "da_thanh_ly", "huy"] as const;

// total_value: input hiển thị có phân cách nghìn (xem formatNumberInput),
// nhưng field.value luôn là chuỗi số nguyên thuần (đã strip dấu chấm) --
// validate ở đây chỉ cần chắc là chuỗi số, không rỗng.
export const contractFormSchema = z.object({
  customer_id: z.string().min(1, "Vui lòng chọn khách hàng."),
  contract_no: z.string().trim().min(1, "Vui lòng nhập số hợp đồng."),
  title: z.string().trim().optional(),
  signed_date: z.string().trim().optional(),
  total_value: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập giá trị hợp đồng.")
    .regex(/^\d+$/, "Giá trị hợp đồng phải là số."),
  status: z.enum(CONTRACT_STATUS_VALUES),
  note: z.string().trim().optional(),
});

export type ContractFormValues = z.infer<typeof contractFormSchema>;
