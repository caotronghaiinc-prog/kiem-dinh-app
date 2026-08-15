import { z } from "zod";

const CURRENT_YEAR = new Date().getFullYear();

// Dropdown "Loại thiết bị" CỐ ĐỊNH theo 2 nhóm dịch vụ + 1 mục "Khác" đứng
// riêng (không thuộc nhóm nào). Dùng chuỗi tiếng Việt làm value luôn (giống
// cách customers.type/source lưu ở PROMPT-05) vì cột equipment.type là text
// tự do, không có check constraint.
//
// PROMPT-18: "Thiết bị nâng" tách thành 6 loại con -- mỗi loại sẽ có bộ
// checklist kiểm định riêng (equipment_checklist_templates.equipment_type
// phải khớp CHÍNH XÁC 1 trong 6 giá trị này). App chưa có dữ liệu thật nên
// không cần migration đổi dữ liệu equipment.type cũ.
export const EQUIPMENT_TYPE_GROUPS = [
  {
    label: "Nhóm KTAT",
    options: [
      "Nồi hơi",
      "Bình áp lực",
      "Hệ thống ống áp lực",
      "Thiết bị nâng - Cầu trục",
      "Thiết bị nâng - Cần trục",
      "Thiết bị nâng - Palăng",
      "Thiết bị nâng - Tời",
      "Thiết bị nâng - Vận thăng nâng hàng",
      "Thiết bị nâng - Bàn nâng hàng",
      "Thang máy, thang cuốn",
      "Thiết bị vui chơi, cáp treo",
      "Thiết bị ATLĐ",
    ],
  },
  {
    label: "Nhóm Thiết bị xây dựng",
    options: [
      "Cốp pha trượt, leo",
      "Giàn thép ván khuôn",
      "Máy khoan, ép cọc",
      "Máy bơm bê tông",
      "Máy thi công hầm ngầm",
      "Giàn giáo thép",
      "Thiết bị vận tải, biển",
    ],
  },
] as const;

export const EQUIPMENT_TYPE_OTHER = "Khác";

export const EQUIPMENT_TYPE_OPTIONS = [
  ...EQUIPMENT_TYPE_GROUPS.flatMap((group) => group.options),
  EQUIPMENT_TYPE_OTHER,
] as unknown as [string, ...string[]];

export const equipmentFormSchema = z
  .object({
    customer_id: z.string().min(1, "Vui lòng chọn khách hàng."),
    name: z.string().trim().min(1, "Vui lòng nhập tên thiết bị."),
    type: z.enum(EQUIPMENT_TYPE_OPTIONS, {
      errorMap: () => ({ message: "Vui lòng chọn loại thiết bị." }),
    }),
    manufacturer: z.string().trim().optional(),
    manufacture_year: z
      .string()
      .trim()
      .refine(
        (val) =>
          val === "" ||
          (/^\d{4}$/.test(val) && Number(val) >= 1950 && Number(val) <= CURRENT_YEAR),
        `Năm sản xuất phải từ 1950 đến ${CURRENT_YEAR}.`
      ),
    serial_number: z.string().trim().optional(),
    specifications: z.string().trim().optional(),
    location: z.string().trim().optional(),
    last_inspection_date: z.string().trim().optional(),
    expiry_date: z.string().trim().min(1, "Vui lòng chọn ngày hết hạn kiểm định."),
    inspection_cycle: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập chu kỳ kiểm định.")
      .refine(
        (val) => /^\d+$/.test(val) && Number(val) > 0,
        "Chu kỳ kiểm định phải là số nguyên dương."
      ),
    is_inactive: z.boolean(),
    notes: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (!data.last_inspection_date || !data.expiry_date) return true;
      // Chuỗi ngày dạng YYYY-MM-DD (input type="date") so sánh trực tiếp
      // theo thứ tự chữ cái là đúng thứ tự thời gian, không cần parse Date.
      return data.expiry_date > data.last_inspection_date;
    },
    {
      message: "Ngày hết hạn kiểm định phải sau ngày kiểm định gần nhất.",
      path: ["expiry_date"],
    }
  );

export type EquipmentFormValues = z.infer<typeof equipmentFormSchema>;
