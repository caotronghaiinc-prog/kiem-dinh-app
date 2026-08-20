-- =========================================================================
-- PROMPT-45 (mentor draft): Lịch sử hiệu chuẩn + file giấy chứng nhận cho
-- dụng cụ đo -- anh Hải yêu cầu (nguyên văn): "bổ sung thêm phần Giấy
-- chứng nhận hiệu chuẩn và up file chứng nhận lên cho từng thiết bị để
-- khi có người kiểm tra có thể show ra".
--
-- Thiết kế: bảng LỊCH SỬ (1 dòng / 1 lần hiệu chuẩn), KHÔNG chỉ 1 cột file
-- duy nhất trên inspection_tools -- lý do: mỗi lần hiệu chuẩn lại (thường
-- 1 năm/lần theo migration 0024) sẽ có giấy chứng nhận MỚI; nếu chỉ lưu 1
-- file/1 hạn trên inspection_tools thì lần cập nhật sau sẽ MẤT giấy chứng
-- nhận cũ -- trong khi khi kiểm tra/audit đôi khi vẫn cần tra lại chứng
-- nhận các lần trước. Mirror đúng kiến trúc "inspection_history giữ lịch
-- sử đầy đủ, equipment.expiry_date chỉ là cache của lần mới nhất, đồng bộ
-- qua trigger" đã dùng cho equipment (xem migration 0007/0009) -- áp y hệt
-- cho inspection_tools/inspection_tool_calibrations.
--
-- Bảng mới: inspection_tool_calibrations (tool_id, cert_no, issued_date,
-- due_date, issuer, file_path, note). Sau khi INSERT 1 dòng có due_date,
-- trigger tự đồng bộ inspection_tools.calibration_due_date +
-- calibration_cert_no + calibration_not_applicable = false -- UI hiện có
-- (danh sách /tools, filter hạn hiệu chuẩn, widget dashboard) đọc thẳng 2
-- cột này trên inspection_tools như cũ, KHÔNG cần sửa lại truy vấn ở
-- những chỗ đó.
--
-- File lưu trong CÙNG bucket Storage "inspection-files" đã tạo ở migration
-- 0009 (private, RLS insert=admin/inspector, select=authenticated đã có
-- sẵn, không phân biệt theo path/prefix trong bucket) -- KHÔNG cần tạo
-- bucket mới hay RLS storage mới. Quy ước path:
-- "tool-certs/<tool_id>/<uuid>.<ext>" (phân biệt với path thiết bị khách
-- hàng "<equipment_id>/<uuid>.ext" đã dùng cho inspection_history, tránh
-- lẫn lộn khi liệt kê object trong bucket).
--
-- ⚠️ Migration này KHÔNG idempotent -- CHỈ chạy 1 lần trên SQL Editor. Lỡ
-- chạy 2 lần thì xóa bảng rồi chạy lại:
--   drop table if exists inspection_tool_calibrations;
--   drop trigger if exists after_calibration_insert_sync_tool on inspection_tool_calibrations;
--   drop function if exists public.sync_tool_after_calibration();
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Bảng inspection_tool_calibrations
-- -------------------------------------------------------------------------
create table inspection_tool_calibrations (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references inspection_tools(id) on delete cascade,
  cert_no text, -- Số giấy chứng nhận hiệu chuẩn/kiểm định
  issued_date date, -- Ngày cấp giấy
  due_date date, -- Hạn hiệu lực của lần hiệu chuẩn này -- đồng bộ lên inspection_tools.calibration_due_date qua trigger bên dưới
  issuer text, -- Đơn vị hiệu chuẩn/cấp giấy chứng nhận
  file_path text, -- Đường dẫn file trong bucket "inspection-files" (giống inspection_history.attachment_url) -- NULL nếu chưa có file scan
  note text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index inspection_tool_calibrations_tool_id_idx on inspection_tool_calibrations (tool_id);

-- -------------------------------------------------------------------------
-- 2. Trigger đồng bộ inspection_tools sau khi thêm lần hiệu chuẩn mới --
--    mirror sync_equipment_after_inspection() (migration 0009). Chỉ xử lý
--    INSERT -- sửa/xóa lịch sử sau này không tự đồng bộ lại (giống hệt
--    quy ước đã áp cho equipment, ngoài phạm vi PROMPT-45).
-- -------------------------------------------------------------------------
create or replace function public.sync_tool_after_calibration()
returns trigger
language plpgsql
as $$
begin
  if new.due_date is not null then
    update inspection_tools
      set calibration_due_date = new.due_date,
          calibration_cert_no = coalesce(new.cert_no, calibration_cert_no),
          calibration_not_applicable = false
      where id = new.tool_id;
  end if;
  return new;
end;
$$;

drop trigger if exists after_calibration_insert_sync_tool on inspection_tool_calibrations;
create trigger after_calibration_insert_sync_tool
  after insert on inspection_tool_calibrations
  for each row execute function public.sync_tool_after_calibration();

-- -------------------------------------------------------------------------
-- 3. RLS -- mirror đúng convention inspection_tools/inspection_tool_loans
--    (migration 0024): select = mọi user đã đăng nhập; insert/update =
--    admin + inspector; delete = chỉ admin.
-- -------------------------------------------------------------------------
alter table inspection_tool_calibrations enable row level security;

create policy "inspection_tool_calibrations_select_authenticated" on inspection_tool_calibrations
  for select using (auth.role() = 'authenticated');

create policy "inspection_tool_calibrations_insert_admin_or_inspector" on inspection_tool_calibrations
  for insert with check (public.get_user_role() in ('admin', 'inspector'));

create policy "inspection_tool_calibrations_update_admin_inspector" on inspection_tool_calibrations
  for update
  using (public.get_user_role() in ('admin', 'inspector'))
  with check (public.get_user_role() in ('admin', 'inspector'));

create policy "inspection_tool_calibrations_delete_admin" on inspection_tool_calibrations
  for delete using (public.get_user_role() = 'admin');
