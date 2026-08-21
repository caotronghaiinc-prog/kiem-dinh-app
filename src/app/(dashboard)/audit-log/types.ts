export type AuditAction = "insert" | "update" | "delete";

export interface AuditLogRow {
  id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  changed_at: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  // Quan hệ nhiều-1 (nhiều audit_log -> 1 profiles) nên Supabase trả về
  // object đơn, không phải mảng. null khi thao tác không qua phiên đăng
  // nhập user thường (vd migration/service role) -- xem migration 0028.
  changed_by: { full_name: string | null } | null;
}

export interface ProfileOption {
  id: string;
  full_name: string | null;
}
