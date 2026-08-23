import { z } from "zod";

// PROMPT-65: tất cả field optional -- không phải ai cũng đã có sẵn đủ
// CCCD/ngày sinh lúc nhập lần đầu, full_name giữ optional như ràng buộc cũ
// trước giờ (không đổi). CCCD nếu có nhập thì phải đúng 12 chữ số.
export const employeeInfoFormSchema = z.object({
  full_name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  job_title: z.string().trim().optional(),
  date_of_birth: z.string().trim().optional(),
  cccd_number: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^\d{12}$/.test(value), "Số CCCD phải gồm đúng 12 chữ số."),
  start_date: z.string().trim().optional(),
  permanent_address: z.string().trim().optional(),
});

export type EmployeeInfoFormValues = z.infer<typeof employeeInfoFormSchema>;

export function buildEmployeeInfoValues(employee: {
  full_name: string | null;
  phone: string | null;
  job_title: string | null;
  date_of_birth: string | null;
  cccd_number: string | null;
  start_date: string | null;
  permanent_address: string | null;
}): EmployeeInfoFormValues {
  return {
    full_name: employee.full_name ?? "",
    phone: employee.phone ?? "",
    job_title: employee.job_title ?? "",
    date_of_birth: employee.date_of_birth ?? "",
    cccd_number: employee.cccd_number ?? "",
    start_date: employee.start_date ?? "",
    permanent_address: employee.permanent_address ?? "",
  };
}
