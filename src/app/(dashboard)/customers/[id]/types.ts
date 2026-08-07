import type { InspectionResult } from "@/lib/inspection/result";

export interface EquipmentRow {
  id: string;
  code: string;
  name: string;
  type: string | null;
  expiry_date: string | null;
  status: string;
}

export interface InspectionRow {
  id: string;
  inspection_date: string;
  result: InspectionResult | null;
  report_number: string | null;
  new_expiry_date: string | null;
  // Quan hệ nhiều-1 (nhiều inspection_history -> 1 equipment/profiles) nên
  // Supabase trả về object đơn, không phải mảng.
  equipment: { name: string } | null;
  inspector: { full_name: string | null } | null;
}
