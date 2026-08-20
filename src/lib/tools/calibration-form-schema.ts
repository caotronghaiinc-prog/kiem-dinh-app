import { z } from "zod";

export const calibrationFormSchema = z.object({
  cert_no: z.string().trim().optional(),
  issued_date: z.string().trim().optional(),
  due_date: z.string().trim().min(1, "Vui lòng nhập hạn hiệu lực."),
  issuer: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export type CalibrationFormValues = z.infer<typeof calibrationFormSchema>;

// due_date để trống (khác borrowed_at ở loan-form-schema.ts) -- đây là hạn
// hiệu lực TƯƠNG LAI của lần hiệu chuẩn mới, không có mặc định hợp lý.
export const CALIBRATION_EMPTY_VALUES: CalibrationFormValues = {
  cert_no: "",
  issued_date: "",
  due_date: "",
  issuer: "",
  note: "",
};
