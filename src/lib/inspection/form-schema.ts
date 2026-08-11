import { z } from "zod";

export const INSPECTION_RESULT_OPTIONS = ["pass", "fail", "pending"] as const;

export const inspectionFormSchema = z
  .object({
    inspection_date: z.string().trim().min(1, "Vui lòng chọn ngày kiểm định."),
    result: z.enum(INSPECTION_RESULT_OPTIONS, {
      errorMap: () => ({ message: "Vui lòng chọn kết quả kiểm định." }),
    }),
    report_number: z.string().trim().optional(),
    new_expiry_date: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (!data.new_expiry_date) return true;
      // Chuỗi ngày dạng YYYY-MM-DD (input type="date") so sánh trực tiếp
      // theo thứ tự chữ cái là đúng thứ tự thời gian, không cần parse Date.
      return data.new_expiry_date > data.inspection_date;
    },
    {
      message: "Hạn kiểm định mới phải sau ngày kiểm định.",
      path: ["new_expiry_date"],
    }
  );

export type InspectionFormValues = z.infer<typeof inspectionFormSchema>;

// Bucket Storage private, tạo ở migration 0009 -- xem file qua signed URL,
// không lưu/dùng public URL cố định (xem AttachmentLink).
export const ATTACHMENT_BUCKET = "inspection-files";
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

/** Validate thủ công (ngoài zod) vì input file không hợp với react-hook-form theo cách các field còn lại dùng. */
export function validateAttachmentFile(file: File): string | null {
  const dotIndex = file.name.lastIndexOf(".");
  const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : "";
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext)) {
    return "Chỉ chấp nhận file PDF, JPG hoặc PNG.";
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return "Dung lượng file tối đa 10MB.";
  }
  return null;
}
