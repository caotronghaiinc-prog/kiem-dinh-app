// PROMPT-23: registry theo equipment.type -- thêm loại thiết bị mới chỉ
// cần thêm 1 entry ở đây (+ file mẫu Word trong public/report-templates/ +
// 1 module build*ReportData mới mirror thiet-bi-nang-can-truc.ts), không
// phải sửa export-report-dialog.tsx hay inspection-history-section.tsx.
//
// Cả 2 module build*ReportData đang dùng CHUNG 1 chữ ký hàm
// (BuildReportDataInput -- xem shared.ts, không có field riêng theo loại
// thiết bị vì khối "Thông số cơ bản" đọc từ equipment.spec_values, tự diễn
// giải theo key bên trong từng module) nên không cần union type/any ở đây.
import { buildThietBiNangCauTrucReportData } from "@/lib/reports/thiet-bi-nang-cau-truc";
import { buildThietBiNangCanTrucReportData } from "@/lib/reports/thiet-bi-nang-can-truc";
import type { BuildReportDataInput } from "@/lib/reports/shared";

export interface ReportRegistryEntry {
  templateUrl: string;
  buildData: (input: BuildReportDataInput) => Record<string, unknown>;
}

export const REPORT_REGISTRY: Record<string, ReportRegistryEntry> = {
  "Thiết bị nâng - Cầu trục": {
    templateUrl: "/report-templates/thiet-bi-nang-cau-truc.docx",
    buildData: buildThietBiNangCauTrucReportData,
  },
  "Thiết bị nâng - Cần trục": {
    templateUrl: "/report-templates/thiet-bi-nang-can-truc.docx",
    buildData: buildThietBiNangCanTrucReportData,
  },
};

export function getReportRegistryEntry(
  equipmentType: string | null | undefined
): ReportRegistryEntry | null {
  if (!equipmentType) return null;
  return REPORT_REGISTRY[equipmentType] ?? null;
}
