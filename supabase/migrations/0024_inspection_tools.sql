-- =========================================================================
-- PROMPT-43 (mentor draft): "Quản lý dụng cụ đo" -- danh mục thiết bị/dụng
-- cụ đo kiểm của công ty (KHÔNG phải thiết bị của khách hàng -- đó là bảng
-- equipment) + hệ thống mượn/trả (checkout) theo đúng yêu cầu của anh Hải:
--
--   "một mục quản lý riêng: người quản lý, người mượn, ngày mượn, đang làm
--    ở đâu, không trùng lặp, quản lý thời hạn kiểm định, giấy kiểm định,
--    hiệu chuẩn"
--
-- Nguồn dữ liệu seed: Danh_muc_thiet_bi_dung_cu_phuc_vu_kiem_dinh_INCERT.docx
-- (danh mục thật do anh Hải cung cấp) -- 1 bảng, 48 dòng dữ liệu, 6 cột:
-- STT | Tên máy, thiết bị | Mã số chế tạo/thiết bị (dạng "Kiểu: X / S/N: Y")
-- | Giấy tờ sở hữu thiết bị | Thời hạn kiểm định, hiệu chuẩn | Ghi chú.
-- Đã parse bằng python-docx, tách "Kiểu:"/"S/N:" thành model/serial riêng,
-- đổi ngày dd/mm/yyyy -> ISO, nhận diện chuỗi "Không áp dụng" ->
-- calibration_not_applicable = true.
--
-- ---------------------------------------------------------------------
-- THIẾT KẾ 2 BẢNG
-- ---------------------------------------------------------------------
-- inspection_tools: danh mục gốc (1 dòng / 1 thiết bị-dụng cụ vật lý, KHÔNG
--   lặp lại theo lần mượn). Có custodian_id (người quản lý mặc định) +
--   default_location (nơi cất khi không cho mượn) + toàn bộ thông tin hiệu
--   chuẩn/kiểm định (calibration_due_date/calibration_not_applicable/
--   calibration_cert_no -- cột cuối KHÔNG có trong danh mục gốc, để trống,
--   bổ sung dần khi có số giấy chứng nhận thật).
--
-- inspection_tool_loans: lịch sử mượn/trả (1 dòng / 1 LƯỢT mượn). Cột
--   returned_at NULL nghĩa là đang mượn (active loan). Ràng buộc
--   "không trùng lặp" của anh Hải = 1 dụng cụ không thể có 2 lượt mượn đang
--   mở cùng lúc -- ép bằng UNIQUE INDEX một phần (partial unique index)
--   trên (tool_id) WHERE returned_at IS NULL, xem bên dưới. work_location
--   = "đang làm ở đâu" (địa điểm/công trình hiện tại của dụng cụ khi đang
--   mượn), có thể liên kết optional tới customers nếu đang dùng để kiểm
--   định cho khách hàng cụ thể.
--
-- KHÔNG thêm cột "status mượn/trả" tính sẵn ở inspection_tools -- trạng
-- thái "đang mượn hay không" LUÔN suy ra bằng cách join xem có loan nào
-- returned_at IS NULL hay không (tránh 2 nguồn sự thật lệch nhau, đúng
-- tinh thần compute_equipment_status() ở migration 0007 nhưng ở đây đơn
-- giản hơn -- không cần trigger, chỉ 1 query JOIN ở tầng ứng dụng/view).
--
-- Cảnh báo hạn hiệu chuẩn: KHÔNG cần cột status enum riêng -- tái dùng
-- thẳng getExpiryStatus() (src/lib/utils/expiry-status.ts) đã có sẵn cho
-- equipment.expiry_date, áp lên inspection_tools.calibration_due_date ở
-- tầng UI (giống cách trang chi tiết KH màu đỏ/vàng/xanh cho hạn KĐ).
--
-- ⚠️ Migration này KHÔNG idempotent -- CHỈ chạy 1 lần trên SQL Editor. Lỡ
-- chạy 2 lần thì xóa hết rồi chạy lại:
--   drop table if exists inspection_tool_loans;
--   drop table if exists inspection_tools;
-- (loans phụ thuộc tools qua FK on delete cascade nên xóa tools sau).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Bảng inspection_tools (danh mục dụng cụ đo của công ty)
-- -------------------------------------------------------------------------
create table inspection_tools (
  id uuid primary key default gen_random_uuid(),
  code text unique not null, -- DC-001, DC-002... tự sinh (trigger bên dưới)
  name text not null,
  model text,
  serial_number text,
  ownership_doc text, -- Giấy tờ sở hữu thiết bị (số hóa đơn, đơn vị cấp...)
  calibration_due_date date, -- Thời hạn kiểm định/hiệu chuẩn
  calibration_not_applicable boolean not null default false, -- "Không áp dụng" trên danh mục gốc
  calibration_cert_no text, -- Số giấy kiểm định/hiệu chuẩn -- KHÔNG có sẵn trong danh mục gốc, bổ sung dần
  custodian_id uuid references profiles(id) on delete set null, -- Người quản lý (mặc định)
  default_location text default 'Kho INCERT', -- Nơi cất giữ khi không cho mượn
  status text not null default 'active' check (status in ('active', 'maintenance', 'retired')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inspection_tools_calibration_due_date_idx on inspection_tools (calibration_due_date);
create index inspection_tools_custodian_id_idx on inspection_tools (custodian_id);

-- Sinh mã DC-<3 số>, mirror generate_equipment_code() ở migration 0007
-- (count(*) + 1 -- đủ an toàn cho quy mô nội bộ ~10 người dùng, giống
-- equipment.code). CHỈ áp dụng khi insert từ app (client không truyền
-- code) -- 48 dòng seed bên dưới TỰ set code tường minh DC-001..DC-048
-- nên trigger không chạy cho seed, tránh rủi ro count(*) không thấy các
-- dòng vừa insert trong CÙNG 1 câu lệnh insert nhiều dòng.
create or replace function public.generate_inspection_tool_code()
returns text
language plpgsql
as $$
declare
  seq int;
begin
  select count(*) + 1 into seq from inspection_tools;
  return 'DC-' || lpad(seq::text, 3, '0');
end;
$$;

create or replace function public.set_inspection_tool_code()
returns trigger
language plpgsql
as $$
begin
  if new.code is null or new.code = '' then
    new.code := public.generate_inspection_tool_code();
  end if;
  return new;
end;
$$;

drop trigger if exists before_inspection_tool_insert_set_code on inspection_tools;
create trigger before_inspection_tool_insert_set_code
  before insert on inspection_tools
  for each row execute function public.set_inspection_tool_code();

-- -------------------------------------------------------------------------
-- 2. Bảng inspection_tool_loans (lịch sử mượn/trả)
-- -------------------------------------------------------------------------
create table inspection_tool_loans (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references inspection_tools(id) on delete cascade,
  borrower_id uuid references profiles(id) on delete set null, -- Người mượn
  borrowed_at date not null default current_date, -- Ngày mượn
  expected_return_at date, -- Ngày dự kiến trả (optional)
  returned_at date, -- NULL = đang mượn (active loan)
  work_location text, -- Đang làm ở đâu (địa điểm/công trình hiện tại)
  customer_id uuid references customers(id) on delete set null, -- Khách hàng đang kiểm định (optional)
  note text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index inspection_tool_loans_tool_id_idx on inspection_tool_loans (tool_id);
create index inspection_tool_loans_borrower_id_idx on inspection_tool_loans (borrower_id);

-- ⭐ RÀNG BUỘC "KHÔNG TRÙNG LẶP" của anh Hải: 1 dụng cụ chỉ được phép có
-- TỐI ĐA 1 lượt mượn đang mở (returned_at IS NULL) tại một thời điểm --
-- unique index MỘT PHẦN (chỉ áp trên các dòng returned_at IS NULL), nên
-- lịch sử các lượt đã trả (returned_at NOT NULL) KHÔNG bị giới hạn số
-- lượng. Insert lượt mượn thứ 2 cho cùng 1 tool_id khi lượt trước chưa trả
-- sẽ bị Postgres chặn thẳng bằng lỗi unique violation -- ứng dụng bắt lỗi
-- này để báo "Dụng cụ đang được mượn, chưa thể cho mượn tiếp".
create unique index inspection_tool_loans_one_active_idx
  on inspection_tool_loans (tool_id)
  where returned_at is null;

-- -------------------------------------------------------------------------
-- 3. RLS -- mirror đúng convention của bảng equipment (migration 0002/0006):
--    select = mọi user đã đăng nhập; insert/update = admin + inspector;
--    delete = chỉ admin.
-- -------------------------------------------------------------------------
alter table inspection_tools enable row level security;
alter table inspection_tool_loans enable row level security;

create policy "inspection_tools_select_authenticated" on inspection_tools
  for select using (auth.role() = 'authenticated');

create policy "inspection_tools_insert_admin_or_inspector" on inspection_tools
  for insert with check (public.get_user_role() in ('admin', 'inspector'));

create policy "inspection_tools_update_admin_inspector" on inspection_tools
  for update
  using (public.get_user_role() in ('admin', 'inspector'))
  with check (public.get_user_role() in ('admin', 'inspector'));

create policy "inspection_tools_delete_admin" on inspection_tools
  for delete using (public.get_user_role() = 'admin');

create policy "inspection_tool_loans_select_authenticated" on inspection_tool_loans
  for select using (auth.role() = 'authenticated');

create policy "inspection_tool_loans_insert_admin_or_inspector" on inspection_tool_loans
  for insert with check (public.get_user_role() in ('admin', 'inspector'));

create policy "inspection_tool_loans_update_admin_inspector" on inspection_tool_loans
  for update
  using (public.get_user_role() in ('admin', 'inspector'))
  with check (public.get_user_role() in ('admin', 'inspector'));

create policy "inspection_tool_loans_delete_admin" on inspection_tool_loans
  for delete using (public.get_user_role() = 'admin');

-- -------------------------------------------------------------------------
-- 4. Seed 48 dòng danh mục thật (Danh_muc_thiet_bi_dung_cu_phuc_vu_kiem_dinh_INCERT.docx)
--
-- code set tường minh DC-001..DC-048 theo đúng thứ tự STT gốc (KHÔNG dựa
-- vào trigger cho lần seed này -- xem giải thích ở mục 1). custodian_id
-- và default_location để mặc định (NULL / 'Kho INCERT') -- anh Hải gán
-- người quản lý cụ thể sau trên UI.
--
-- Ghi chú dữ liệu (giữ nguyên từ danh mục gốc, có 5 dòng cần anh Hải xử lý
-- thêm):
--   DC-005, DC-032: "Chưa ghi thời hạn" -- danh mục gốc bỏ trống cột hạn.
--   DC-009, DC-029, DC-030, DC-031, DC-048: "Cần bổ sung/đối chiếu chứng
--     từ" -- hồ sơ hóa đơn chưa khớp/chưa tìm thấy trong PDF gốc.
-- -------------------------------------------------------------------------
insert into inspection_tools (
  code, name, model, serial_number, ownership_doc, calibration_due_date,
  calibration_not_applicable, note
)
values
  ('DC-001', 'Máy kiểm tra khuyết tật bằng siêu âm USM 36', 'USM 36', '23080031', 'Hóa đơn GTGT ký hiệu 1C24TQH, số 00000252 do Công ty TNHH Kỹ thuật Quốc Huy cấp ngày 16/04/2024', '2027-07-27', false, null),
  ('DC-002', 'Gông từ Nawoo MY-2', 'Nawoo MY-2', '2305058', 'Hóa đơn GTGT ký hiệu 1C23TMV, số 00000597 do Công ty Cổ phần Công nghệ Mai Vũ cấp ngày 25/12/2023', '2027-05-18', false, null),
  ('DC-003', 'Máy kính vĩ điện tử GPI GT-116', 'GPI GT-116', '871343', 'Hóa đơn GTGT ký hiệu 1C26THP, số 80 do Công ty TNHH MTV Thiết bị Trắc địa và Đo đạc Hòa Phát cấp ngày 18/07/2026', '2027-07-18', false, null),
  ('DC-004', 'Phương tiện đo độ dài (Máy đo khoảng cách) UNI-T LM50A', 'UNI-T LM50A', 'C233964680', 'Hóa đơn GTGT ký hiệu 1C24TMT, số 00000443 do Công ty Cổ phần EMIN Việt Nam - Chi nhánh Miền Trung cấp ngày 26/03/2024', '2027-07-16', false, null),
  ('DC-005', 'Thước cuộn Stanley 34-108', 'Stanley 34-108', null, 'Hóa đơn GTGT ký hiệu 1C24TMT, số 00000443 do Công ty Cổ phần EMIN Việt Nam - Chi nhánh Miền Trung cấp ngày 26/03/2024', null, false, 'Chưa ghi thời hạn'),
  ('DC-006', 'Cân treo điện tử 10 tấn OCS-10T', 'OCS-10T', '210802', 'Hóa đơn GTGT ký hiệu 1C24TMP, số 55 do Công ty TNHH TM DV SX Xây dựng Minh Phúc cấp ngày 04/04/2024', '2027-07-16', false, null),
  ('DC-007', 'Đồng hồ vạn năng (Thiết bị đo điện vạn năng) HIOKI 3280-10F', 'HIOKI 3280-10F', '171000970', 'Hóa đơn GTGT ký hiệu 1C22TYY, số 79 do Công ty TNHH Thương mại Dịch vụ Nam Lê Thanh cấp ngày 15/06/2022', '2027-07-16', false, null),
  ('DC-008', 'Máy đo điện trở tiếp đất KYORITSU 4102A.', 'KYORITSU 4102A', 'E8145730', 'Hóa đơn GTGT ký hiệu 1C22TYY, số 79 do Công ty TNHH Thương mại Dịch vụ Nam Lê Thanh cấp ngày 15/06/2022', '2027-07-16', false, null),
  ('DC-009', 'Thước kẹp CENTURY', 'CENTURY', null, 'Theo danh sách Excel: Hóa đơn ký hiệu 1C22TYY, số 55; chưa thấy bản hóa đơn trong PDF', '2027-07-16', false, 'Cần bổ sung/đối chiếu chứng từ'),
  ('DC-010', 'Máy đo điện trở cách điện - KYORITSU 3005A', 'KYORITSU 3005A', 'E8379628', 'Hóa đơn GTGT ký hiệu 1C22TYY, số 918 do Công ty TNHH Thương mại Dịch vụ Công nghệ TK cấp ngày 13/06/2022', '2027-07-16', false, null),
  ('DC-011', 'Thiết bị đo ánh sáng (Phương tiện đo độ rọi) TES 1330A', 'TES 1330A', '210903761', 'Hóa đơn GTGT ký hiệu 1C22TYY, số 918 do Công ty TNHH Thương mại Dịch vụ Công nghệ TK cấp ngày 13/06/2022', '2027-01-31', false, null),
  ('DC-012', 'Thiết bị đo độ dày kim loại TG3000', 'TG-3000', 'H03223091210', 'Hóa đơn GTGT điều chỉnh ký hiệu 1C23THH, số 00001707 do Công ty TNHH XNK Thiết bị Khoa học Công nghệ Hữu Hảo cấp ngày 16/11/2023', '2027-07-16', false, null),
  ('DC-013', 'Áp kế lò xo ống', 'Lò xo ống', null, 'Hóa đơn bán hàng ký hiệu 2C24TGB, số 93 do Hộ kinh doanh Trần Nguyễn Gia Bảo cấp ngày 20/07/2024', '2027-07-16', false, null),
  ('DC-014', 'Áp kế lò xo ống', 'Lò xo ống', null, 'Hóa đơn bán hàng ký hiệu 2C24TGB, số 93 do Hộ kinh doanh Trần Nguyễn Gia Bảo cấp ngày 20/07/2024', '2027-07-16', false, null),
  ('DC-015', 'Áp kế lò xo ống', 'Lò xo ống', null, 'Hóa đơn bán hàng ký hiệu 2C24TGB, số 93 do Hộ kinh doanh Trần Nguyễn Gia Bảo cấp ngày 20/07/2024', '2027-07-16', false, null),
  ('DC-016', 'Áp kế lò xo ống', 'Lò xo ống', null, 'Hóa đơn bán hàng ký hiệu 2C24TGB, số 93 do Hộ kinh doanh Trần Nguyễn Gia Bảo cấp ngày 20/07/2024', '2027-07-16', false, null),
  ('DC-017', 'Áp kế lò xo ống', 'Lò xo ống', null, 'Hóa đơn bán hàng ký hiệu 2C24TGB, số 93 do Hộ kinh doanh Trần Nguyễn Gia Bảo cấp ngày 20/07/2024', '2027-07-16', false, null),
  ('DC-018', 'Máy kiểm tra áp lực nước bằng tay Kyowa T100K', 'Kyowa T100K', null, 'Hóa đơn GTGT ký hiệu 1C22THH, số 1 do Công ty TNHH Máy móc Hup Hong Việt Nam cấp ngày 05/01/2022', null, true, null),
  ('DC-019', 'Máy nội soi công nghiệp', 'EXTECH BR80', '190717676', 'Hóa đơn GTGT ký hiệu 1C22TMT, số 00000147 do Công ty Cổ phần EMIN Việt Nam - Chi nhánh Miền Trung cấp ngày 15/07/2022', null, true, null),
  ('DC-020', 'Búa su 0,5 kg', null, null, 'Hóa đơn GTGT ký hiệu 1C22TKT, số 271 do Công ty TNHH MTV Kim Mai Thùy cấp ngày 15/07/2022', null, true, null),
  ('DC-021', 'Kìm niêm chì', null, null, 'Hóa đơn GTGT ký hiệu 1C22TKT, số 271 do Công ty TNHH MTV Kim Mai Thùy cấp ngày 15/07/2022', null, true, null),
  ('DC-022', 'Búa đàu vuông TACTIX 220105', 'TACTIX 220105', null, 'Hóa đơn GTGT ký hiệu 1C26MCE, số 35773 do Công ty TNHH ACE Home Center cấp ngày 20/07/2026', null, true, null),
  ('DC-023', 'Búa đàu vuông TACTIX 220109', 'TACTIX 220109', null, 'Hóa đơn GTGT ký hiệu 1C26MCE, số 35773 do Công ty TNHH ACE Home Center cấp ngày 20/07/2026', null, true, null),
  ('DC-024', 'Búa lõi thép bọc cao su TACTIX', 'TACTIX', null, 'Hóa đơn GTGT ký hiệu 1C26MCE, số 35773 do Công ty TNHH ACE Home Center cấp ngày 20/07/2026', null, true, null),
  ('DC-025', 'Kính lúp Tactix 545261', 'TACTIX 545261', null, 'Hóa đơn GTGT ký hiệu 1C26MCE, số 35773 do Công ty TNHH ACE Home Center cấp ngày 20/07/2026', null, true, null),
  ('DC-026', 'Kính lúp Tactix 545261', 'TACTIX 545261', null, 'Hóa đơn GTGT ký hiệu 1C26MCE, số 35773 do Công ty TNHH ACE Home Center cấp ngày 20/07/2026', null, true, null),
  ('DC-027', 'Đèn pin led', 'Đèn LED 5W', null, 'Hóa đơn GTGT ký hiệu 1C26MCE, số 35773 do Công ty TNHH ACE Home Center cấp ngày 20/07/2026', null, true, null),
  ('DC-028', 'Quả cân (29 Quả)', 'Quả cân 20 kg', null, 'Hóa đơn GTGT ký hiệu 1C24TTT, số 00000149 do Công ty TNHH Kỹ thuật Cơ điện Thành Tân cấp ngày 26/11/2024', null, true, null),
  ('DC-029', 'Ampe kìm (Thiết bị đo điện vạn năng) HIOKI 3280-10F', 'HIOKI 3280-10F', '170913114', 'Chưa thấy chứng từ trong hồ sơ PDF', '2027-07-16', false, 'Cần bổ sung/đối chiếu chứng từ'),
  ('DC-030', 'Thước kẹp MITUTOYO 530-118', 'MITUTOYO 530-118', '19295145', 'Chưa thấy chứng từ trong hồ sơ PDF', '2027-07-16', false, 'Cần bổ sung/đối chiếu chứng từ'),
  ('DC-031', 'Phương tiện đo độ dài (Máy đo khoảng cách) H-D100', 'H-D100', '20H082091', 'Chưa thấy chứng từ trong hồ sơ PDF', '2027-07-16', false, 'Cần bổ sung/đối chiếu chứng từ'),
  ('DC-032', 'Thước cuộn -  HSMT8430', 'HSMT8430', null, 'Chưa thấy chứng từ trong hồ sơ PDF', null, false, 'Cần bổ sung/đối chiếu chứng từ; Chưa ghi thời hạn'),
  ('DC-033', 'Máy đo tốc độ vòng quay (Tốc độ kế) LUTRON DT1236L', 'LUTRON DT1236L', 'I.674248', 'Hóa đơn GTGT ký hiệu 1C26TMT, số 00001193 do Công ty Cổ phần EMIN Việt Nam - Chi nhánh Miền Trung cấp ngày 23/07/2026', '2027-07-27', false, null),
  ('DC-034', 'Thiết bị đo ánh sáng (Phương tiện đo độ rọi) TESTO 540', 'TESTO 540', '0192-5354', 'Hóa đơn GTGT ký hiệu 1C26TMT, số 00001193 do Công ty Cổ phần EMIN Việt Nam - Chi nhánh Miền Trung cấp ngày 23/07/2026', '2027-07-30', false, null),
  ('DC-035', 'Máy đo độ ồn âm thanh (Máy đo cường độ âm thanh) SEW 3310 SL', 'SEW 3310 SL', '2633280', 'Hóa đơn GTGT ký hiệu 1C26TMT, số 00001193 do Công ty Cổ phần EMIN Việt Nam - Chi nhánh Miền Trung cấp ngày 23/07/2026', '2027-07-30', false, null),
  ('DC-036', 'Thiết bị đo điện trở cách điện KYORITSU 3005A', 'KYORITSU 3005A', 'E8564539', 'Hóa đơn GTGT ký hiệu 1C26TMT, số 00001193 do Công ty Cổ phần EMIN Việt Nam - Chi nhánh Miền Trung cấp ngày 23/07/2026', '2027-07-27', false, null),
  ('DC-037', 'Máy đo điện trở đất (Thiết bị đo điện trở tiếp địa) KYORITSU 4105A', 'KYORITSU 4105A', 'E8550367', 'Hóa đơn GTGT ký hiệu 1C26TMT, số 00001193 do Công ty Cổ phần EMIN Việt Nam - Chi nhánh Miền Trung cấp ngày 23/07/2026', '2027-07-27', false, null),
  ('DC-038', 'Ampe kìm (Thiết bị đo điện vạn năng) HIOKI CM3289', 'HIOKI CM3289', '260406968', 'Hóa đơn GTGT ký hiệu 1C26TMT, số 00001193 do Công ty Cổ phần EMIN Việt Nam - Chi nhánh Miền Trung cấp ngày 23/07/2026', '2027-07-27', false, null),
  ('DC-039', 'Đồng hồ vạn năng (Thiết bị đo điện vạn năng)', 'FLUKE 101', '65061690WS', 'Hóa đơn GTGT ký hiệu 1C26TMT, số 00001193 do Công ty Cổ phần EMIN Việt Nam - Chi nhánh Miền Trung cấp ngày 23/07/2026', '2027-07-27', false, null),
  ('DC-040', 'Máy đo nhiệt độ bằng hồng ngoại (Thiết bị đo nhiệt độ) FLUKE 59', 'FLUKE 59', 'VN85993', 'Hóa đơn GTGT ký hiệu 1C26TMT, số 00001193 do Công ty Cổ phần EMIN Việt Nam - Chi nhánh Miền Trung cấp ngày 23/07/2026', '2027-07-29', false, null),
  ('DC-041', 'Camera đo nhiệt độ (Thiết bị chụp ảnh nhiệt)', 'UNI-T UTi716B', 'AT10E25230121', 'Hóa đơn GTGT ký hiệu 1C26TMT, số 00001193 do Công ty Cổ phần EMIN Việt Nam - Chi nhánh Miền Trung cấp ngày 23/07/2026', null, true, null),
  ('DC-042', 'Máy đo khí rò rỉ trong hệ thống làm lạnh (Thiết bị kiểm tra phát hiện rò rỉ khí) TESTO 316-4', 'TESTO 316-4', '1125 3516', 'Hóa đơn GTGT ký hiệu 1C26TMT, số 00001193 do Công ty Cổ phần EMIN Việt Nam - Chi nhánh Miền Trung cấp ngày 23/07/2026', null, true, null),
  ('DC-043', 'Máy đo độ dày lớp phủ', 'UNI-T UT343A', 'C261027000', 'Hóa đơn GTGT ký hiệu 1C26TMT, số 00001193 do Công ty Cổ phần EMIN Việt Nam - Chi nhánh Miền Trung cấp ngày 23/07/2026', '2027-07-27', false, null),
  ('DC-044', 'Máy nén khí STANLEY', 'STANLEY', '2634460046', 'Hóa đơn GTGT ký hiệu 1C26TAA, số 00001906 do Công ty TNHH Thương mại Đầu tư An Vi cấp ngày 21/07/2026', null, true, null),
  ('DC-045', 'Dung dịch phát hiện rò khí 25240', '25240', null, 'Hóa đơn GTGT ký hiệu 1C26THM, số 00000535 do Công ty TNHH Kỹ nghệ Vật liệu Hải Minh cấp ngày 24/07/2026', null, true, null),
  ('DC-046', 'Máy thủy bình SAL32', 'SAL32', '528300323', 'Hóa đơn GTGT ký hiệu 1C26THP, số 90 do Công ty TNHH MTV Thiết bị Trắc địa và Đo đạc Hòa Phát cấp ngày 27/07/2026', '2027-07-25', false, null),
  ('DC-047', 'Máy đo rò khí gas cháy Si-CD3', 'Si-CD3', null, 'Hóa đơn GTGT ký hiệu 1C26TVN, số 00000212 do Công ty TNHH FUCO cấp ngày 27/07/2026', null, true, null),
  ('DC-048', 'Cờ lê lực M-1000N', 'M-1000N', 'GF147469', 'Chưa thấy chứng từ trong hồ sơ PDF', '2027-07-28', false, 'Cần bổ sung/đối chiếu chứng từ');
