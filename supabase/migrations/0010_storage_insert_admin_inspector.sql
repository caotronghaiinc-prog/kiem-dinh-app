-- =========================================================================
-- PROMPT-15: Rà soát bảo mật -- phát hiện lỗ hổng phân quyền ở Phần C.
--
-- Policy INSERT trên bucket Storage "inspection-files" (tạo ở migration
-- 0009) đang chỉ check auth.role() = 'authenticated' -- nghĩa là BẤT KỲ
-- user đã đăng nhập nào (kể cả accountant/office, hoặc chính inspector
-- gắn vào KHÔNG đúng thiết bị) đều upload thẳng file vào bucket qua
-- Storage API trực tiếp, dù UI (nút "+ Thêm bản ghi kiểm định") và RLS
-- INSERT trên chính bảng inspection_history đã đúng chỉ cho phép admin +
-- inspector. Đây là lỗ hổng "lỏng hơn ý định" -- sửa để 2 quyền khớp
-- nhau: chỉ admin/inspector mới upload được.
--
-- SELECT (xem/tải file) giữ nguyên "authenticated" -- nhất quán với quy
-- ước đọc dữ liệu chung của cả app (customers/equipment/inspection_history
-- đều SELECT mở cho mọi user đã đăng nhập), không phải lỗ hổng.
-- =========================================================================

drop policy if exists "inspection_files_insert_authenticated" on storage.objects;

create policy "inspection_files_insert_admin_inspector"
  on storage.objects for insert
  with check (
    bucket_id = 'inspection-files'
    and public.get_user_role() in ('admin', 'inspector')
  );
