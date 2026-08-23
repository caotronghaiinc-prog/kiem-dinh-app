-- =========================================================================
-- PROMPT-65: Bổ sung thông tin nhân viên (ngày sinh/CCCD/chức vụ/ngày vào
-- làm/địa chỉ) + Hợp đồng lao động -- Hải gửi bảng nhân sự thật, cần lưu
-- thêm các trường này trên profiles + theo dõi LỊCH SỬ nhiều hợp đồng lao
-- động theo thời gian (thử việc -> ký lại -> gia hạn...), khác hẳn bảng
-- contracts hiện có (đó là hợp đồng KIỂM ĐỊNH với khách hàng).
--
-- "Chức vụ" (job_title, tên hiển thị tự do vd "Giám đốc") KHÁC "Vai trò" hệ
-- thống (role, quyết định quyền truy cập: admin/inspector/accountant/
-- office) -- 1 người có thể có job_title="Giám đốc" nhưng role vẫn khác
-- 'admin' (đúng thực tế Thái Tân, chốt từ PROMPT-17).
--
-- KHÔNG lưu mức lương (Hải xác nhận) -- chỉ lưu file scan + ngày tháng/loại
-- hợp đồng, ai cần xem lương thì mở file. KHÔNG có khái niệm "hợp đồng đang
-- hiệu lực" trong DB (không có cột is_current/tương tự) -- cảnh báo sắp hết
-- hạn ở tầng ứng dụng chỉ dùng quy ước tối giản "hợp đồng có start_date mới
-- nhất", không lưu cờ ở đây.
--
-- File scan dùng CHUNG bucket Storage "inspection-files" đã có (migration
-- 0009), path prefix mới "labor-contracts/<profile_id>/..." (mirror
-- "employee-certs/<profile_id>/..." ở migration 0035) -- KHÔNG cần policy
-- storage mới.
--
-- employee_labor_contracts mirror gần như y hệt inspector_certificates
-- (migration 0035): RLS SELECT chính chủ-hoặc-admin, INSERT/UPDATE/DELETE
-- chỉ admin, audit log qua log_audit_event() có sẵn.
--
-- profiles lần đầu được sửa qua UI (trước giờ /employees/[id] chỉ xem, xem
-- PROMPT-63) -- gắn audit trigger cho profiles luôn trong migration này vì
-- có cả CCCD (dữ liệu định danh cá nhân), cần truy vết được ai đổi gì.
--
-- ⚠️ Migration này KHÔNG idempotent -- CHỈ chạy 1 lần. Lỡ chạy 2 lần thì:
--   drop trigger if exists audit_profiles on profiles;
--   drop trigger if exists audit_employee_labor_contracts on employee_labor_contracts;
--   drop table if exists employee_labor_contracts;
--   alter table profiles
--     drop column if exists date_of_birth,
--     drop column if exists cccd_number,
--     drop column if exists job_title,
--     drop column if exists start_date,
--     drop column if exists permanent_address;
-- =========================================================================

-- 1. Thông tin nhân viên bổ sung
alter table profiles
  add column date_of_birth date,
  add column cccd_number text,
  add column job_title text,
  add column start_date date,
  add column permanent_address text;

-- 2. Bảng Hợp đồng lao động (N bản ghi/nhân viên, giữ lịch sử)
create table employee_labor_contracts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  contract_type text not null check (
    contract_type in ('thu_viec', 'xac_dinh_thoi_han', 'khong_xac_dinh_thoi_han')
  ),
  contract_no text,
  signed_date date not null,
  start_date date not null,
  end_date date, -- null nếu contract_type = 'khong_xac_dinh_thoi_han'
  file_path text,
  note text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index employee_labor_contracts_profile_id_idx
  on employee_labor_contracts (profile_id);

alter table employee_labor_contracts enable row level security;

create policy "employee_labor_contracts_select_own_or_admin"
  on employee_labor_contracts for select
  using (profile_id = auth.uid() or public.get_user_role() = 'admin');

create policy "employee_labor_contracts_insert_admin"
  on employee_labor_contracts for insert
  with check (public.get_user_role() = 'admin');

create policy "employee_labor_contracts_update_admin"
  on employee_labor_contracts for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "employee_labor_contracts_delete_admin"
  on employee_labor_contracts for delete
  using (public.get_user_role() = 'admin');

drop trigger if exists audit_employee_labor_contracts on employee_labor_contracts;
create trigger audit_employee_labor_contracts
  after insert or update or delete on employee_labor_contracts
  for each row execute function public.log_audit_event();

-- 3. Gắn audit log cho profiles lần đầu (trước giờ chưa sửa qua UI nên
--    chưa cần) -- dùng chung function log_audit_event() có sẵn.
drop trigger if exists audit_profiles on profiles;
create trigger audit_profiles
  after update on profiles
  for each row execute function public.log_audit_event();
