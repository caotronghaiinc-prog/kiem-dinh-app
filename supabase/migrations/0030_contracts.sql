-- =========================================================================
-- PROMPT-56 (mentor draft): M2 - Hợp đồng & Tài chính (bản v1). Anh Hải
-- quyết định đưa M2 từ Phase 3 lên làm ngay, vì phần mềm cần có tính năng
-- hợp đồng mới đủ dùng thực tế trước khi mời đồng nghiệp dùng thử.
--
-- Phạm vi đã chốt với anh Hải:
--   - KHÔNG theo dõi "báo giá" riêng trong DB -- báo giá vẫn dùng skill
--     Cowork (baogia-incosaf) tạo file Word như hiện tại, app chỉ quản lý
--     từ lúc đã thành hợp đồng.
--   - 1 hợp đồng gắn được NHIỀU thiết bị đã có trong /equipment (bảng nối
--     contract_equipment).
--   - Theo dõi NHIỀU đợt thanh toán riêng lẻ cho 1 hợp đồng (không chỉ 1
--     trạng thái chung) -- bảng contract_payments, tổng đã thu cache lại
--     trên contracts.paid_total qua trigger (mirror đúng pattern
--     sync_equipment_after_inspection/sync_tool_after_calibration đã dùng).
--   - Phân quyền: Admin + Inspector đều thêm/sửa được (giống quy ước đang
--     dùng cho equipment/customers/inspection_history), chỉ Admin xóa được.
--
-- Mã hợp đồng: 2 trường tách biệt, không gộp chung 1 cột --
--   - `code`: mã nội bộ tự sinh HD-<năm>-<số thứ tự> (mirror ĐÚNG
--     generate_customer_code()/set_customer_code() ở migration 0003), dùng
--     để hiển thị/tìm kiếm nhất quán với KH-xxx/TB-xxx/DC-xxx.
--   - `contract_no`: SỐ HỢP ĐỒNG THẬT in trên văn bản giấy (định dạng công
--     ty tự đặt, vd "15/2026/HĐKT-INCOSAF"), do người dùng tự nhập tay khi
--     tạo hợp đồng trong app (không tự sinh) -- vì đây phải khớp CHÍNH XÁC
--     với văn bản giấy đã ký, không thể để app tự đoán/sinh số.
--
-- File hợp đồng đã ký (PDF/scan): dùng lại bucket Storage "inspection-files"
-- đã có sẵn (migration 0009), quy ước path mới
-- "contract-files/<contract_id>/<uuid>.<ext>" (phân biệt với
-- "<equipment_id>/<uuid>.ext" của inspection_history và
-- "tool-certs/<tool_id>/<uuid>.ext" của inspection_tool_calibrations).
--
-- Audit Log (migration 0028/0029): MỞ RỘNG gắn thêm trigger
-- log_audit_event() (đã có sẵn function, không cần viết lại) vào contracts
-- + contract_payments -- dữ liệu tài chính, ít nhất cũng cần audit như
-- equipment/customers/inspection_history, chi phí thêm gần như bằng 0 (chỉ
-- 2 câu CREATE TRIGGER, tái dùng function tổng quát đã có).
--
-- ⚠️ Migration này KHÔNG idempotent -- CHỈ chạy 1 lần. Lỡ chạy 2 lần thì:
--   drop trigger if exists audit_contracts on contracts;
--   drop trigger if exists audit_contract_payments on contract_payments;
--   drop trigger if exists after_contract_payment_change_sync_total on contract_payments;
--   drop function if exists public.sync_contract_paid_total();
--   drop trigger if exists before_contracts_insert_set_code on contracts;
--   drop function if exists public.set_contract_code();
--   drop function if exists public.generate_contract_code();
--   drop sequence if exists contract_code_seq;
--   drop table if exists contract_payments;
--   drop table if exists contract_equipment;
--   drop table if exists contracts;
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Bảng contracts
-- -------------------------------------------------------------------------
create table contracts (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  contract_no text not null,
  customer_id uuid references customers(id) on delete cascade,
  title text,
  signed_date date,
  total_value numeric(14, 0) not null default 0,
  paid_total numeric(14, 0) not null default 0, -- cache, trigger mục 4 tự cập nhật -- KHÔNG tự sửa tay cột này
  status text not null default 'dang_thuc_hien'
    check (status in ('dang_thuc_hien', 'hoan_thanh', 'da_thanh_ly', 'huy')),
  contract_file_path text,
  note text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contracts_customer_id_idx on contracts (customer_id);

-- -------------------------------------------------------------------------
-- 2. Mã hợp đồng tự sinh HD-<năm>-<NNN> -- mirror y hệt customer_code_seq
--    (migration 0003).
-- -------------------------------------------------------------------------
create sequence if not exists contract_code_seq;

create or replace function public.generate_contract_code()
returns text
language sql
as $$
  select 'HD-' || extract(year from now())::text || '-'
    || lpad(nextval('contract_code_seq')::text, 3, '0');
$$;

create or replace function public.set_contract_code()
returns trigger
language plpgsql
as $$
begin
  if new.code is null or new.code = '' then
    new.code := public.generate_contract_code();
  end if;
  return new;
end;
$$;

drop trigger if exists before_contracts_insert_set_code on contracts;
create trigger before_contracts_insert_set_code
  before insert on contracts
  for each row execute function public.set_contract_code();

-- -------------------------------------------------------------------------
-- 3. Bảng nối contract_equipment -- 1 hợp đồng gắn nhiều thiết bị đã có
--    trong /equipment. unique (contract_id, equipment_id) tránh gắn trùng
--    1 thiết bị 2 lần vào cùng 1 hợp đồng.
-- -------------------------------------------------------------------------
create table contract_equipment (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  equipment_id uuid not null references equipment(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (contract_id, equipment_id)
);

create index contract_equipment_contract_id_idx on contract_equipment (contract_id);
create index contract_equipment_equipment_id_idx on contract_equipment (equipment_id);

-- -------------------------------------------------------------------------
-- 4. Bảng contract_payments -- mỗi dòng là 1 ĐỢT ĐÃ THU THỰC TẾ (không phải
--    kế hoạch/dự kiến thu). Tổng đã thu cache lại trên contracts.paid_total
--    qua trigger AFTER INSERT/UPDATE/DELETE -- cần xử lý cả 3 thao tác
--    (khác các sync trigger trước đây chỉ xử lý AFTER INSERT) vì thanh toán
--    có thể bị sửa/xóa nhầm, tổng phải luôn khớp thực tế.
-- -------------------------------------------------------------------------
create table contract_payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  amount numeric(14, 0) not null check (amount > 0),
  paid_date date not null,
  method text,
  note text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index contract_payments_contract_id_idx on contract_payments (contract_id);

create or replace function public.sync_contract_paid_total()
returns trigger
language plpgsql
as $$
declare
  target_contract_id uuid;
begin
  target_contract_id := coalesce(new.contract_id, old.contract_id);

  update contracts
    set paid_total = coalesce(
      (select sum(amount) from contract_payments where contract_id = target_contract_id),
      0
    )
    where id = target_contract_id;

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists after_contract_payment_change_sync_total on contract_payments;
create trigger after_contract_payment_change_sync_total
  after insert or update or delete on contract_payments
  for each row execute function public.sync_contract_paid_total();

-- -------------------------------------------------------------------------
-- 5. RLS -- mirror ĐÚNG quy ước equipment/customers/inspection_history: chọn
--    xem mọi user đã đăng nhập, thêm/sửa admin+inspector, xóa chỉ admin.
-- -------------------------------------------------------------------------
alter table contracts enable row level security;

create policy "contracts_select_authenticated" on contracts
  for select using (auth.role() = 'authenticated');

create policy "contracts_insert_admin_or_inspector" on contracts
  for insert with check (public.get_user_role() in ('admin', 'inspector'));

create policy "contracts_update_admin_or_inspector" on contracts
  for update
  using (public.get_user_role() in ('admin', 'inspector'))
  with check (public.get_user_role() in ('admin', 'inspector'));

create policy "contracts_delete_admin" on contracts
  for delete using (public.get_user_role() = 'admin');

alter table contract_equipment enable row level security;

create policy "contract_equipment_select_authenticated" on contract_equipment
  for select using (auth.role() = 'authenticated');

create policy "contract_equipment_insert_admin_or_inspector" on contract_equipment
  for insert with check (public.get_user_role() in ('admin', 'inspector'));

create policy "contract_equipment_delete_admin_or_inspector" on contract_equipment
  for delete using (public.get_user_role() in ('admin', 'inspector'));

alter table contract_payments enable row level security;

create policy "contract_payments_select_authenticated" on contract_payments
  for select using (auth.role() = 'authenticated');

create policy "contract_payments_insert_admin_or_inspector" on contract_payments
  for insert with check (public.get_user_role() in ('admin', 'inspector'));

create policy "contract_payments_update_admin_or_inspector" on contract_payments
  for update
  using (public.get_user_role() in ('admin', 'inspector'))
  with check (public.get_user_role() in ('admin', 'inspector'));

create policy "contract_payments_delete_admin" on contract_payments
  for delete using (public.get_user_role() = 'admin');

-- -------------------------------------------------------------------------
-- 6. Mở rộng Audit Log (migration 0028) sang 2 bảng tài chính mới -- tái
--    dùng nguyên function public.log_audit_event() đã có, không viết lại.
-- -------------------------------------------------------------------------
drop trigger if exists audit_contracts on contracts;
create trigger audit_contracts
  after insert or update or delete on contracts
  for each row execute function public.log_audit_event();

drop trigger if exists audit_contract_payments on contract_payments;
create trigger audit_contract_payments
  after insert or update or delete on contract_payments
  for each row execute function public.log_audit_event();
