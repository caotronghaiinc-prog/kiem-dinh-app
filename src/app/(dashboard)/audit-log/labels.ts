export const TABLE_LABELS: Record<string, string> = {
  equipment: "Thiết bị",
  customers: "Khách hàng",
  inspection_history: "Lịch sử kiểm định",
};

export function getTableLabel(tableName: string): string {
  return TABLE_LABELS[tableName] ?? tableName;
}

export const ACTION_CONFIG: Record<string, { label: string; className: string }> = {
  insert: { label: "Thêm mới", className: "border-green-200 bg-green-100 text-green-800" },
  update: { label: "Cập nhật", className: "border-yellow-200 bg-yellow-100 text-yellow-800" },
  delete: { label: "Xóa", className: "border-red-200 bg-red-100 text-red-800" },
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("vi-VN");
}

// Nhãn nhận diện bản ghi rút ra từ new_data ?? old_data (bảng khác nhau có
// cột định danh khác nhau) -- inspection_history không có cột "code" như
// equipment/customers nên ghép ngày kiểm định + link phụ sang thiết bị liên
// quan (equipment_id luôn có, cột NOT NULL của bảng này).
export function getRecordInfo(
  tableName: string,
  data: Record<string, unknown> | null
): { label: string; equipmentId?: string } {
  if (!data) return { label: "—" };

  if (tableName === "equipment" || tableName === "customers") {
    return { label: typeof data.code === "string" ? data.code : "—" };
  }

  if (tableName === "inspection_history") {
    const inspectionDate = typeof data.inspection_date === "string" ? data.inspection_date : null;
    const equipmentId = typeof data.equipment_id === "string" ? data.equipment_id : undefined;
    return {
      label: inspectionDate ? `KĐ ngày ${formatDate(inspectionDate)}` : "—",
      equipmentId,
    };
  }

  return { label: "—" };
}
