import type { InspectionResult } from "@/lib/inspection/result";

export interface EquipmentDetail {
  id: string;
  code: string;
  name: string;
  type: string | null;
  manufacturer: string | null;
  manufacture_year: number | null;
  serial_number: string | null;
  specifications: string | null;
  location: string | null;
  last_inspection_date: string | null;
  expiry_date: string | null;
  inspection_cycle: number | null;
  status: string;
  notes: string | null;
  customer_id: string;
  // Quan hệ nhiều-1 (nhiều equipment -> 1 customer) nên Supabase trả về
  // object đơn, không phải mảng.
  customer: { company_name: string } | null;
}

export interface InspectionPhotoRow {
  id: string;
  category: "tong_the" | "chi_tiet_khong_dat";
  storage_path: string;
}

export interface InspectionHistoryDetailRow {
  id: string;
  inspection_date: string;
  result: InspectionResult | null;
  report_number: string | null;
  new_expiry_date: string | null;
  notes: string | null;
  attachment_url: string | null;
  // Quan hệ nhiều-1 (nhiều inspection_history -> 1 profiles) nên Supabase
  // trả về object đơn, không phải mảng.
  inspector: { full_name: string | null } | null;
  // Quan hệ 1-nhiều (PROMPT-19b) -- Supabase trả về mảng.
  photos: InspectionPhotoRow[];
}
