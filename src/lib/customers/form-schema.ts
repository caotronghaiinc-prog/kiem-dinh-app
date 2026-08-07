import { z } from "zod";

// 0901234567 (10 số, bắt đầu bằng 0) hoặc +84901234567
const VIETNAMESE_PHONE_REGEX = /^(0\d{9}|\+84\d{9})$/;
const TAX_CODE_REGEX = /^\d{10}$|^\d{13}$/;

export const CUSTOMER_TYPE_OPTIONS = ["doanh nghiệp", "cá nhân"] as const;
export const CUSTOMER_SOURCE_OPTIONS = [
  "Giới thiệu",
  "Website",
  "Gọi điện",
  "Sự kiện",
  "Khác",
] as const;

export const customerFormSchema = z
  .object({
    company_name: z.string().trim().min(1, "Vui lòng nhập tên công ty/khách hàng."),
    contact_name: z.string().trim().min(1, "Vui lòng nhập người liên hệ."),
    phone: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập số điện thoại.")
      .regex(
        VIETNAMESE_PHONE_REGEX,
        "Số điện thoại không hợp lệ (VD: 0901234567 hoặc +84901234567)."
      ),
    email: z
      .string()
      .trim()
      .email("Email không hợp lệ.")
      .optional()
      .or(z.literal("")),
    address: z.string().trim().min(1, "Vui lòng nhập địa chỉ."),
    tax_code: z
      .string()
      .trim()
      .regex(TAX_CODE_REGEX, "Mã số thuế phải gồm 10 hoặc 13 chữ số.")
      .optional()
      .or(z.literal("")),
    type: z.enum(CUSTOMER_TYPE_OPTIONS).optional().or(z.literal("")),
    industry: z.string().trim().optional(),
    source: z.enum(CUSTOMER_SOURCE_OPTIONS).optional().or(z.literal("")),
    status: z.enum(["potential", "active", "inactive"]),
    notes: z.string().trim().optional(),
  })
  // Doanh nghiệp bắt buộc phải có MST (chuẩn bị cho xuất hóa đơn điện tử ở
  // Phase 3) -- Cá nhân vẫn optional như cũ. Chỉ validate ở tầng form, cố
  // tình không thêm NOT NULL/CHECK ở DB vì dữ liệu cũ đã có KH doanh nghiệp
  // thiếu MST, không muốn chặn cứng làm hỏng dữ liệu hiện có.
  .superRefine((data, ctx) => {
    if (data.type === "doanh nghiệp" && !data.tax_code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng nhập mã số thuế cho khách hàng doanh nghiệp.",
        path: ["tax_code"],
      });
    }
  });

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
