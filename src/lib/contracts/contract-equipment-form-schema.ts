import { z } from "zod";

// unit_price/quantity: input hiển thị có phân cách nghìn (unit_price, xem
// formatNumberInput) nhưng field.value luôn là chuỗi số nguyên thuần.
export const contractEquipmentFormSchema = z.object({
  unit: z.string().trim().optional(),
  unit_price: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập đơn giá.")
    .regex(/^\d+$/, "Đơn giá phải là số."),
  quantity: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập số lượng.")
    .regex(/^\d+$/, "Số lượng phải là số.")
    .refine((v) => Number(v) > 0, "Số lượng phải lớn hơn 0."),
  so_tem: z.string().trim().optional(),
  ngay_kiem_dinh: z.string().trim().optional(),
});

export type ContractEquipmentFormValues = z.infer<typeof contractEquipmentFormSchema>;
