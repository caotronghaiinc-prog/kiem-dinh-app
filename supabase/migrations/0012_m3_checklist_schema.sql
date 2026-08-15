-- =========================================================================
-- PROMPT-18: Data model cho M3 - Checklist kiểm định
--
-- 3 bảng mới cho quy trình checklist kiểm định theo loại thiết bị (pilot:
-- Thiết bị nâng - Cầu trục, xem migration 0013 để seed dữ liệu mẫu):
--   1. equipment_checklist_templates -- 1 dòng / 1 loại thiết bị
--      (equipment_type khớp EQUIPMENT_TYPE_OPTIONS, src/lib/equipment/form-schema.ts)
--   2. equipment_checklist_items     -- các hạng mục kiểm tra trong 1 template
--   3. inspection_checklist_results  -- kết quả từng hạng mục cho 1 lần
--                                        kiểm định cụ thể (inspection_history)
--
-- Cột report_metadata (jsonb) thêm vào inspection_history để lưu các trường
-- "phần đầu/phần kết luận" đặc thù của biên bản checklist (kiểm định viên,
-- người chứng kiến, hình thức kiểm định, kiến nghị, thời hạn kiểm định lần
-- sau...) -- dùng jsonb vì quy trình còn là DỰ THẢO (chưa ban hành chính
-- thức), cấu trúc có thể đổi câu chữ mà không cần chạy lại migration.
--
-- equipment_checklist_items.has_presence_flag/value_fields và
-- inspection_checklist_results.presence_value/"values": thiết kế lại sau khi
-- đối chiếu trực tiếp ảnh chụp PDF gốc (không dùng result_type/value_label/
-- value_unit/value_text như bản đầu) vì 1 hạng mục có thể vừa cần cột
-- "Có/không có" (has_presence_flag) VỪA cần nhiều ô giá trị cùng lúc (vd
-- hạng mục 19 "Thử tĩnh" cần cả "Tải trọng sử dụng" và "Tải trọng thử") --
-- value_fields là mảng để không giới hạn số ô giá trị mỗi hạng mục.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. equipment_checklist_templates
-- -------------------------------------------------------------------------
create table equipment_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  equipment_type text not null, -- khớp giá trị EQUIPMENT_TYPE_OPTIONS
  name text not null,
  source_document text, -- vd "Dự thảo QTKĐ III.01 - Thiết bị nâng, Phụ lục 1"
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 2. equipment_checklist_items
-- -------------------------------------------------------------------------
create table equipment_checklist_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references equipment_checklist_templates(id) on delete cascade,
  section text not null, -- vd "A. Kiểm tra bên ngoài"
  item_order int not null,
  item_code text, -- số thứ tự gốc trong mẫu (vd "1", "16")
  title text not null, -- tên hạng mục, nguyên văn từ file gốc
  technical_requirement text, -- yêu cầu kỹ thuật/tiêu chuẩn tham chiếu, nguyên văn
  has_presence_flag boolean not null default false, -- có cột "Có/không có" trong Ghi chú hay không
  value_fields jsonb not null default '[]'::jsonb, -- mảng {"key","label","unit"}, rỗng nếu không cần nhập giá trị
  is_required boolean not null default true
);

create index equipment_checklist_items_template_id_idx
  on equipment_checklist_items(template_id);

-- -------------------------------------------------------------------------
-- 3. inspection_checklist_results
-- -------------------------------------------------------------------------
create table inspection_checklist_results (
  id uuid primary key default gen_random_uuid(),
  inspection_history_id uuid not null references inspection_history(id) on delete cascade,
  checklist_item_id uuid references equipment_checklist_items(id),
  result text not null check (result in ('dat', 'khong_dat', 'khong_danh_gia')), -- áp dụng cho MỌI hạng mục
  presence_value text check (presence_value in ('co', 'khong_co')), -- chỉ dùng khi checklist_item.has_presence_flag = true
  "values" jsonb not null default '{}'::jsonb, -- keyed theo "key" của checklist_item.value_fields, vd {"tai_trong_su_dung": "5"}. Để trong ngoặc kép vì VALUES là từ khoá reserved của Postgres.
  note text,
  created_at timestamptz not null default now()
);

create index inspection_checklist_results_inspection_history_id_idx
  on inspection_checklist_results(inspection_history_id);
create index inspection_checklist_results_checklist_item_id_idx
  on inspection_checklist_results(checklist_item_id);

-- -------------------------------------------------------------------------
-- 4. inspection_history.report_metadata
-- -------------------------------------------------------------------------
alter table inspection_history
  add column report_metadata jsonb;

-- -------------------------------------------------------------------------
-- 5. Enable RLS
-- -------------------------------------------------------------------------
alter table equipment_checklist_templates enable row level security;
alter table equipment_checklist_items enable row level security;
alter table inspection_checklist_results enable row level security;

-- -------------------------------------------------------------------------
-- 6. Policies: equipment_checklist_templates / equipment_checklist_items
--    Giống hệt policy customers (migration 0002): SELECT mọi user đã đăng
--    nhập, INSERT/UPDATE/DELETE chỉ admin -- đây là dữ liệu cấu hình dùng
--    chung toàn hệ thống, không phải dữ liệu tác nghiệp hằng ngày của
--    inspector.
-- -------------------------------------------------------------------------
create policy "equipment_checklist_templates_select_authenticated" on equipment_checklist_templates
  for select using (auth.role() = 'authenticated');

create policy "equipment_checklist_templates_insert_admin" on equipment_checklist_templates
  for insert with check (public.get_user_role() = 'admin');

create policy "equipment_checklist_templates_update_admin" on equipment_checklist_templates
  for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "equipment_checklist_templates_delete_admin" on equipment_checklist_templates
  for delete using (public.get_user_role() = 'admin');

create policy "equipment_checklist_items_select_authenticated" on equipment_checklist_items
  for select using (auth.role() = 'authenticated');

create policy "equipment_checklist_items_insert_admin" on equipment_checklist_items
  for insert with check (public.get_user_role() = 'admin');

create policy "equipment_checklist_items_update_admin" on equipment_checklist_items
  for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "equipment_checklist_items_delete_admin" on equipment_checklist_items
  for delete using (public.get_user_role() = 'admin');

-- -------------------------------------------------------------------------
-- 7. Policies: inspection_checklist_results
--    Đúng theo policy đã có của inspection_history (migration 0002): SELECT
--    mọi người, INSERT/UPDATE admin+inspector, DELETE chỉ admin -- join qua
--    inspection_history_id để check is_locked giống inspection_history
--    (inspector không sửa/xóa được kết quả checklist của 1 lần kiểm định
--    đã bị khóa is_locked = true).
-- -------------------------------------------------------------------------
create policy "inspection_checklist_results_select_authenticated" on inspection_checklist_results
  for select using (auth.role() = 'authenticated');

create policy "inspection_checklist_results_insert_admin_inspector" on inspection_checklist_results
  for insert
  with check (
    public.get_user_role() in ('admin', 'inspector')
    and exists (
      select 1 from inspection_history ih
      where ih.id = inspection_history_id
        and (public.get_user_role() = 'admin' or ih.is_locked = false)
    )
  );

create policy "inspection_checklist_results_update_admin_or_unlocked_inspector" on inspection_checklist_results
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

create policy "inspection_checklist_results_delete_admin" on inspection_checklist_results
  for delete using (public.get_user_role() = 'admin');
