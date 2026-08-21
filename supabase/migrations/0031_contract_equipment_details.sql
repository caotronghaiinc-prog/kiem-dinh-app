-- =========================================================================
-- PROMPT-59: Số lượng/đơn giá/số tem/ngày kiểm định từng thiết bị trong hợp
-- đồng + đổi contracts.total_value từ "nhập tay lúc tạo hợp đồng" sang cache
-- tự tính = SUM(quantity * unit_price) theo contract_id.
--
-- Phạm vi đã chốt với anh Hải:
--   - "Thành tiền" của 1 dòng contract_equipment (quantity * unit_price)
--     KHÔNG lưu cột riêng -- tính khi hiển thị/xuất, tránh dữ liệu trùng lặp
--     phải đồng bộ.
--   - ngay_kiem_dinh nhập tay riêng cho hợp đồng, KHÔNG liên kết
--     inspection_history (hợp đồng có thể ký trước, kiểm định thực tế sau).
--   - Trigger sync_contract_total_value() mirror ĐÚNG cấu trúc
--     sync_contract_paid_total() (migration 0030): xử lý cả 3 thao tác
--     INSERT/UPDATE/DELETE vì dữ liệu có thể bị sửa/xóa nhầm.
--   - contract_equipment thiếu policy UPDATE từ migration 0030 (chỉ có
--     select/insert/delete) -- bổ sung ở đây, mirror đúng điều kiện policy
--     insert cùng bảng (admin + inspector).
--   - KHÔNG backfill total_value cho hợp đồng cũ (đang giai đoạn dùng thử dữ
--     liệu giả) -- total_value các hợp đồng cũ sẽ lệch cho tới khi ai đó
--     nhập lại số lượng/đơn giá đầy đủ.
--
-- ⚠️ Migration này KHÔNG idempotent -- CHỈ chạy 1 lần. Lỡ chạy 2 lần thì:
--   drop trigger if exists after_contract_equipment_change_sync_total on contract_equipment;
--   drop function if exists public.sync_contract_total_value();
--   drop policy if exists "contract_equipment_update_admin_or_inspector" on contract_equipment;
--   alter table contract_equipment
--     drop column if exists unit_price,
--     drop column if exists quantity,
--     drop column if exists so_tem,
--     drop column if exists ngay_kiem_dinh;
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. contract_equipment -- 4 cột mới: số lượng, đơn giá, số tem, ngày kiểm
--    định (nhập tay riêng cho hợp đồng, không liên kết inspection_history).
-- -------------------------------------------------------------------------
alter table contract_equipment
  add column unit_price numeric(14, 0) not null default 0 check (unit_price >= 0),
  add column quantity integer not null default 1 check (quantity > 0),
  add column so_tem text,
  add column ngay_kiem_dinh date;

-- -------------------------------------------------------------------------
-- 2. contracts.total_value đổi ý nghĩa: từ nhập tay lúc tạo hợp đồng sang
--    cache tự tính = SUM(quantity * unit_price) theo contract_id -- mirror
--    ĐÚNG pattern sync_contract_paid_total() ở migration 0030.
-- -------------------------------------------------------------------------
create or replace function public.sync_contract_total_value()
returns trigger
language plpgsql
as $$
declare
  target_contract_id uuid;
begin
  target_contract_id := coalesce(new.contract_id, old.contract_id);

  update contracts
    set total_value = coalesce(
      (select sum(quantity * unit_price) from contract_equipment where contract_id = target_contract_id),
      0
    )
    where id = target_contract_id;

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists after_contract_equipment_change_sync_total on contract_equipment;
create trigger after_contract_equipment_change_sync_total
  after insert or update or delete on contract_equipment
  for each row execute function public.sync_contract_total_value();

-- -------------------------------------------------------------------------
-- 3. RLS -- bổ sung policy UPDATE còn thiếu từ migration 0030 (bảng này khi
--    đó chỉ có select/insert/delete), mirror đúng điều kiện policy insert
--    cùng bảng (admin + inspector) -- cần để dialog "Sửa" số lượng/đơn giá/
--    số tem/ngày kiểm định hoạt động được.
-- -------------------------------------------------------------------------
create policy "contract_equipment_update_admin_or_inspector" on contract_equipment
  for update
  using (public.get_user_role() in ('admin', 'inspector'))
  with check (public.get_user_role() in ('admin', 'inspector'));
