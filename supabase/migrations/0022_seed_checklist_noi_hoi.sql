-- =========================================================================
-- PROMPT-38 (mentor draft): Seed checklist kiểm định "Nồi hơi"
--
-- Nguồn: uploads/QTKD Noi hoi.pdf, trang 13-18/18, mẫu "BIÊN BẢN KIỂM ĐỊNH
-- KỸ THUẬT AN TOÀN NỒI HƠI (NỒI ĐUN NƯỚC NÓNG)" -- gộp chung 1 biên bản cho
-- cả 2 loại thiết bị "Nồi hơi" và "Nồi đun nước nóng có nhiệt độ môi chất
-- trên 115°C". Đã xem trực tiếp ảnh chụp cả 6 trang (150 DPI) + crop 300 DPI
-- riêng mục 3.1 (trang 15) và mục 5 (trang 16-17) để xác định chính xác ô
-- nào có/không có cột giá trị (phân biệt ô để trống-điền-được với ô bị gạch
-- chéo = không áp dụng).
--
-- Cấu trúc mẫu (I-V, giống họ "Bộ Nội Vụ" của Bình áp lực nhưng PHỨC TẠP
-- HƠN):
--   I   - Thông số cơ bản của nồi          -> EQUIPMENT_SPEC_FIELDS (code)
--   II  - Hình thức kiểm định                -> report_metadata dùng chung
--   III.1 - Kiểm tra hồ sơ (3 nhóm Lần đầu/Định kỳ/Bất thường, chỉ Có/Không
--           có) -> KHÔNG seed, field riêng report_metadata (giống Bình áp lực)
--   III.2 - Thiết bị, dụng cụ phục vụ kiểm định (bảng động)
--           -> KHÔNG seed, field mảng report_metadata.
--   3. Kiểm tra kỹ thuật bên ngoài, bên trong:
--     3.1. Kết quả kiểm tra trực tiếp (13 hạng mục, ĐỦ 3 cột Đạt/Không đạt/
--          Không đánh giá + cột Đơn vị đo/Kết quả đo cho 2 hạng mục đầu)
--          -> SEED dưới đây, item_order 1-13.
--     3.2. Kết quả áp dụng biện pháp kiểm tra thay thế (nếu có) -- khối text
--          tự do 6 dòng, KHÔNG có trong mẫu Bình áp lực
--          -> KHÔNG seed, field riêng report_metadata.
--     Bảng phụ "Các thiết bị đo lường, bảo vệ, an toàn và tự động" (Van an
--     toàn/Áp kế/Đo mức/Thiết bị báo mức.../Các thiết bị khác, free text)
--          -> KHÔNG seed, field riêng report_metadata.
--   4. Thử nghiệm: CHỈ có "Thử bền" (không có "Thử kín" như Bình áp lực),
--     nhãn cột "Có/Không" cho từng phép đo (rò rỉ/biến dạng nứt/độ tụt áp)
--          -> KHÔNG seed vào checklist generic (nhãn khác "Đạt/Không đạt/
--             Không đánh giá" của checklist-item-card.tsx) -- field riêng
--             report_metadata, giống hệt lý do của Bình áp lực.
--   5. Thử vận hành: 16 hạng mục lồng nhau (1, 2.1-2.8, 3.1-3.2, 4.1-4.3, 5,
--     6), layout 2 cột-nửa-trang, ĐỦ 3 cột Đạt/Không đạt/Không đánh giá. 8/16
--     hạng mục CÓ cột "Giá trị thấp/Giá trị cao" (khác Bình áp lực chỉ có 1
--     cột giá trị) -- 8 hạng mục còn lại bị gạch chéo (không áp dụng), đã xác
--     nhận qua crop 300 DPI (crop-p16-bottom.jpg, crop-p17-top.jpg):
--       - CÓ giá trị: 2.3 Bộ quá nhiệt, 2.4 Bộ hâm nước, 2.5 (*), 3.1 Van an
--         toàn, 3.2 Rơ le áp suất, 4.1 Áp kế, 4.2 Đo mức, 4.3 Đo nhiệt độ.
--       - KHÔNG giá trị (gạch chéo): 1 Tình trạng làm việc của nồi, 2.1 Bơm
--         cấp nước/hệ thống xử lý nước, 2.2 Quạt hút quạt đẩy, 2.6 Thiết bị
--         cấp liệu, 2.7 Thiết bị thải xỉ, 2.8 Đường khói và ống khói, 5 Các
--         thiết bị tự động, 6 Các van (cấp nước, xả đáy, …).
--     -> SEED dưới đây, item_order 14-29 (item_code giữ nguyên số TT gốc).
--
--   (*) Hạng mục 2.5: LỖI/THIẾU SÓT của bản gốc PDF -- ô "Tên hạng mục" KHÔNG
--   có chữ, chỉ in sẵn đơn vị đo "°C" (đã xác nhận qua ảnh chụp VÀ pdftotext,
--   không phải lỗi đọc). Đã báo anh Hải ngày 2026-08-19, anh Hải trả lời "ok"
--   -- tạm ghi placeholder rõ ràng bên dưới, ĐỢI anh Hải bổ sung tên thật rồi
--   sửa lại migration/spec sau (đề xuất: có thể là "Nhiệt độ khói thải" hoặc
--   "Nhiệt độ nước cấp", nhưng KHÔNG tự đoán vào đây).
--
--   IV  - Kết luận và kiến nghị (mục 5 "Áp suất đặt của van an toàn" là BẢNG
--         2 dòng x 3 cột (Van hơi bão hòa/Van hơi quá nhiệt), khác hẳn 2 dòng
--         text tự do của Bình áp lực) -> field riêng report_metadata.
--   V   - Thời hạn kiểm định -> field đã có sẵn dùng chung.
--
-- Migration này CHỈ seed 29 dòng (mục 3.1 + mục 5) khớp thẳng kiến trúc
-- equipment_checklist_items -- phần còn lại (mục 1, 2, 3.2, bảng phụ mục 3,
-- 4, IV) sẽ làm bằng field report_metadata + form nhập riêng ở PROMPT sau.
--
-- item_code: đánh theo đúng TT gốc của TỪNG mục (mục 3.1 và mục 5 đều tự
-- đánh TT riêng từ 1) -- item_order vẫn liên tục 1-29 để UI hiển thị đúng
-- thứ tự.
--
-- Không có cột "Yêu cầu kỹ thuật/tiêu chuẩn tham chiếu" trong bảng gốc, trừ
-- hạng mục "Chiếu sáng vận hành" có in sẵn ngưỡng "≥100" trong ô Kết quả đo
-- -> lưu vào technical_requirement, value_fields vẫn giữ để nhập số đo thực
-- tế. Các hạng mục khác technical_requirement = NULL.
--
-- ⚠️ Migration này KHÔNG idempotent -- CHỈ chạy 1 lần trên SQL Editor. Lỡ
-- chạy 2 lần thì xóa hết rồi chạy lại: delete from
-- equipment_checklist_templates where equipment_type = 'Nồi hơi';
-- (cascade xóa luôn items).
-- =========================================================================

insert into equipment_checklist_templates (equipment_type, name, source_document)
values (
  'Nồi hơi',
  'Biên bản kiểm định kỹ thuật an toàn nồi hơi (nồi đun nước nóng)',
  'QTKĐ - Quy trình kiểm định nồi hơi, nồi đun nước nóng, mẫu biên bản (Phụ lục)'
);

insert into equipment_checklist_items (
  template_id, section, item_order, item_code, title, technical_requirement,
  has_presence_flag, value_fields, is_required
)
select
  t.id, v.section, v.item_order, v.item_code, v.title, v.technical_requirement,
  v.has_presence_flag, v.value_fields, true
from equipment_checklist_templates t
cross join (values
  -- ===== 3.1. Kết quả kiểm tra trực tiếp =====
  (
    '3.1. Kết quả kiểm tra trực tiếp', 1, '1',
    'Khoảng cách, vị trí lắp đặt',
    null, false,
    '[{"key":"khoang_cach","label":"Khoảng cách, vị trí lắp đặt","unit":"m"}]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 2, '2',
    'Chiếu sáng vận hành',
    '≥100 Lux', false,
    '[{"key":"chieu_sang","label":"Chiếu sáng vận hành","unit":"Lux"}]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 3, '3',
    'Thông gió',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 4, '4',
    'Cầu thang, sàn thao tác',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 5, '5',
    'Bảo ôn',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 6, '6',
    'Các bộ phận phụ trợ',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 7, '7',
    'Các thiết bị đo lường, bảo vệ, an toàn và tự động khác',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 8, '8',
    'Tình trạng kim loại các bộ phận chịu áp lực',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 9, '9',
    'Tình trạng mối hàn',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 10, '10',
    'Hệ thống xử lý và cấp nước',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 11, '11',
    'Quạt gió, quạt khói',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 12, '12',
    'Hệ thống cấp nhiên liệu (Thủ công / Tự động)',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 13, '13',
    'Hệ thống thải xỉ (Thủ công / Tự động)',
    null, false, '[]'::jsonb
  ),
  -- ===== 5. Thử vận hành =====
  (
    '5. Thử vận hành', 14, '1',
    'Tình trạng làm việc của nồi',
    null, false, '[]'::jsonb
  ),
  (
    '5. Thử vận hành', 15, '2.1',
    'Bơm cấp nước, hệ thống xử lý nước',
    null, false, '[]'::jsonb
  ),
  (
    '5. Thử vận hành', 16, '2.2',
    'Quạt hút, quạt đẩy',
    null, false, '[]'::jsonb
  ),
  (
    '5. Thử vận hành', 17, '2.3',
    'Bộ quá nhiệt',
    null, false,
    '[{"key":"gt_thap","label":"Giá trị thấp","unit":null},{"key":"gt_cao","label":"Giá trị cao","unit":null}]'::jsonb
  ),
  (
    '5. Thử vận hành', 18, '2.4',
    'Bộ hâm nước',
    null, false,
    '[{"key":"gt_thap","label":"Giá trị thấp","unit":null},{"key":"gt_cao","label":"Giá trị cao","unit":null}]'::jsonb
  ),
  (
    '5. Thử vận hành', 19, '2.5',
    '[Hạng mục 2.5 - bản gốc PDF thiếu tên, chỉ in sẵn đơn vị đo °C, chờ anh Hải bổ sung]',
    null, false,
    '[{"key":"gt_thap","label":"Giá trị thấp","unit":"°C"},{"key":"gt_cao","label":"Giá trị cao","unit":"°C"}]'::jsonb
  ),
  (
    '5. Thử vận hành', 20, '2.6',
    'Thiết bị cấp liệu',
    null, false, '[]'::jsonb
  ),
  (
    '5. Thử vận hành', 21, '2.7',
    'Thiết bị thải xỉ',
    null, false, '[]'::jsonb
  ),
  (
    '5. Thử vận hành', 22, '2.8',
    'Đường khói và ống khói',
    null, false, '[]'::jsonb
  ),
  (
    '5. Thử vận hành', 23, '3.1',
    'Van an toàn',
    null, false,
    '[{"key":"gt_thap","label":"Giá trị thấp","unit":null},{"key":"gt_cao","label":"Giá trị cao","unit":null}]'::jsonb
  ),
  (
    '5. Thử vận hành', 24, '3.2',
    'Rơ le áp suất',
    null, false,
    '[{"key":"gt_thap","label":"Giá trị thấp","unit":null},{"key":"gt_cao","label":"Giá trị cao","unit":null}]'::jsonb
  ),
  (
    '5. Thử vận hành', 25, '4.1',
    'Áp kế',
    null, false,
    '[{"key":"gt_thap","label":"Giá trị thấp","unit":null},{"key":"gt_cao","label":"Giá trị cao","unit":null}]'::jsonb
  ),
  (
    '5. Thử vận hành', 26, '4.2',
    'Đo mức',
    null, false,
    '[{"key":"gt_thap","label":"Giá trị thấp","unit":null},{"key":"gt_cao","label":"Giá trị cao","unit":null}]'::jsonb
  ),
  (
    '5. Thử vận hành', 27, '4.3',
    'Đo nhiệt độ',
    null, false,
    '[{"key":"gt_thap","label":"Giá trị thấp","unit":null},{"key":"gt_cao","label":"Giá trị cao","unit":null}]'::jsonb
  ),
  (
    '5. Thử vận hành', 28, '5',
    'Các thiết bị tự động',
    null, false, '[]'::jsonb
  ),
  (
    '5. Thử vận hành', 29, '6',
    'Các van (cấp nước, xả đáy, …)',
    null, false, '[]'::jsonb
  )
) as v(section, item_order, item_code, title, technical_requirement, has_presence_flag, value_fields)
where t.equipment_type = 'Nồi hơi';
