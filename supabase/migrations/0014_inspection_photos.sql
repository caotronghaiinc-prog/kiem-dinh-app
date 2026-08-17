-- =========================================================================
-- PROMPT-19b: Ảnh kiểm định bắt buộc (mục 8.5 quy trình kiểm định)
--
-- Bảng inspection_photos -- ảnh chụp khi kiểm định hiện trường, tách khỏi
-- attachment_url (1 file PDF/ảnh biên bản duy nhất, đã có từ PROMPT-09) vì
-- đây là NHIỀU ảnh, phân theo 2 nhóm: "tong_the" (ảnh tổng thể thiết bị,
-- bắt buộc) và "chi_tiet_khong_dat" (ảnh chi tiết hạng mục không đạt, chỉ
-- bắt buộc khi kết quả tổng = Không đạt). Lưu trong CÙNG bucket Storage
-- "inspection-files" đã có (ATTACHMENT_BUCKET), không tạo bucket mới --
-- RLS Storage hiện tại (migration 0009 + 0010, chỉ admin/inspector mới
-- insert/select được) đã đủ, không cần policy Storage mới.
-- =========================================================================

create table inspection_photos (
  id uuid primary key default gen_random_uuid(),
  inspection_history_id uuid not null references inspection_history(id) on delete cascade,
  category text not null check (category in ('tong_the', 'chi_tiet_khong_dat')),
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index inspection_photos_inspection_history_id_idx
  on inspection_photos(inspection_history_id);

alter table inspection_photos enable row level security;

-- Giống hệt policy inspection_checklist_results (migration 0012): SELECT
-- mọi người đã đăng nhập, INSERT/UPDATE admin+inspector có check is_locked
-- qua join inspection_history, DELETE chỉ admin.
create policy "inspection_photos_select_authenticated" on inspection_photos
  for select using (auth.role() = 'authenticated');

create policy "inspection_photos_insert_admin_inspector" on inspection_photos
  for insert
  with check (
    public.get_user_role() in ('admin', 'inspector')
    and exists (
      select 1 from inspection_history ih
      where ih.id = inspection_history_id
        and (public.get_user_role() = 'admin' or ih.is_locked = false)
    )
  );

create policy "inspection_photos_update_admin_or_unlocked_inspector" on inspection_photos
  for update
  using (
    exists (
      select 1 from inspection_history ih
      where ih.id = inspection_history_id
        and (
          public.get_user_role() = 'admin'
          or (public.get_user_role() = 'inspector' and ih.is_locked = false)
        )
    )
  )
  with check (
    exists (
      select 1 from inspection_history ih
      where ih.id = inspection_history_id
        and (
          public.get_user_role() = 'admin'
          or (public.get_user_role() = 'inspector' and ih.is_locked = false)
        )
    )
  );

create policy "inspection_photos_delete_admin" on inspection_photos
  for delete using (public.get_user_role() = 'admin');
