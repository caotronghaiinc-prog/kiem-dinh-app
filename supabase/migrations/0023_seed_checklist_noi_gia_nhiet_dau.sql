-- =========================================================================
-- PROMPT-41 (mentor draft): Seed checklist kiểm định "Nồi gia nhiệt dầu"
--
-- Nguồn: uploads/QTKD Noi gia nhiet dau.pdf, trang 12-16/16, mẫu "BIÊN BẢN
-- KIỂM ĐỊNH KỸ THUẬT AN TOÀN NỒI GIA NHIỆT DẦU". Đã xem trực tiếp ảnh chụp
-- cả 5 trang (150 DPI), đối chiếu với pdftotext -layout.
--
-- ⚠️ Loại thiết bị "Nồi gia nhiệt dầu" CHƯA có trong EQUIPMENT_TYPE_GROUPS
-- (src/lib/equipment/form-schema.ts) -- cần thêm mới trong PROMPT code đi
-- kèm (PROMPT-41), migration này không đụng tới bảng form-schema (code, không
-- phải DB).
--
-- Cấu trúc mẫu: GẦN NHƯ SONG SINH với "Bình áp lực" (PROMPT-33/migration
-- 0021) -- cùng họ mẫu I-V, KHÔNG có hạng mục nào cần ô giá trị số (khác hẳn
-- "Nồi hơi" migration 0022 có 8 hạng mục cần Giá trị thấp/cao). Khác Bình áp
-- lực ở đúng 1 điểm cấu trúc: có thêm mục "3.2. Kết quả áp dụng biện pháp
-- kiểm tra thay thế (nếu có)" (6 dòng text tự do) -- y hệt mục 3.2 đã làm ở
-- Nồi hơi, KHÔNG có ở Bình áp lực.
--
--   I   - Thông số cơ bản của nồi          -> EQUIPMENT_SPEC_FIELDS (code)
--   II  - Hình thức kiểm định               -> report_metadata dùng chung
--   1. Kiểm tra hồ sơ (3 nhóm Lần đầu 4 dòng / Định kỳ 6 dòng / Bất thường 8
--      dòng -- SỐ DÒNG NHÓM LẦN ĐẦU KHÁC Bình áp lực (5) và Nồi hơi (5)! chỉ
--      có 4 dòng. Chỉ Có/Không có, không có Đạt/Không đạt)
--      -> KHÔNG seed vào equipment_checklist_items, field riêng report_metadata.
--   2. Thiết bị, dụng cụ phục vụ kiểm định (bảng động)
--      -> KHÔNG seed, field mảng report_metadata.
--   3. Kiểm tra kỹ thuật bên ngoài, bên trong:
--     3.1. Kết quả kiểm tra trực tiếp (14 hạng mục, ĐỦ 3 cột Đạt/Không đạt/
--          Không đánh giá, KHÔNG có hạng mục nào cần ô giá trị -- khác hẳn
--          Nồi hơi) -> SEED dưới đây, item_order 1-14.
--     Bảng phụ "Tình trạng của các thiết bị kiểm tra an toàn, dụng cụ đo
--     kiểm": Van an toàn / Áp kế / Nhiệt kế (3 dòng, free text) -- LƯU Ý
--     dòng 3 là "Nhiệt kế" (Kiểu loại, Số tem KĐ/HC, Số lượng), KHÔNG phải
--     "Đo mức" như Bình áp lực/Nồi hơi -- nồi gia nhiệt dầu dùng dầu tải
--     nhiệt tuần hoàn kín, không có mức nước để đo.
--          -> KHÔNG seed, field riêng report_metadata.
--     3.2. Kết quả áp dụng biện pháp kiểm tra thay thế (nếu có) -- 6 dòng
--          text tự do, giống hệt cấu trúc Nồi hơi (migration 0022), KHÔNG
--          có ở Bình áp lực.
--          -> KHÔNG seed, field riêng report_metadata.
--   4. Thử nghiệm: CÓ CẢ Thử bền VÀ Thử kín (giống Bình áp lực, khác Nồi hơi
--      chỉ có Thử bền), nhãn cột "Không/Có" cho từng phép đo
--          -> KHÔNG seed vào checklist generic (nhãn khác "Đạt/Không đạt/
--             Không đánh giá"), field riêng report_metadata.
--   5. Thử vận hành: CHỈ 4 hạng mục, CHỈ có cột Đạt/Không đạt (không có
--      "Không đánh giá" trên giấy, giống hệt Bình áp lực III.5 -- UI vẫn khớp
--      được result CHECK constraint, chỉ bỏ qua nhãn "Không đánh giá" khi
--      dựng mẫu Word), KHÔNG hạng mục nào cần ô giá trị.
--          -> SEED dưới đây, item_order 15-18.
--   IV  - Kết luận và kiến nghị (áp suất làm việc lớn nhất, nhiệt độ làm
--         việc lớn nhất, áp suất cài đặt van an toàn "Hiệu chỉnh cùng/không
--         cùng quá trình kiểm định" -- 2 dòng text tự do, ĐÚNG PATTERN Bình
--         áp lực, KHÁC bảng 2x3 của Nồi hơi)
--          -> field riêng report_metadata + reuse spec_values cho áp
--             suất/nhiệt độ làm việc lớn nhất (giống Bình áp lực).
--   V   - Thời hạn kiểm định -> field đã có sẵn dùng chung.
--
-- Migration này CHỈ seed 18 dòng (mục 3.1 = 14 + mục 5 = 4) khớp thẳng kiến
-- trúc equipment_checklist_items -- phần còn lại (mục 1, 2, 3.1 phụ, 3.2, 4,
-- IV) làm bằng field report_metadata + form nhập riêng ở PROMPT sau.
--
-- item_code: đánh theo đúng TT gốc của TỪNG mục (mục 3.1 và mục 5 đều tự
-- đánh TT riêng từ 1) -- item_order liên tục 1-18.
--
-- KHÔNG có cột "Yêu cầu kỹ thuật/tiêu chuẩn tham chiếu" trong bảng gốc --
-- technical_requirement = NULL cho toàn bộ 18 dòng. KHÔNG có hạng mục nào
-- cần ô giá trị số -- has_presence_flag = false, value_fields = '[]' cho
-- toàn bộ 18 dòng (khác hẳn Nồi hơi).
--
-- ⚠️ Migration này KHÔNG idempotent -- CHỈ chạy 1 lần trên SQL Editor. Lỡ
-- chạy 2 lần thì xóa hết rồi chạy lại: delete from
-- equipment_checklist_templates where equipment_type = 'Nồi gia nhiệt dầu';
-- (cascade xóa luôn items).
-- =========================================================================

insert into equipment_checklist_templates (equipment_type, name, source_document)
values (
  'Nồi gia nhiệt dầu',
  'Biên bản kiểm định kỹ thuật an toàn nồi gia nhiệt dầu',
  'QTKĐ - Quy trình kiểm định nồi gia nhiệt dầu, mẫu biên bản (Phụ lục)'
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
    'Thông số kỹ thuật so với lý lịch',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 2, '2',
    'Vị trí lắp đặt (Khoảng cách với tường, giữa các thiết bị)',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 3, '3',
    'Chiếu sáng vận hành',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 4, '4',
    'Sàn, cầu thang thao tác, giá treo, …',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 5, '5',
    'Tiếp địa chống sét, tiếp địa an toàn điện',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 6, '6',
    'Tình trạng bề mặt kim loại các bộ phận chịu áp lực',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 7, '7',
    'Tình trạng mối hàn, các mối nối',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 8, '8',
    'Tình trạng sơn, bảo ôn',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 9, '9',
    'Kiểm tra bên trong',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 10, '10',
    'Các van và thiết bị phụ trợ',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 11, '11',
    'Van an toàn',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 12, '12',
    'Áp kế',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 13, '13',
    'Nhiệt kế',
    null, false, '[]'::jsonb
  ),
  (
    '3.1. Kết quả kiểm tra trực tiếp', 14, '14',
    'Các thiết bị an toàn, tự động khác',
    null, false, '[]'::jsonb
  ),
  -- ===== 5. Thử vận hành =====
  (
    '5. Thử vận hành', 15, '1',
    'Tình trạng làm việc của nồi',
    null, false, '[]'::jsonb
  ),
  (
    '5. Thử vận hành', 16, '2',
    'Tình trạng làm việc của thiết bị đo lường',
    null, false, '[]'::jsonb
  ),
  (
    '5. Thử vận hành', 17, '3',
    'Tình trạng làm việc của van an toàn',
    null, false, '[]'::jsonb
  ),
  (
    '5. Thử vận hành', 18, '4',
    'Tình trạng làm việc của thiết bị phụ trợ',
    null, false, '[]'::jsonb
  )
) as v(section, item_order, item_code, title, technical_requirement, has_presence_flag, value_fields)
where t.equipment_type = 'Nồi gia nhiệt dầu';
