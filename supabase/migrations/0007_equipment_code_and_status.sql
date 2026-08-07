-- =========================================================================
-- PROMPT-08: Mã thiết bị tự sinh (TB-<số KH>-<số TB trong KH>) + tự tính
-- status (valid/expiring_soon/expired) từ expiry_date mỗi khi lưu.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Sinh mã thiết bị: TB-<3 số cuối mã KH>-<3 số thứ tự thiết bị trong KH>
--
-- Số thứ tự KH: lấy trực tiếp phần số trong customers.code (vd
-- "KH-2026-005" -> "005"). Số này do customer_code_seq sinh ra -- đã là
-- một số tăng dần liên tục, duy nhất, không đổi theo thời gian (mã KH
-- không bị regenerate) -- nên dùng lại nó ổn định hơn hẳn so với tự tính
-- rank theo created_at (dễ vướng trường hợp trùng timestamp, và phải
-- query lại mỗi lần thay vì đọc thẳng 1 cột đã có sẵn).
--
-- Số thứ tự thiết bị trong KH: đếm số dòng equipment hiện có của
-- customer_id đó + 1. Với quy mô ~10 người dùng nội bộ, count(*) trong
-- trigger là đủ an toàn: race condition (2 người cùng thêm thiết bị cho
-- cùng 1 KH cùng lúc) chỉ có thể xảy ra trong cửa sổ rất hẹp, và nếu có
-- trùng, cột equipment.code (unique not null) sẽ chặn insert thứ 2 thay
-- vì âm thầm ghi đè -- ứng dụng chỉ cần báo lỗi tiếng Việt và mời thử lưu
-- lại, không cần advisory lock/retry phức tạp.
-- -------------------------------------------------------------------------
create or replace function public.generate_equipment_code(p_customer_id uuid)
returns text
language plpgsql
as $$
declare
  customer_seq text;
  equipment_seq int;
begin
  select (regexp_match(code, '^KH-\d{4}-(\d+)$'))[1]
    into customer_seq
    from customers
    where id = p_customer_id;

  if customer_seq is null then
    raise exception 'Không thể sinh mã thiết bị: khách hàng % không có mã hợp lệ', p_customer_id;
  end if;

  select count(*) + 1 into equipment_seq
    from equipment
    where customer_id = p_customer_id;

  return 'TB-' || lpad(customer_seq, 3, '0') || '-' || lpad(equipment_seq::text, 3, '0');
end;
$$;

create or replace function public.set_equipment_code()
returns trigger
language plpgsql
as $$
begin
  if new.code is null or new.code = '' then
    new.code := public.generate_equipment_code(new.customer_id);
  end if;
  return new;
end;
$$;

drop trigger if exists before_equipment_insert_set_code on equipment;
create trigger before_equipment_insert_set_code
  before insert on equipment
  for each row execute function public.set_equipment_code();

-- -------------------------------------------------------------------------
-- 2. Tự tính status từ expiry_date mỗi khi INSERT/UPDATE -- không cho phép
--    client tự set 'valid'/'expiring_soon'/'expired' trực tiếp (tránh lệch
--    giữa status lưu DB và màu hiển thị UI, vốn cũng tính từ expiry_date
--    qua getExpiryStatus() ở phía TypeScript).
--
--    'inactive' là giá trị DUY NHẤT được tôn trọng nguyên trạng khi client
--    gửi lên (form gửi 'inactive' khi tick "Ngừng sử dụng", ngược lại luôn
--    gửi 'valid' làm giá trị tạm -- trigger này sẽ ghi đè lại đúng theo
--    ngày). Ngưỡng ngày dùng chung tinh thần với getExpiryStatus()
--    (src/lib/utils/expiry-status.ts): <0 ngày = expired, 0-60 ngày =
--    expiring_soon (gộp cả 2 mốc đỏ/vàng phía UI vì status DB chỉ có 4 giá
--    trị, không đủ chỗ tách rõ như màu), còn lại/không có hạn = valid.
-- -------------------------------------------------------------------------
create or replace function public.compute_equipment_status()
returns trigger
language plpgsql
as $$
declare
  days_left int;
begin
  if new.status = 'inactive' then
    return new;
  end if;

  if new.expiry_date is null then
    new.status := 'valid';
    return new;
  end if;

  days_left := new.expiry_date - current_date;

  if days_left < 0 then
    new.status := 'expired';
  elsif days_left <= 60 then
    new.status := 'expiring_soon';
  else
    new.status := 'valid';
  end if;

  return new;
end;
$$;

drop trigger if exists before_equipment_upsert_compute_status on equipment;
create trigger before_equipment_upsert_compute_status
  before insert or update on equipment
  for each row execute function public.compute_equipment_status();
