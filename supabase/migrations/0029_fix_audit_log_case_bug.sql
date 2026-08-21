-- =========================================================================
-- PROMPT-54 fix (mentor draft): Sửa lỗi log_audit_event() luôn ghi
-- old_data/new_data = NULL.
--
-- Nguyên nhân: TG_OP (biến đặc biệt Postgres trong trigger function) luôn
-- trả về giá trị VIẾT HOA ('INSERT'/'UPDATE'/'DELETE'), nhưng migration 0028
-- lại so sánh với chuỗi viết THƯỜNG ở 2 điều kiện CASE quyết định
-- old_data/new_data ('update'/'delete'/'insert') -- so sánh chuỗi có phân
-- biệt hoa/thường nên không bao giờ khớp, luôn rơi vào nhánh else null. Cột
-- `action` không bị ảnh hưởng vì chỗ đó có gọi lower(TG_OP) riêng -- đúng
-- như triệu chứng đã quan sát (changed_by/action đúng, old_data/new_data
-- luôn null).
--
-- Xác nhận qua đối chiếu prosrc thật lấy từ Supabase (anh Hải chạy
-- `select prosrc from pg_proc where proname = 'log_audit_event';` trên SQL
-- Editor) -- khớp 100% với migration 0028, không phải lỗi deploy/dán thiếu.
--
-- Cách sửa: CREATE OR REPLACE lại đúng function (giữ nguyên OID, các
-- trigger đã gắn ở migration 0028 tự dùng ngay bản mới, KHÔNG cần
-- drop/create lại trigger). Dùng chữ HOA khớp đúng giá trị thật của TG_OP
-- thay vì gọi thêm lower() cho gọn.
--
-- ⚠️ Sau khi chạy migration này, dữ liệu audit_log đã ghi TRƯỚC ĐÓ (lúc còn
-- lỗi, old_data/new_data null) vẫn giữ nguyên null -- không tự vá lại được
-- (không có cách khôi phục old_data/new_data đã mất). Vì bảng audit_log mới
-- tạo, dữ liệu cũ toàn bộ là từ lúc Claude Code Desktop test PROMPT-54 (dữ
-- liệu test, không phải dữ liệu nghiệp vụ thật) -- có thể xóa sạch cho gọn:
--   delete from audit_log;
-- (Tùy chọn, không bắt buộc -- để lại cũng không hại gì, chỉ vài dòng test
-- với old_data/new_data null lẫn trong danh sách.)
-- =========================================================================

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
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
