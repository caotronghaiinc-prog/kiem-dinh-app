-- =========================================================================
-- PROMPT-63: Danh sách Nhân viên/Kiểm định viên + Chứng chỉ + Phạm vi hoạt
-- động -- trước khi mời đồng nghiệp dùng thử (PROMPT-17), Hải muốn theo dõi
-- chứng chỉ kiểm định viên + phạm vi thiết bị mỗi chứng chỉ cho phép.
--
-- "Nhân viên" = mở rộng bảng profiles có sẵn, KHÔNG tạo khái niệm mới,
-- KHÔNG thêm cột nào lên profiles -- bảng mới inspector_certificates chỉ
-- tham chiếu profiles(id).
--
-- File chứng chỉ dùng CHUNG bucket Storage "inspection-files" đã có (migration
-- 0009), phân biệt qua path prefix mới "employee-certs/<profile_id>/..."
-- (mirror y hệt "tool-certs/<tool_id>/..." ở migration 0025) -- KHÔNG tạo
-- bucket/RLS storage mới.
--
-- Không có bước "phân công kiểm định viên" nào trong hệ thống -- cả 2 luồng
-- tạo inspection_history hiện có đều tự gán inspector_id = người đang đăng
-- nhập. Vì vậy RLS SELECT bảng này phải mở thêm cho CHÍNH CHỦ (không chỉ
-- admin) để 2 dialog/form kiểm định tự đọc được chứng chỉ của chính người
-- đang nhập, so sánh phạm vi và cảnh báo (không chặn) ngay lúc nhập --
-- INSERT/UPDATE/DELETE vẫn CHỈ ADMIN đúng như đã chốt phỏng vấn.
--
-- Không cần trigger đồng bộ cache kiểu sync_tool_after_calibration() --
-- khác dụng cụ đo (1 hạn hiệu chuẩn hiện hành có ý nghĩa), 1 nhân viên có
-- thể có NHIỀU chứng chỉ còn hạn cùng lúc, mỗi cái phủ 1 phạm vi khác nhau,
-- không có khái niệm "hạn gần nhất" đại diện. Trang chi tiết + widget
-- dashboard đọc thẳng bảng này, không cache lên profiles.
--
-- ⚠️ Migration này KHÔNG idempotent -- CHỈ chạy 1 lần. Lỡ chạy 2 lần thì:
--   drop trigger if exists audit_inspector_certificates on inspector_certificates;
--   drop table if exists inspector_certificates;
-- =========================================================================

create table inspector_certificates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  certificate_type text,
  certificate_number text,
  issued_by text,
  issued_date date,
  expiry_date date not null,
  equipment_types text[] not null default '{}',
  scope_note text,
  file_path text,
  note text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inspector_certificates_profile_id_idx
  on inspector_certificates (profile_id);

alter table inspector_certificates enable row level security;

create policy "inspector_certificates_select_own_or_admin" on inspector_certificates
  for select using (profile_id = auth.uid() or public.get_user_role() = 'admin');

create policy "inspector_certificates_insert_admin" on inspector_certificates
  for insert with check (public.get_user_role() = 'admin');

create policy "inspector_certificates_update_admin" on inspector_certificates
  for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "inspector_certificates_delete_admin" on inspector_certificates
  for delete using (public.get_user_role() = 'admin');

-- Mở rộng Audit Log (migration 0028) sang bảng mới -- tái dùng nguyên
-- function public.log_audit_event() đã có, mirror cách đã làm cho
-- quotes/quote_items ở migration 0032.
drop trigger if exists audit_inspector_certificates on inspector_certificates;
create trigger audit_inspector_certificates
  after insert or update or delete on inspector_certificates
  for each row execute function public.log_audit_event();
