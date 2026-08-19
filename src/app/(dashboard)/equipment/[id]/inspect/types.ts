// Khớp cột equipment_checklist_items.value_fields (jsonb, migration 0012) --
// PostgREST tự parse jsonb thành object/array JS, không cần JSON.parse.
export interface ChecklistValueField {
  key: string;
  label: string;
  unit: string | null;
}

export type ChecklistResult = "dat" | "khong_dat" | "khong_danh_gia";
export type PresenceValue = "co" | "khong_co";

export interface ChecklistItem {
  id: string;
  section: string;
  item_order: number;
  item_code: string | null;
  title: string;
  technical_requirement: string | null;
  has_presence_flag: boolean;
  value_fields: ChecklistValueField[];
  is_required: boolean;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  source_document: string | null;
}

export interface InspectEquipment {
  id: string;
  code: string;
  name: string;
  // PROMPT-33: cần biết loại thiết bị để render có điều kiện form riêng cho
  // "Bình áp lực" (mẫu I-V, khác hẳn A/B/C của Thiết bị nâng) -- xem
  // binh-ap-luc-extra-form.tsx.
  type: string | null;
}
