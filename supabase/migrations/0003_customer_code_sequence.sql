-- =========================================================================
-- PROMPT-04: Mã khách hàng tự sinh (KH-YYYY-NNN, số thứ tự tăng liên tục
-- không reset theo năm)
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Sequence riêng, dùng chung cho mọi năm — tránh race condition khi
--    nhiều người tạo khách hàng cùng lúc (nextval là atomic).
-- -------------------------------------------------------------------------
create sequence if not exists customer_code_seq;

-- Nếu bảng customers đã có sẵn dữ liệu với mã dạng KH-YYYY-NNN (vd nhập tay
-- trước đó), đưa sequence tiếp tục từ số lớn nhất đang có để không sinh
-- trùng/lùi số.
do $$
declare
  max_seq bigint;
begin
  select coalesce(max((regexp_match(code, '^KH-\d{4}-(\d+)$'))[1]::bigint), 0)
    into max_seq
    from customers
    where code ~ '^KH-\d{4}-\d+$';

  if max_seq > 0 then
    perform setval('customer_code_seq', max_seq);
  end if;
end $$;

-- -------------------------------------------------------------------------
-- 2. Function sinh mã: KH-<năm hiện tại>-<số thứ tự 3 chữ số, tăng dần
--    liên tục qua các năm>. Năm chỉ để hiển thị, không ảnh hưởng số thứ tự.
-- -------------------------------------------------------------------------
create or replace function public.generate_customer_code()
returns text
language sql
as $$
  select 'KH-' || extract(year from now())::text || '-'
    || lpad(nextval('customer_code_seq')::text, 3, '0');
$$;

-- -------------------------------------------------------------------------
-- 3. Trigger: tự gán code khi INSERT nếu chưa điền code.
-- -------------------------------------------------------------------------
create or replace function public.set_customer_code()
returns trigger
language plpgsql
as $$
begin
  if new.code is null or new.code = '' then
    new.code := public.generate_customer_code();
  end if;
  return new;
end;
$$;

drop trigger if exists before_customers_insert_set_code on customers;
create trigger before_customers_insert_set_code
  before insert on customers
  for each row execute function public.set_customer_code();
