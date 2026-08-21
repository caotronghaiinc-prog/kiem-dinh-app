import { z } from "zod";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export const paymentFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập số tiền.")
    .regex(/^\d+$/, "Số tiền phải là số.")
    .refine((v) => Number(v) > 0, "Số tiền phải lớn hơn 0."),
  paid_date: z.string().trim().min(1, "Vui lòng chọn ngày thu."),
  method: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export const PAYMENT_EMPTY_VALUES: PaymentFormValues = {
  amount: "",
  paid_date: todayIso(),
  method: "",
  note: "",
};
