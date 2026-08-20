-- =========================================================================
-- PROMPT-49 (mentor draft): Khóa biên bản sau khi xuất + luồng "xin mở khóa"
-- để sửa. Anh Hải yêu cầu (nguyên văn): "admin và kiểm định viên đều được
-- sửa, nhưng kiểm định viên khi muốn sửa phải được admin duyệt. khóa cho
-- lần đó thôi, vì lần kiểm định sau thông số sẽ khác khi nhân bản."
--
-- Thiết kế đã chọn (Cách A -- "xin mở khóa", KHÔNG phải duyệt nội dung sửa
-- cụ thể): kiểm định viên gửi lý do -> Admin duyệt (mở khóa) hoặc từ chối
-- -> sau khi mở khóa, ai cũng dùng lại đúng form sửa bình thường (PROMPT-50)
-- để chỉnh -> xuất lại biên bản Word thì tự động khóa lại (không cần hệ
-- thống lưu "đề xuất nội dung" + so sánh trước/sau riêng, đơn giản hơn
-- nhiều mà vẫn đáp ứng đúng yêu cầu).
--
-- RLS chặn inspector sửa is_locked=true ĐÃ CÓ SẴN từ migration 0002 (xem
-- policy "inspection_history_update_admin_or_unlocked_inspector") -- migration
-- này KHÔNG cần sửa lại RLS đó, chỉ cần:
--   1. Một cách để THỰC SỰ set is_locked=true sau khi xuất (hiện tại cột
--      này tồn tại từ PROMPT-03 nhưng chưa có chỗ nào trong code set nó).
--   2. Bảng lưu yêu cầu "xin mở khóa" + trigger tự mở khóa khi admin duyệt.
--
-- ⚠️ Vì sao PHẢI dùng RPC "security definer" cho việc khóa (không thể chỉ
-- gọi `supabase.from('inspection_history').update({is_locked:true})` từ
-- client như bình thường): policy UPDATE hiện tại có `with check` cho
-- inspector là `is_locked = false` áp lên DÒNG SAU KHI SỬA -- nghĩa là nếu
-- inspector tự set is_locked=true (vd sau khi họ xuất biên bản), chính
-- UPDATE đó sẽ bị RLS chặn (dòng kết quả có is_locked=true, không thỏa
-- điều kiện "is_locked=false" trong with check) dù họ đang có full quyền
-- sửa dòng đó lúc TRƯỚC khi khóa. Test tay trên SQL Editor xác nhận đúng
-- hành vi này trước khi viết migration. RPC "security definer" (chạy với
-- quyền chủ sở hữu function, bỏ qua RLS) là cách chuẩn Supabase dùng để xử
-- lý đúng trường hợp "được phép thực hiện HÀNH ĐỘNG cụ thể, dù RLS chung
-- không cho phép trạng thái kết quả" -- giống hệt cách `get_user_role()`
-- (migration 0002) đã dùng security definer để tránh đệ quy RLS.
--
-- Trigger tự mở khóa khi duyệt (mục 3 bên dưới) KHÔNG cần security definer
-- -- vì chỉ Admin mới update được bảng inspection_edit_requests (RLS mục 2),
-- mà Admin vốn đã được sửa inspection_history không điều kiện (nhánh admin
-- trong policy 0002 không có is_locked check) -- giống house style của
-- sync_equipment_after_inspection()/sync_tool_after_calibration() (cũng
-- không security definer vì role đang thao tác vốn đã đủ quyền).
--
-- ⚠️ Migration này KHÔNG idempotent -- CHỈ chạy 1 lần. Lỡ chạy 2 lần thì:
--   drop function if exists public.lock_inspection_history(uuid);
--   drop trigger if exists after_edit_request_approved_unlock on inspection_edit_requests;
--   drop function if exists public.unlock_inspection_after_approval();
--   drop table if exists inspection_edit_requests;
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. RPC khóa bản ghi kiểm định -- gọi sau khi xuất Word thành công
--    (PROMPT-50 sẽ gọi `supabase.rpc('lock_inspection_history', ...)` trong
--    export-report-dialog.tsx, thay vì update thẳng). Cho phép cả admin lẫn
--    inspector gọi (cả 2 đều xuất biên bản được) -- chặn role khác bằng
--    exception rõ ràng thay vì âm thầm không làm gì.
-- -------------------------------------------------------------------------
create or replace function public.lock_inspection_history(p_inspection_history_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.get_user_role() not in ('admin', 'inspector') then
    raise exception 'Không có quyền khóa bản ghi kiểm định.';
  end if;

  update inspection_history
    set is_locked = true
    where id = p_inspection_history_id;
end;
$$;

-- Cho phép mọi user đã đăng nhập GỌI hàm này (bản thân hàm tự kiểm tra role
-- ở trên) -- mặc định Postgres cấp EXECUTE cho PUBLIC khi tạo function,
-- nhưng ghi rõ tường minh cho dễ đọc lại sau này.
grant execute on function public.lock_inspection_history(uuid) to authenticated;

-- -------------------------------------------------------------------------
-- 2. Bảng inspection_edit_requests -- lưu yêu cầu "xin mở khóa" của
--    inspector, Admin duyệt/từ chối.
-- -------------------------------------------------------------------------
create table inspection_edit_requests (
  id uuid primary key default gen_random_uuid(),
  inspection_history_id uuid not null references inspection_history(id) on delete cascade,
  requested_by uuid references profiles(id) on delete set null,
  reason text not null, -- lý do cần sửa, bắt buộc nhập
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text, -- lý do từ chối (nếu có), hoặc ghi chú khi duyệt
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index inspection_edit_requests_inspection_history_id_idx
  on inspection_edit_requests (inspection_history_id);

-- Chỉ cho phép 1 yêu cầu đang "pending" tại 1 thời điểm cho mỗi bản ghi kiểm
-- định -- tránh inspector gửi trùng nhiều yêu cầu cho cùng 1 dòng trong lúc
-- chờ duyệt. Mirror đúng kiểu "one active X" đã dùng cho
-- inspection_tool_loans (migration 0024).
create unique index inspection_edit_requests_one_pending_idx
  on inspection_edit_requests (inspection_history_id)
  where status = 'pending';

-- -------------------------------------------------------------------------
-- 3. Trigger: khi Admin duyệt (status -> 'approved'), tự mở khóa bản ghi
--    kiểm định liên quan (is_locked = false) để dùng lại form sửa bình
--    thường (PROMPT-50). Không xử lý 'rejected' -- giữ nguyên is_locked=true.
-- -------------------------------------------------------------------------
create or replace function public.unlock_inspection_after_approval()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update inspection_history
      set is_locked = false
      where id = new.inspection_history_id;
  end if;
  return new;
end;
$$;

drop trigger if exists after_edit_request_approved_unlock on inspection_edit_requests;
create trigger after_edit_request_approved_unlock
  after update on inspection_edit_requests
  for each row execute function public.unlock_inspection_after_approval();

-- -------------------------------------------------------------------------
-- 4. RLS -- select: mọi user đã đăng nhập (Admin cần thấy để duyệt, KĐV cần
--    thấy để biết trạng thái yêu cầu của chính mình -- công ty ~10 người,
--    không cần lọc theo requested_by = auth.uid() cho SELECT, giống mọi
--    bảng khác trong app này). insert: admin/inspector, bắt buộc tự gán
--    mình là người gửi + trạng thái ban đầu phải là 'pending' (không được
--    tự tạo yêu cầu với status='approved' để lách duyệt). update: CHỈ admin
--    (duyệt/từ chối). delete: chỉ admin (dọn dẹp nếu cần).
-- -------------------------------------------------------------------------
alter table inspection_edit_requests enable row level security;

create policy "inspection_edit_requests_select_authenticated" on inspection_edit_requests
  for select using (auth.role() = 'authenticated');

create policy "inspection_edit_requests_insert_admin_or_inspector" on inspection_edit_requests
  for insert
  with check (
    public.get_user_role() in ('admin', 'inspector')
    and requested_by = auth.uid()
    and status = 'pending'
  );

create policy "inspection_edit_requests_update_admin" on inspection_edit_requests
  for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "inspection_edit_requests_delete_admin" on inspection_edit_requests
  for delete using (public.get_user_role() = 'admin');
