-- =========================================================================
-- Cho phép inspector TẠO MỚI khách hàng (không được Sửa/Xóa)
-- =========================================================================
-- Quy tắc phân quyền customers sau migration này:
--   admin      : SELECT, INSERT, UPDATE, DELETE (toàn quyền, không đổi)
--   inspector  : SELECT (không đổi), INSERT (MỚI — kể cả bản ghi tự tạo,
--                inspector KHÔNG được UPDATE/DELETE)
--
-- Trước khi chạy, có thể kiểm tra policy hiện có trên customers bằng:
--   select policyname, cmd, qual from pg_policies where tablename = 'customers';
-- Policy INSERT hiện tại đang tên là "customers_insert_admin" (tạo ở
-- migration 0002_auth_rls.sql, chỉ cho phép role = 'admin'). Migration này
-- drop đúng policy đó rồi tạo lại với điều kiện admin HOẶC inspector.
-- UPDATE ("customers_update_admin") và DELETE ("customers_delete_admin")
-- giữ nguyên, không đụng tới.

drop policy if exists "customers_insert_admin" on customers;

create policy "customers_insert_admin_or_inspector" on customers
  for insert
  with check (public.get_user_role() in ('admin', 'inspector'));
