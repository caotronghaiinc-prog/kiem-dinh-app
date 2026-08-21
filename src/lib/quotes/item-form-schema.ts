import { z } from "zod";

// unit_price/quantity: input hiển thị có phân cách nghìn (unit_price, xem
// formatNumberInput) nhưng field.value luôn là chuỗi số nguyên thuần.
export const quoteItemFormSchema = z.object({
  item_name: z.string().trim().min(1, "Vui lòng nhập tên hạng mục."),
  unit: z.string().trim().optional(),
  quantity: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập số lượng.")
    .regex(/^\d+$/, "Số lượng phải là số.")
    .refine((v) => Number(v) > 0, "Số lượng phải lớn hơn 0."),
  unit_price: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập đơn giá.")
    .regex(/^\d+$/, "Đơn giá phải là số."),
  note: z.string().trim().optional(),
});

export type QuoteItemFormValues = z.infer<typeof quoteItemFormSchema>;

export const QUOTE_ITEM_EMPTY_VALUES: QuoteItemFormValues = {
  item_name: "",
  unit: "",
  quantity: "1",
  unit_price: "",
  note: "",
};
