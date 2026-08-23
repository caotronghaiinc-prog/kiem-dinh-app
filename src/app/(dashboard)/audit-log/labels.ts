import { formatCurrency } from "@/lib/utils/currency";
import { LABOR_CONTRACT_TYPE_LABELS } from "@/lib/employees/labor-contract-form-schema";

export const TABLE_LABELS: Record<string, string> = {
  equipment: "Thiết bị",
  customers: "Khách hàng",
  inspection_history: "Lịch sử kiểm định",
  contracts: "Hợp đồng",
  contract_payments: "Thanh toán hợp đồng",
  profiles: "Nhân viên",
  employee_labor_contracts: "Hợp đồng lao động",
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

function formatCurrencyValue(value: unknown): string | null {
  return typeof value === "number" ? formatCurrency(value) : null;
}

// Nhãn nhận diện bản ghi rút ra từ new_data ?? old_data (bảng khác nhau có
// cột định danh khác nhau) -- inspection_history không có cột "code" như
// equipment/customers nên ghép ngày kiểm định + link phụ sang thiết bị liên
// quan (equipment_id luôn có, cột NOT NULL của bảng này). contract_payments
// cũng không có cột định danh riêng nên ghép số tiền + link phụ sang hợp
// đồng liên quan (contract_id luôn có, cột NOT NULL của bảng này).
export function getRecordInfo(
  tableName: string,
  data: Record<string, unknown> | null
): { label: string; equipmentId?: string; contractId?: string; profileId?: string } {
  if (!data) return { label: "—" };

  if (tableName === "equipment" || tableName === "customers" || tableName === "contracts") {
    return { label: typeof data.code === "string" ? data.code : "—" };
  }

  // PROMPT-65: profiles không có cột "code" -- ghép full_name (fallback
  // email) làm nhãn. id của chính profiles = record_id nên có thể link phụ
  // "Xem nhân viên" ngay từ chính bản ghi này.
  if (tableName === "profiles") {
    const fullName = typeof data.full_name === "string" && data.full_name ? data.full_name : null;
    const email = typeof data.email === "string" ? data.email : null;
    const profileId = typeof data.id === "string" ? data.id : undefined;
    return { label: fullName ?? email ?? "—", profileId };
  }

  // employee_labor_contracts không có cột định danh riêng -- ghép loại HĐ +
  // ngày ký, kèm link phụ sang nhân viên liên quan (mirror equipmentId/
  // contractId đã có cho inspection_history/contract_payments).
  if (tableName === "employee_labor_contracts") {
    const typeLabel =
      typeof data.contract_type === "string" && data.contract_type in LABOR_CONTRACT_TYPE_LABELS
        ? LABOR_CONTRACT_TYPE_LABELS[data.contract_type as keyof typeof LABOR_CONTRACT_TYPE_LABELS]
        : null;
    const signedDate = typeof data.signed_date === "string" ? data.signed_date : null;
    const profileId = typeof data.profile_id === "string" ? data.profile_id : undefined;
    return {
      label:
        typeLabel && signedDate
          ? `${typeLabel} - ký ${formatDate(signedDate)}`
          : (typeLabel ?? "—"),
      profileId,
    };
  }

  if (tableName === "inspection_history") {
    const inspectionDate = typeof data.inspection_date === "string" ? data.inspection_date : null;
    const equipmentId = typeof data.equipment_id === "string" ? data.equipment_id : undefined;
    return {
      label: inspectionDate ? `KĐ ngày ${formatDate(inspectionDate)}` : "—",
      equipmentId,
    };
  }

  if (tableName === "contract_payments") {
    const amountLabel = formatCurrencyValue(data.amount);
    const contractId = typeof data.contract_id === "string" ? data.contract_id : undefined;
    return {
      label: amountLabel ? `Thanh toán ${amountLabel}` : "—",
      contractId,
    };
  }

  return { label: "—" };
}
