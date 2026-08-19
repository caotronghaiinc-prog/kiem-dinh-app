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
import { buildThietBiNangPaLangReportData } from "@/lib/reports/thiet-bi-nang-pa-lang";
import { buildThietBiNangToiReportData } from "@/lib/reports/thiet-bi-nang-toi";
import { buildThietBiNangVanThangReportData } from "@/lib/reports/thiet-bi-nang-van-thang";
import { buildThietBiNangBanNangReportData } from "@/lib/reports/thiet-bi-nang-ban-nang";
import { buildBinhApLucReportData } from "@/lib/reports/binh-ap-luc";
import { buildNoiHoiReportData } from "@/lib/reports/noi-hoi";
import { buildNoiGiaNhietDauReportData } from "@/lib/reports/noi-gia-nhiet-dau";
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
  "Thiết bị nâng - Palăng": {
    templateUrl: "/report-templates/thiet-bi-nang-pa-lang.docx",
    buildData: buildThietBiNangPaLangReportData,
  },
  "Thiết bị nâng - Tời": {
    templateUrl: "/report-templates/thiet-bi-nang-toi.docx",
    buildData: buildThietBiNangToiReportData,
  },
  "Thiết bị nâng - Vận thăng nâng hàng": {
    templateUrl: "/report-templates/thiet-bi-nang-van-thang.docx",
    buildData: buildThietBiNangVanThangReportData,
  },
  "Thiết bị nâng - Bàn nâng hàng": {
    templateUrl: "/report-templates/thiet-bi-nang-ban-nang.docx",
    buildData: buildThietBiNangBanNangReportData,
  },
  "Bình áp lực": {
    templateUrl: "/report-templates/binh-ap-luc.docx",
    buildData: buildBinhApLucReportData,
  },
  // PROMPT-39: mẫu Word public/report-templates/noi-hoi.docx CHƯA có --
  // mentor sẽ đưa file vào repo ở commit riêng sau. Đăng ký sẵn đường dẫn,
  // KHÔNG tạo file .docx giả -- nút "Xuất biên bản Word" sẽ hiện cho loại
  // này nhưng báo lỗi tải mẫu thất bại cho tới khi file được thêm vào.
  "Nồi hơi": {
    templateUrl: "/report-templates/noi-hoi.docx",
    buildData: buildNoiHoiReportData,
  },
  // PROMPT-41: mẫu Word public/report-templates/noi-gia-nhiet-dau.docx CHƯA
  // đăng ký chính thức trong PROMPT này -- chỉ đăng ký đường dẫn, đúng quy
  // ước đã dùng cho Nồi hơi (PROMPT-39/40).
  "Nồi gia nhiệt dầu": {
    templateUrl: "/report-templates/noi-gia-nhiet-dau.docx",
    buildData: buildNoiGiaNhietDauReportData,
  },
};

export function getReportRegistryEntry(
  equipmentType: string | null | undefined
): ReportRegistryEntry | null {
  if (!equipmentType) return null;
  return REPORT_REGISTRY[equipmentType] ?? null;
}
