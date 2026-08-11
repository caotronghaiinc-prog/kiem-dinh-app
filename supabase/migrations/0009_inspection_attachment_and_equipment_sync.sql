-- =========================================================================
-- PROMPT-09: Trang chi tiết thiết bị — lịch sử kiểm định
--
-- 1. Cột attachment_url trên inspection_history: lưu ĐƯỜNG DẪN (storage
--    object path, vd "equipment-uuid/random-uuid.pdf") trong bucket
--    Storage "inspection-files" — KHÔNG lưu URL public cố định, vì bucket
--    này private (public = false). Xem file qua signed URL tạo tại thời
--    điểm client bấm "Xem file" (xem AttachmentLink trong code phía FE),
--    hết hạn sau một khoảng ngắn thay vì để lộ link truy cập vĩnh viễn.
--
-- 2. Trigger: sau khi THÊM MỚI 1 bản ghi inspection_history có
--    new_expiry_date, tự đồng bộ equipment.expiry_date +
--    equipment.last_inspection_date. Trigger compute_equipment_status()
--    (migration 0007) đã gắn BEFORE UPDATE trên equipment nên sẽ tự chạy
--    tiếp theo UPDATE này -> badge trạng thái (đỏ/vàng/xanh) luôn khớp
--    ngay, không cần tính lại ở phía client. Chỉ xử lý INSERT — sửa/xóa
--    lịch sử sau này không tự đồng bộ lại (ngoài phạm vi PROMPT-09).
--
-- 3. Storage bucket "inspection-files" (private) + RLS cho phép user đã
--    đăng nhập upload (insert) và đọc (select) — tạo bằng SQL (insert vào
--    storage.buckets) để chạy chung 1 lần với migration này trên SQL
--    Editor, không cần thao tác thêm trên Supabase Dashboard UI.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Cột attachment_url
-- -------------------------------------------------------------------------
alter table inspection_history
  add column attachment_url text;

-- -------------------------------------------------------------------------
-- 2. Trigger đồng bộ equipment sau khi thêm lịch sử kiểm định
-- -------------------------------------------------------------------------
create or replace function public.sync_equipment_after_inspection()
returns trigger
language plpgsql
as $$
begin
  if new.new_expiry_date is not null then
    update equipment
      set expiry_date = new.new_expiry_date,
          last_inspection_date = new.inspection_date
      where id = new.equipment_id;
  end if;
  return new;
end;
$$;

drop trigger if exists after_inspection_history_insert_sync_equipment on inspection_history;
create trigger after_inspection_history_insert_sync_equipment
  after insert on inspection_history
  for each row execute function public.sync_equipment_after_inspection();

-- -------------------------------------------------------------------------
-- 3. Storage bucket "inspection-files" + RLS
--    on conflict do nothing: an toàn nếu migration này lỡ chạy lại lần 2.
-- -------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('inspection-files', 'inspection-files', false)
on conflict (id) do nothing;

create policy "inspection_files_insert_authenticated"
  on storage.objects for insert
  with check (bucket_id = 'inspection-files' and auth.role() = 'authenticated');

create policy "inspection_files_select_authenticated"
  on storage.objects for select
  using (bucket_id = 'inspection-files' and auth.role() = 'authenticated');
