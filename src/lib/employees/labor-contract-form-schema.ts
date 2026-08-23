import { z } from "zod";

export const LABOR_CONTRACT_TYPE_VALUES = [
  "thu_viec",
  "xac_dinh_thoi_han",
  "khong_xac_dinh_thoi_han",
] as const;

// Mirror ROLE_LABELS (src/lib/auth/role-labels.ts) -- 1 nguồn nhãn tiếng
// Việt duy nhất cho contract_type, dùng chung giữa badge danh sách và select
// trong dialog.
export const LABOR_CONTRACT_TYPE_LABELS: Record<(typeof LABOR_CONTRACT_TYPE_VALUES)[number], string> = {
  thu_viec: "Thử việc",
  xac_dinh_thoi_han: "Xác định thời hạn",
  khong_xac_dinh_thoi_han: "Không xác định thời hạn",
};

// end_date BẮT BUỘC trừ khi contract_type = "khong_xac_dinh_thoi_han" --
// dùng superRefine vì điều kiện phụ thuộc field khác (mirror
// acceptance-form-schema.ts, PROMPT-61). KHÔNG validate thứ tự ngày ký/bắt
// đầu/kết thúc chặt -- giữ đơn giản theo quyết định của Hải, admin tự chịu
// trách nhiệm nhập đúng như trên bản giấy.
export const laborContractFormSchema = z
  .object({
    contract_type: z.enum(LABOR_CONTRACT_TYPE_VALUES),
    contract_no: z.string().trim().optional(),
    signed_date: z.string().trim().min(1, "Vui lòng chọn ngày ký."),
    start_date: z.string().trim().min(1, "Vui lòng chọn ngày bắt đầu."),
    end_date: z.string().trim().optional(),
    note: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.contract_type !== "khong_xac_dinh_thoi_han" && !values.end_date?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_date"],
        message: "Vui lòng chọn ngày kết thúc.",
      });
    }
  });

export type LaborContractFormValues = z.infer<typeof laborContractFormSchema>;

export const LABOR_CONTRACT_EMPTY_VALUES: LaborContractFormValues = {
  contract_type: "thu_viec",
  contract_no: "",
  signed_date: "",
  start_date: "",
  end_date: "",
  note: "",
};
