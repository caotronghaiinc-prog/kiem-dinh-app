import { z } from "zod";

// PROMPT-43: form thêm/sửa dụng cụ đo (bảng inspection_tools, migration
// 0024) -- mirror equipmentFormSchema (src/lib/equipment/form-schema.ts)
// nhưng KHÔNG có "code" (trigger set_inspection_tool_code tự sinh, xem
// migration 0024) và "status" là 1 trong 3 giá trị cố định do người dùng tự
// chọn (khác equipment.status vốn do trigger compute_equipment_status()
// tính từ expiry_date -- ở đây không có ngày hết hạn dạng đó, chỉ có hạn
// hiệu chuẩn để cảnh báo màu, không quyết định active/maintenance/retired).
export const TOOL_STATUS_OPTIONS = [
  { value: "active", label: "Đang sử dụng" },
  { value: "maintenance", label: "Đang bảo trì" },
  { value: "retired", label: "Ngừng sử dụng" },
] as const;

export const toolFormSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên dụng cụ."),
  model: z.string().trim().optional(),
  serial_number: z.string().trim().optional(),
  ownership_doc: z.string().trim().optional(),
  calibration_due_date: z.string().trim().optional(),
  calibration_not_applicable: z.boolean(),
  calibration_cert_no: z.string().trim().optional(),
  // "" nghĩa là "-- Chưa gán --" -- chuyển thành null khi submit.
  custodian_id: z.string().trim().optional(),
  default_location: z.string().trim().optional(),
  status: z.enum(["active", "maintenance", "retired"]),
  note: z.string().trim().optional(),
});

export type ToolFormValues = z.infer<typeof toolFormSchema>;
