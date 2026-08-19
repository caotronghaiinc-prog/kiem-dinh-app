-- =========================================================================
-- PROMPT-32 (mentor draft): Seed checklist kiểm định "Bình áp lực"
--
-- Nguồn: mau-bien-ban/KTAT/QTKD-Binh-ap-luc.pdf, trang 14-18/18, mẫu
-- "BIÊN BẢN KIỂM ĐỊNH KỸ THUẬT AN TOÀN BÌNH CHỊU ÁP LỰC". Đã xem trực tiếp
-- ảnh chụp cả 5 trang (không chỉ trích xuất text thô).
--
-- ⚠️ KHÁC HẲN CẤU TRÚC nhóm "Thiết bị nâng" (mục I-V, không phải A/B/C):
--   I   - Thông số cơ bản của bình         -> EQUIPMENT_SPEC_FIELDS (code)
--   II  - Hình thức kiểm định               -> report_metadata (đã có sẵn field
--                                              hinh_thuc_kiem_dinh dùng chung)
--   III.1 - Kiểm tra hồ sơ (19 dòng, 3 nhóm theo Lần đầu/Định kỳ/Bất thường,
--           chỉ có cột Có/Không có, KHÔNG có Đạt/Không đạt)
--           -> KHÔNG seed vào equipment_checklist_items (giống tiền lệ mục
--              "Kiểm tra hồ sơ kỹ thuật" của Thiết bị nâng) -- UI checklist-
--              item-card.tsx luôn hard-code hiện 3 pill Đạt/Không đạt/Không
--              đánh giá cho mọi item, không hợp với bảng chỉ có Có/Không có.
--              Sẽ làm field mới trong report_metadata + form nhập riêng.
--   III.2 - Thiết bị, dụng cụ phục vụ kiểm định (bảng động, tự thêm dòng)
--           -> KHÔNG seed, làm field mảng trong report_metadata.
--   III.3 - Kiểm tra kỹ thuật bên ngoài, bên trong (14 hạng mục, CÓ đủ 3 cột
--           Đạt/Không đạt/Không đánh giá -- ĐÚNG khớp result CHECK constraint
--           của inspection_checklist_results) + bảng phụ "Tình trạng thiết bị
--           kiểm tra an toàn" (Van an toàn/Áp kế/Đo mức, free text)
--           -> 14 hạng mục NÀY được seed dưới đây (item_order 1-14). Bảng phụ
--              free text KHÔNG seed, để trong report_metadata.
--   III.4 - Thử nghiệm (Thử bền/Thử kín, nhãn cột "Không/Có" cho từng phép đo
--           (rò rỉ/biến dạng nứt/độ tụt áp) + môi chất/áp suất/thời gian thử)
--           -> KHÔNG seed vào checklist generic: nhãn "Không/Có" của paper
--              khác hẳn nhãn cứng "Đạt/Không đạt/Không đánh giá" của
--              checklist-item-card.tsx -- nếu ép vào sẽ hiện sai nhãn, dễ
--              gây nhầm lẫn cho kiểm định viên khi điền thực tế. Làm field
--              riêng trong report_metadata.
--   III.5 - Thử vận hành (3 hạng mục, CHỈ có Đạt/Không đạt -- không có "Không
--           đánh giá" trên giấy nhưng vẫn khớp được result CHECK constraint,
--           UI chỉ cần bỏ qua nhãn "Không đánh giá" khi dựng mẫu Word)
--           -> 3 hạng mục NÀY được seed dưới đây (item_order 15-17).
--   III.5.1 - Thử van an toàn (cấu trúc lồng 1/2/2.1-2.6, có dòng chỉ nhập
--           text (ngày tháng, áp suất cài đặt), dòng 2.6 có nhãn riêng "Chấp
--           nhận/Không chấp nhận" khác hẳn Đạt/Không đạt)
--           -> KHÔNG seed, làm field riêng trong report_metadata.
--   IV  - Kết luận và kiến nghị (áp suất làm việc, nhiệt độ, áp suất cài đặt
--         van an toàn... khác hẳn "tầm với/trọng tải" của Thiết bị nâng)
--           -> field riêng trong report_metadata + report-builder module.
--   V   - Thời hạn kiểm định -> field đã có sẵn dùng chung (giống Thiết bị nâng).
--
-- Migration này CHỈ seed 17/48 dòng của mẫu gốc (17 dòng khớp thẳng kiến
-- trúc equipment_checklist_items) -- phần còn lại (mục 1, 2, 4, 5.1, bảng phụ
-- mục 3) sẽ làm bằng field report_metadata + form nhập riêng ở PROMPT sau,
-- theo quyết định của Hải ngày 2026-08-19 (làm đầy đủ cả 5 mục, không tối
-- giản).
--
-- item_code: đánh số LẠI theo TT gốc của TỪNG mục (mục 3 và mục 5 đều tự
-- đánh TT riêng từ 1 trên giấy, không đánh số liên tục như Thiết bị nâng) --
-- item_order vẫn liên tục 1-17 để UI hiển thị đúng thứ tự.
--
-- Không có hạng mục nào trong 17 dòng này có cột "Có/không có" hay ô nhập
-- giá trị số -- has_presence_flag = false, value_fields = '[]' cho tất cả.
--
-- Không có cột "Yêu cầu kỹ thuật/tiêu chuẩn tham chiếu" trong bảng gốc của
-- mục III.3 và III.5 (khác Thiết bị nâng có cột này) -- technical_requirement
-- để NULL cho toàn bộ 17 dòng.
--
-- ⚠️ Migration này KHÔNG idempotent -- CHỈ chạy 1 lần trên SQL Editor. Lỡ
-- chạy 2 lần thì xóa hết rồi chạy lại: delete from
-- equipment_checklist_templates where equipment_type = 'Bình áp lực';
-- (cascade xóa luôn items).
-- =========================================================================

insert into equipment_checklist_templates (equipment_type, name, source_document)
values (
  'Bình áp lực',
  'Biên bản kiểm định kỹ thuật an toàn bình chịu áp lực',
  'QTKĐ I.4:2026/BNV - Quy trình kiểm định bình chịu áp lực, mẫu biên bản'
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
  -- ===== III.3 Kiểm tra kỹ thuật bên ngoài, bên trong =====
  (
    'III.3. Kiểm tra kỹ thuật bên ngoài, bên trong', 1, '1',
    'Thông số kỹ thuật so với lý lịch',
    null, false, '[]'::jsonb
  ),
  (
    'III.3. Kiểm tra kỹ thuật bên ngoài, bên trong', 2, '2',
    'Vị trí lắp đặt (Khoảng cách với tường, giữa các thiết bị)',
    null, false, '[]'::jsonb
  ),
  (
    'III.3. Kiểm tra kỹ thuật bên ngoài, bên trong', 3, '3',
    'Chiếu sáng vận hành',
    null, false, '[]'::jsonb
  ),
  (
    'III.3. Kiểm tra kỹ thuật bên ngoài, bên trong', 4, '4',
    'Sàn, cầu thang thao tác, giá treo, …',
    null, false, '[]'::jsonb
  ),
  (
    'III.3. Kiểm tra kỹ thuật bên ngoài, bên trong', 5, '5',
    'Tiếp địa chống sét, tiếp địa an toàn điện',
    null, false, '[]'::jsonb
  ),
  (
    'III.3. Kiểm tra kỹ thuật bên ngoài, bên trong', 6, '6',
    'Tình trạng bề mặt kim loại các bộ phận chịu áp lực',
    null, false, '[]'::jsonb
  ),
  (
    'III.3. Kiểm tra kỹ thuật bên ngoài, bên trong', 7, '7',
    'Tình trạng mối hàn, các mối nối',
    null, false, '[]'::jsonb
  ),
  (
    'III.3. Kiểm tra kỹ thuật bên ngoài, bên trong', 8, '8',
    'Tình trạng sơn, bảo ôn',
    null, false, '[]'::jsonb
  ),
  (
    'III.3. Kiểm tra kỹ thuật bên ngoài, bên trong', 9, '9',
    'Tình trạng cặn bẩn, han gỉ, ăn mòn bên trong',
    null, false, '[]'::jsonb
  ),
  (
    'III.3. Kiểm tra kỹ thuật bên ngoài, bên trong', 10, '10',
    'Các van và thiết bị phụ trợ',
    null, false, '[]'::jsonb
  ),
  (
    'III.3. Kiểm tra kỹ thuật bên ngoài, bên trong', 11, '11',
    'Van an toàn',
    null, false, '[]'::jsonb
  ),
  (
    'III.3. Kiểm tra kỹ thuật bên ngoài, bên trong', 12, '12',
    'Áp kế',
    null, false, '[]'::jsonb
  ),
  (
    'III.3. Kiểm tra kỹ thuật bên ngoài, bên trong', 13, '13',
    'Đo mức',
    null, false, '[]'::jsonb
  ),
  (
    'III.3. Kiểm tra kỹ thuật bên ngoài, bên trong', 14, '14',
    'Các thiết bị an toàn, tự động khác',
    null, false, '[]'::jsonb
  ),
  -- ===== III.5 Thử vận hành =====
  (
    'III.5. Thử vận hành', 15, '1',
    'Tình trạng làm việc của bình',
    null, false, '[]'::jsonb
  ),
  (
    'III.5. Thử vận hành', 16, '2',
    'Tình trạng làm việc của thiết bị đo lường',
    null, false, '[]'::jsonb
  ),
  (
    'III.5. Thử vận hành', 17, '3',
    'Tình trạng làm việc của thiết bị phụ trợ',
    null, false, '[]'::jsonb
  )
) as v(section, item_order, item_code, title, technical_requirement, has_presence_flag, value_fields)
where t.equipment_type = 'Bình áp lực';
