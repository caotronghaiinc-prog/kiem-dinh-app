-- =========================================================================
-- Cho phép inspector TẠO MỚI thiết bị (UPDATE đã cho phép từ trước, DELETE
-- vẫn chỉ admin) -- phát hiện từ PROMPT-07, sửa ở đây để form PROMPT-08
-- hoạt động đúng cho cả 2 role.
-- =========================================================================
-- Quy tắc phân quyền equipment sau migration này:
--   admin      : SELECT, INSERT, UPDATE, DELETE (toàn quyền, không đổi)
--   inspector  : SELECT, INSERT (MỚI), UPDATE (không đổi) -- vẫn KHÔNG có DELETE
--
-- Policy INSERT hiện tại tên "equipment_insert_admin" (tạo ở migration
-- 0002_auth_rls.sql, chỉ cho role = 'admin'). Migration này drop đúng
-- policy đó rồi tạo lại với điều kiện admin HOẶC inspector.
-- UPDATE ("equipment_update_admin_inspector") và DELETE
-- ("equipment_delete_admin") giữ nguyên, không đụng tới.

drop policy if exists "equipment_insert_admin" on equipment;

create policy "equipment_insert_admin_or_inspector" on equipment
  for insert
  with check (public.get_user_role() in ('admin', 'inspector'));
