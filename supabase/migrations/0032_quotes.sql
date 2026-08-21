-- =========================================================================
-- PROMPT-60: Module Báo giá (mới) -- trước giờ báo giá soạn qua skill
-- Cowork baogia-incosaf (ngoài app, không lưu DB). Anh Hải quyết định đảo
-- lại: app tự có module Báo giá, lưu đầy đủ trạng thái, liên kết được với
-- module Hợp đồng (PROMPT-56/57/58/59).
--
-- Phạm vi đã chốt với anh Hải:
--   - Hỗ trợ khách CHƯA có trong /customers (khách tiềm năng) -- báo giá
--     thường làm TRƯỚC khi khách chốt hợp tác. quotes.customer_id nullable,
--     5 cột customer_*_snapshot LUÔN giữ nội dung đã gửi khách (không tự
--     đồng bộ lại nếu customer gốc đổi thông tin sau này).
--   - quote_items KHÔNG bắt buộc equipment_id (khác contract_equipment) --
--     phải tự chứa đủ item_name/unit để hiển thị/xuất báo giá dù thiết bị
--     chưa từng nhập vào /equipment.
--   - KHÔNG kiểm tra đơn giá tối thiểu Thông tư 41/2016/TT-BLĐTBXH ở v1
--     (backlog, đánh giá riêng sau -- dữ liệu tham chiếu chưa chắc sạch).
--   - converted_contract_id: set 1 LẦN khi "Tạo hợp đồng từ báo giá này"
--     (PROMPT-59 đã có contract_equipment.quantity/unit_price để copy sang).
--
-- ⚠️ Migration này KHÔNG idempotent -- CHỈ chạy 1 lần. Lỡ chạy 2 lần thì:
--   drop trigger if exists audit_quotes on quotes;
--   drop trigger if exists audit_quote_items on quote_items;
--   drop trigger if exists after_quote_item_change_sync_total on quote_items;
--   drop function if exists public.sync_quote_total_value();
--   drop trigger if exists before_quotes_insert_set_code on quotes;
--   drop function if exists public.set_quote_code();
--   drop function if exists public.generate_quote_code();
--   drop sequence if exists quote_code_seq;
--   drop table if exists quote_items;
--   drop table if exists quotes;
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Bảng quotes
-- -------------------------------------------------------------------------
create table quotes (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  customer_id uuid references customers(id) on delete set null,
  customer_name_snapshot text not null,
  customer_address_snapshot text,
  customer_contact_snapshot text,
  customer_phone_snapshot text,
  customer_tax_code_snapshot text,
  title text,
  valid_until date,
  status text not null default 'nhap'
    check (status in ('nhap', 'da_gui', 'da_chap_nhan', 'tu_choi', 'het_han')),
  total_value numeric(14, 0) not null default 0, -- cache, trigger mục 3 tự cập nhật -- KHÔNG tự sửa tay cột này
  note text,
  quote_file_path text,
  converted_contract_id uuid references contracts(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quotes_customer_id_idx on quotes (customer_id);

-- -------------------------------------------------------------------------
-- 2. Mã báo giá tự sinh BG-<năm>-<NNN> -- mirror y hệt
--    generate_contract_code()/set_contract_code() (migration 0030).
-- -------------------------------------------------------------------------
create sequence if not exists quote_code_seq;

create or replace function public.generate_quote_code()
returns text
language sql
as $$
  select 'BG-' || extract(year from now())::text || '-'
    || lpad(nextval('quote_code_seq')::text, 3, '0');
$$;

create or replace function public.set_quote_code()
returns trigger
language plpgsql
as $$
begin
  if new.code is null or new.code = '' then
    new.code := public.generate_quote_code();
  end if;
  return new;
end;
$$;

drop trigger if exists before_quotes_insert_set_code on quotes;
create trigger before_quotes_insert_set_code
  before insert on quotes
  for each row execute function public.set_quote_code();

-- -------------------------------------------------------------------------
-- 3. Bảng quote_items -- KHÔNG bắt buộc equipment_id (khác contract_equipment)
--    vì báo giá xảy ra trước khi chắc chắn có hợp đồng, khách có thể chưa
--    từng nhập thiết bị vào /equipment.
-- -------------------------------------------------------------------------
create table quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  equipment_id uuid references equipment(id) on delete set null,
  item_name text not null,
  unit text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(14, 0) not null default 0 check (unit_price >= 0),
  note text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index quote_items_quote_id_idx on quote_items (quote_id);

create or replace function public.sync_quote_total_value()
returns trigger
language plpgsql
as $$
declare
  target_quote_id uuid;
begin
  target_quote_id := coalesce(new.quote_id, old.quote_id);

  update quotes
    set total_value = coalesce(
      (select sum(quantity * unit_price) from quote_items where quote_id = target_quote_id),
      0
    )
    where id = target_quote_id;

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists after_quote_item_change_sync_total on quote_items;
create trigger after_quote_item_change_sync_total
  after insert or update or delete on quote_items
  for each row execute function public.sync_quote_total_value();

-- -------------------------------------------------------------------------
-- 4. RLS -- mirror ĐÚNG quy ước contracts/contract_equipment. quote_items
--    CÓ policy UPDATE ngay từ đầu (khác thiếu sót đã gặp ở contract_equipment
--    trong migration 0030, phải vá thêm ở 0031) vì sửa số lượng/đơn giá/tên
--    hạng mục là thao tác chính của bảng này.
-- -------------------------------------------------------------------------
alter table quotes enable row level security;

create policy "quotes_select_authenticated" on quotes
  for select using (auth.role() = 'authenticated');

create policy "quotes_insert_admin_or_inspector" on quotes
  for insert with check (public.get_user_role() in ('admin', 'inspector'));

create policy "quotes_update_admin_or_inspector" on quotes
  for update
  using (public.get_user_role() in ('admin', 'inspector'))
  with check (public.get_user_role() in ('admin', 'inspector'));

create policy "quotes_delete_admin" on quotes
  for delete using (public.get_user_role() = 'admin');

alter table quote_items enable row level security;

create policy "quote_items_select_authenticated" on quote_items
  for select using (auth.role() = 'authenticated');

create policy "quote_items_insert_admin_or_inspector" on quote_items
  for insert with check (public.get_user_role() in ('admin', 'inspector'));

create policy "quote_items_update_admin_or_inspector" on quote_items
  for update
  using (public.get_user_role() in ('admin', 'inspector'))
  with check (public.get_user_role() in ('admin', 'inspector'));

create policy "quote_items_delete_admin_or_inspector" on quote_items
  for delete using (public.get_user_role() in ('admin', 'inspector'));

-- -------------------------------------------------------------------------
-- 5. Mở rộng Audit Log (migration 0028) sang quotes + quote_items -- tái
--    dùng nguyên function public.log_audit_event() đã có, không viết lại.
-- -------------------------------------------------------------------------
drop trigger if exists audit_quotes on quotes;
create trigger audit_quotes
  after insert or update or delete on quotes
  for each row execute function public.log_audit_event();

drop trigger if exists audit_quote_items on quote_items;
create trigger audit_quote_items
  after insert or update or delete on quote_items
  for each row execute function public.log_audit_event();
