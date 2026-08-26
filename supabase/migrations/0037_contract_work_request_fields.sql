-- =========================================================================
-- PROMPT-66: cột mới cho "Giấy đề nghị thực hiện công việc" -- bản chất là
-- hợp đồng thu gọn công ty <-> kiểm định viên, nên các field này thuộc về
-- contracts (nhập 1 lần lúc tạo/sửa hợp đồng), KHÔNG nhập tay mỗi lần
-- xuất. site_location đặt tên khớp cột cùng ý nghĩa đã có trên `quotes`
-- (migration 0034), 2 bảng khác nhau nên KHÔNG dùng chung 1 cột.
-- =========================================================================

alter table contracts
  add column site_location text,                -- Địa điểm thực hiện
  add column execution_time_note text,           -- Thời gian thực hiện (text tự do)
  add column contract_type_note text,            -- Loại hình hợp đồng (KHÁC cột `status`)
  add column using_unit_name text,                -- Đơn vị/Dự án sử dụng (có thể khác Bên A)
  add column using_unit_address text,             -- Địa chỉ ĐV/DA sử dụng
  add column work_request_document_no text;       -- Số văn bản "Số: .../KĐ", tùy chọn

-- Bảng nối "kiểm định viên tham gia" 1 hợp đồng -- NHIỀU người, mirror
-- ĐÚNG pattern contract_equipment (bảng nối 1-nhiều đã có), KHÔNG dùng
-- uuid[] (Postgres không ràng buộc FK trên mảng). is_requester đánh dấu
-- đúng 1 người "đứng tên ký" (Người đề nghị) trong nhóm -- unique index
-- riêng (KHÔNG dùng "unique (contract_id)" thường vì phải cho phép NHIỀU
-- dòng is_requester=false trên 1 hợp đồng, chỉ giới hạn TỐI ĐA 1 dòng
-- is_requester=true).
create table contract_technical_responsibles (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  is_requester boolean not null default false,
  created_at timestamptz not null default now(),
  unique (contract_id, profile_id)
);

create index contract_technical_responsibles_contract_id_idx
  on contract_technical_responsibles (contract_id);

create unique index contract_technical_responsibles_one_requester_idx
  on contract_technical_responsibles (contract_id)
  where is_requester = true;

-- RLS mirror ĐÚNG contract_equipment (migration 0030 mục 5): select mọi
-- user đã đăng nhập, insert/delete admin+inspector, KHÔNG có update (form
-- "Sửa hợp đồng" ghi đè bằng xóa-hết-rồi-chèn-lại, xem contract-form.tsx)
-- -- KHÔNG xóa admin-only vì đi cùng nhịp sửa hợp đồng (admin+inspector
-- đều sửa được hợp đồng).
alter table contract_technical_responsibles enable row level security;

create policy "contract_technical_responsibles_select_authenticated"
  on contract_technical_responsibles for select using (auth.role() = 'authenticated');

create policy "contract_technical_responsibles_insert_admin_or_inspector"
  on contract_technical_responsibles for insert
  with check (public.get_user_role() in ('admin', 'inspector'));

create policy "contract_technical_responsibles_delete_admin_or_inspector"
  on contract_technical_responsibles for delete
  using (public.get_user_role() in ('admin', 'inspector'));

-- RPC hẹp, CHỈ trả id/full_name của tài khoản admin/inspector đang active --
-- KHÔNG nới lỏng RLS SELECT của bảng profiles (đang chặn đọc chéo giữa các
-- inspector từ migration 0002, đúng chủ đích vì profiles chứa CCCD/ngày
-- sinh/địa chỉ -- PROMPT-65). Mirror kỹ thuật get_user_role() (migration
-- 0002 dòng 16-19): security definer, chỉ SELECT 2 cột an toàn -- dùng để
-- vừa dựng danh sách checkbox lúc sửa hợp đồng, vừa để tra ngược tên hiển
-- thị ở trang chi tiết/lúc xuất, KHÔNG embed profiles qua PostgREST ở đâu
-- cả trong toàn bộ tính năng này (tránh bẫy PGRST201 -- profile_id VÀ
-- created_by cùng trỏ profiles -- đã gặp thật ở PROMPT-65).
create or replace function public.list_inspectors_for_assignment()
returns table (id uuid, full_name text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.full_name
  from profiles p
  where p.role in ('admin', 'inspector') and p.active = true
  order by p.full_name;
$$;

-- contracts: audit_contracts (migration 0030) tự bao gồm 6 cột text mới.
-- contract_technical_responsibles: KHÔNG gắn audit trigger -- mirror đúng
-- contract_equipment (migration 0030), bảng nối đơn giản cũng không audit.
