-- =========================================================================
-- PROMPT-62: Đồng bộ quy ước VAT Báo giá ⇄ Hợp đồng + thêm "Địa điểm thực
-- hiện" cho báo giá (mẫu thật Mau_Bao_Gia_INCERT.pdf yêu cầu).
--
-- quote_items.unit_price (PROMPT-60) và contract_equipment.unit_price
-- (PROMPT-59) đổi ý nghĩa từ "chưa có quy ước rõ ràng"/"đã gồm VAT" sang
-- THỐNG NHẤT "CHƯA gồm VAT" -- anh Hải yêu cầu đơn giá giữ hợp đồng và báo
-- giá phải giống nhau. AN TOÀN, không cần backfill: production đang có 0
-- báo giá (PROMPT-60), và chưa có hợp đồng thật nào nhập đơn giá/số lượng
-- qua dialog "Sửa" (PROMPT-59) -- mọi contract_equipment.unit_price thật
-- vẫn là 0 mặc định.
--
-- ⚠️ HD-2026-003 (hợp đồng thật duy nhất, PROMPT-59): total_value đang lệch
-- (150.000.000đ, giá nhập tay cũ từ trước PROMPT-59) vì dòng contract_
-- equipment của nó chưa bị sửa/thêm/xóa lần nào -- migration này KHÔNG đổi
-- gì cho hợp đồng đó (không backfill, đúng quyết định cũ) -- sẽ tự đúng khi
-- ai đó nhập lại số lượng/đơn giá thật qua dialog "Sửa".
--
-- ⚠️ Migration này KHÔNG idempotent -- CHỈ chạy 1 lần. Lỡ chạy 2 lần thì:
--   alter table quotes drop column if exists site_location;
--   -- trả 2 function về thân hàm gốc (bỏ round(...*1.08), dùng lại
--   -- coalesce(...) trực tiếp như migration 0031/0032 gốc).
-- =========================================================================

alter table quotes
  add column site_location text;

create or replace function public.sync_quote_total_value()
returns trigger
language plpgsql
as $$
declare
  target_quote_id uuid;
begin
  target_quote_id := coalesce(new.quote_id, old.quote_id);

  update quotes
    set total_value = round(coalesce(
      (select sum(quantity * unit_price) from quote_items where quote_id = target_quote_id),
      0
    ) * 1.08)
    where id = target_quote_id;

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.sync_contract_total_value()
returns trigger
language plpgsql
as $$
declare
  target_contract_id uuid;
begin
  target_contract_id := coalesce(new.contract_id, old.contract_id);

  update contracts
    set total_value = round(coalesce(
      (select sum(quantity * unit_price) from contract_equipment where contract_id = target_contract_id),
      0
    ) * 1.08)
    where id = target_contract_id;

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
