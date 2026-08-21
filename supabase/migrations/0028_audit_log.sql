-- =========================================================================
-- PROMPT-53 (mentor draft): Audit Log -- ghi lại lịch sử "ai đổi gì, lúc nào"
-- cho các bảng nghiệp vụ cốt lõi. Backlog (PROGRESS.md, mục Ý TƯỞNG BACKLOG)
-- đánh dấu ƯU TIÊN CAO, cần làm TRƯỚC khi dọn dữ liệu giả và chuyển sang dữ
-- liệu khách hàng thật -- lý do: hệ thống kiểm định có giá trị pháp lý, cần
-- truy vết lại được lịch sử thay đổi (vd sửa hạn kiểm định, xóa thiết bị).
--
-- Phạm vi đã chốt với anh Hải: 3 bảng cốt lõi -- equipment, customers,
-- inspection_history (đúng 3 bảng backlog nêu ví dụ). Chưa mở rộng sang
-- profiles (đổi role/khóa tài khoản) hay inspection_tools/*_loans -- có thể
-- làm PROMPT riêng sau nếu cần, không đụng migration này.
--
-- Thiết kế: 1 bảng audit_log DÙNG CHUNG cho mọi bảng được theo dõi (thay vì
-- 1 bảng log riêng/bảng) -- kèm 1 trigger function TỔNG QUÁT
-- (log_audit_event(), dùng to_jsonb(OLD)/to_jsonb(NEW) + TG_OP/TG_TABLE_NAME
-- có sẵn của Postgres) gắn vào cả 3 bảng, KHÔNG viết 3 function riêng --
-- vừa gọn vừa dễ mở rộng thêm bảng sau này (chỉ cần thêm 1 câu CREATE
-- TRIGGER, không cần viết function mới).
--
-- ⚠️ Vì sao trigger function PHẢI dùng "security definer": bảng audit_log
-- KHÔNG cấp policy INSERT cho bất kỳ ai (kể cả admin) -- log phải bất biến,
-- không ai được tự ý ghi/sửa/xóa qua API bình thường, CHỈ trigger này được
-- ghi. Nếu function không security definer, nó chạy với quyền của người
-- đang thao tác (vd inspector đang sửa equipment) -- INSERT vào audit_log
-- sẽ bị RLS chặn ngay vì không có policy nào cho phép, làm hỏng luôn cả
-- giao dịch UPDATE equipment gốc. Security definer (chạy với quyền chủ sở
-- hữu function, bỏ qua RLS) là cách bắt buộc phải dùng ở đây -- giống hệt
-- get_user_role() (migration 0002) và lock_inspection_history() (migration
-- 0027).
--
-- ⚠️ Migration này KHÔNG idempotent -- CHỈ chạy 1 lần. Lỡ chạy 2 lần thì:
--   drop trigger if exists audit_equipment on equipment;
--   drop trigger if exists audit_customers on customers;
--   drop trigger if exists audit_inspection_history on inspection_history;
--   drop function if exists public.log_audit_event();
--   drop table if exists audit_log;
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Bảng audit_log
-- -------------------------------------------------------------------------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_by uuid references profiles(id) on delete set null,
  changed_at timestamptz not null default now(),
  old_data jsonb, -- null khi action='insert'
  new_data jsonb  -- null khi action='delete'
);

create index audit_log_table_record_idx on audit_log (table_name, record_id);
create index audit_log_changed_at_idx on audit_log (changed_at desc);
create index audit_log_changed_by_idx on audit_log (changed_by);

-- -------------------------------------------------------------------------
-- 2. Trigger function tổng quát -- dùng chung cho mọi bảng được gắn trigger
--    ở mục 3. changed_by = auth.uid() -- null nếu thao tác không qua phiên
--    đăng nhập user thường (vd migration/service role), ghi nhận đúng thực
--    tế thay vì giả vờ có người thao tác.
-- -------------------------------------------------------------------------
create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log (table_name, record_id, action, changed_by, old_data, new_data)
  values (
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    lower(TG_OP),
    auth.uid(),
    case when TG_OP in ('update', 'delete') then to_jsonb(old) else null end,
    case when TG_OP in ('insert', 'update') then to_jsonb(new) else null end
  );

  if TG_OP = 'delete' then
    return old;
  end if;
  return new;
end;
$$;

-- -------------------------------------------------------------------------
-- 3. Gắn trigger vào 3 bảng cốt lõi -- AFTER (không cản trở giao dịch gốc,
--    log chỉ ghi lại SAU khi thay đổi đã xảy ra thật).
-- -------------------------------------------------------------------------
drop trigger if exists audit_equipment on equipment;
create trigger audit_equipment
  after insert or update or delete on equipment
  for each row execute function public.log_audit_event();

drop trigger if exists audit_customers on customers;
create trigger audit_customers
  after insert or update or delete on customers
  for each row execute function public.log_audit_event();

drop trigger if exists audit_inspection_history on inspection_history;
create trigger audit_inspection_history
  after insert or update or delete on inspection_history
  for each row execute function public.log_audit_event();

-- -------------------------------------------------------------------------
-- 4. RLS -- CHỈ admin xem được (đây là công cụ giám sát/đối soát nội bộ).
--    KHÔNG có policy insert/update/delete cho bất kỳ role nào -- bảng chỉ
--    được ghi qua trigger security definer ở mục 2, không ai (kể cả admin)
--    sửa/xóa được log qua API bình thường.
-- -------------------------------------------------------------------------
alter table audit_log enable row level security;

create policy "audit_log_select_admin" on audit_log
  for select using (public.get_user_role() = 'admin');
