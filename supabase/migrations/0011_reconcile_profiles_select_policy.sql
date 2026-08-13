-- =========================================================================
-- PROMPT-15 (tiếp): Đồng bộ lịch sử migration với policy THẬT đang chạy
-- trên DB -- KHÔNG đổi hành vi, KHÔNG viết lại theo ý định gốc ở 0004.
--
-- Bối cảnh: đối chiếu trực tiếp `SELECT * FROM pg_policies` trên Supabase
-- SQL Editor phát hiện policy SELECT của bảng `profiles` trên DB thật
-- KHÔNG khớp với migration 0004_profiles_select_authenticated.sql đã
-- commit trong repo:
--
--   - Migration 0004 định nghĩa: policy "profiles_select_authenticated",
--     using (auth.role() = 'authenticated'), không có mệnh đề "to" (mặc
--     định roles = {public}, tự chặn qua điều kiện auth.role() trong qual).
--   - DB thật đang chạy: policy "profiles_select_all_authenticated",
--     using (true), roles = {authenticated} (giới hạn qua mệnh đề "to"
--     thay vì qua qual).
--
-- Ai đó đã sửa tay qua Supabase Dashboard tại 1 thời điểm không xác định,
-- ngoài luồng migration -- không có migration nào khác trong repo ghi lại
-- thay đổi này. Về HÀNH VI, 2 cách viết tương đương nhau -- đã verify thực
-- nghiệm: gọi thẳng bằng anon key (chưa đăng nhập) đều nhận 0 dòng ở cả 2
-- cách. Đây KHÔNG phải lỗ hổng, chỉ là lịch sử migration không phản ánh
-- đúng thực tế đang chạy.
--
-- Migration này chỉ đồng bộ lại lịch sử cho khớp DB thật. Idempotent: drop
-- theo cả tên cũ (0004) lẫn tên hiện tại rồi tạo lại đúng policy đang chạy
-- thật -- chạy trên DB đã đúng sẵn (như hiện tại) sẽ không đổi gì (no-op
-- về mặt hành vi/kết quả pg_policies), chạy lại nhiều lần cũng an toàn.
-- =========================================================================

drop policy if exists "profiles_select_authenticated" on profiles;
drop policy if exists "profiles_select_all_authenticated" on profiles;

create policy "profiles_select_all_authenticated" on profiles
  for select
  to authenticated
  using (true);
