-- =========================================================================
-- PROMPT-06: Mở rộng quyền SELECT trên profiles cho mọi user đã đăng nhập
-- =========================================================================
-- Lý do: tab "Lịch sử kiểm định" ở trang chi tiết khách hàng cần hiển thị
-- tên người kiểm định (profiles.full_name) qua join inspection_history ->
-- profiles. Với policy cũ "profiles_select_own_or_admin" (chỉ xem được
-- profile của chính mình hoặc admin xem tất cả), một inspector xem lịch sử
-- do inspector KHÁC thực hiện sẽ không đọc được full_name của người đó
-- (RLS áp dụng cả khi bảng được join lồng qua PostgREST) -> tên bị trống.
--
-- Đây là app nội bộ ~10 người dùng, các bảng customers/equipment/
-- inspection_history đã cho phép SELECT với mọi user đã đăng nhập từ
-- migration 0002 -- đưa profiles về cùng quy tắc cho nhất quán. UPDATE vẫn
-- giữ nguyên (chỉ tự sửa row của mình hoặc admin sửa tất cả, và trigger
-- prevent_self_role_change vẫn chặn tự đổi role/active).
drop policy if exists "profiles_select_own_or_admin" on profiles;

create policy "profiles_select_authenticated" on profiles
  for select using (auth.role() = 'authenticated');
