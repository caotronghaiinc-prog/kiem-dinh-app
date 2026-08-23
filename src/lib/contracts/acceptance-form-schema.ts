import { z } from "zod";

export const ACCEPTANCE_RESULT_VALUES = ["dat", "co_van_de"] as const;

const DEFAULT_COPIES_NOTE = "Biên bản lập thành 04 bản, mỗi bên giữ 02 bản.";

// acceptance_note BẮT BUỘC có nội dung khi acceptance_result = "co_van_de"
// (đúng comment cột trong migration 0033) -- dùng superRefine vì điều kiện
// phụ thuộc field khác, zod .refine đơn không đủ để gắn lỗi vào đúng field.
export const acceptanceFormSchema = z
  .object({
    acceptance_date: z.string().trim().min(1, "Vui lòng chọn ngày nghiệm thu."),
    acceptance_location: z.string().trim().optional(),
    acceptance_result: z.enum(ACCEPTANCE_RESULT_VALUES),
    acceptance_note: z.string().trim().optional(),
    representative_a_name: z.string().trim().optional(),
    representative_a_title: z.string().trim().optional(),
    acceptance_copies_note: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.acceptance_result === "co_van_de" && !values.acceptance_note?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["acceptance_note"],
        message: "Vui lòng ghi rõ vấn đề khi chọn \"Có vấn đề, ghi chú\".",
      });
    }
  });

export type AcceptanceFormValues = z.infer<typeof acceptanceFormSchema>;

export function buildAcceptanceEmptyValues(prefill: {
  acceptance_date: string | null;
  acceptance_location: string | null;
  acceptance_result: string | null;
  acceptance_note: string | null;
  representative_a_name: string | null;
  representative_a_title: string | null;
  acceptance_copies_note: string | null;
  customerAddress: string | null;
  customerContactName: string | null;
}): AcceptanceFormValues {
  return {
    acceptance_date: prefill.acceptance_date ?? "",
    acceptance_location: prefill.acceptance_location ?? prefill.customerAddress ?? "",
    acceptance_result: (prefill.acceptance_result as AcceptanceFormValues["acceptance_result"]) ?? "dat",
    acceptance_note: prefill.acceptance_note ?? "",
    representative_a_name: prefill.representative_a_name ?? prefill.customerContactName ?? "",
    representative_a_title: prefill.representative_a_title ?? "",
    acceptance_copies_note: prefill.acceptance_copies_note ?? DEFAULT_COPIES_NOTE,
  };
}
