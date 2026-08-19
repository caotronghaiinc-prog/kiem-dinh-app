-- =========================================================================
-- PROMPT-28 (mentor draft): Seed checklist kiểm định
-- "Thiết bị nâng - Vận thăng nâng hàng"
--
-- Nguồn: mau-bien-ban/KTAT/DU-THAO-QTKD-III.01-Thiet-bi-nang.pdf, Phụ lục 5
-- "BIÊN BẢN KIỂM ĐỊNH VẬN THĂNG NÂNG HÀNG" (trang 74-80/87), mục 2
-- "Kiểm tra bên ngoài, thử không tải, thử tải" -- đủ 3 mục A/B/C, 22 hạng
-- mục. Không seed mục "1- Kiểm tra hồ sơ kỹ thuật" (thang kết quả khác) và
-- dòng trống "Các ghi nhận khác" cuối mục C -- theo đúng quy ước chung.
--
-- Dữ liệu has_presence_flag/value_fields dưới đây đã đối chiếu trực tiếp
-- ảnh chụp 7 trang PDF (74-80) thay vì chỉ dựa vào trích xuất văn bản thô.
--
-- ⚠️ KHÁC HẲN Palăng/Tời -- cấu trúc gần với Cầu trục hơn:
-- (1) CÓ mục "Buồng/cabin điều khiển" (5) -- giống Cầu trục, khác Palăng/
--     Tời (không có mục này).
-- (2) "Đường ray" (14) và "Cáp điện, tủ điều khiển" (15) KHÔNG có cờ
--     Có/không có -- giống Cầu trục, khác Palăng/Tời (2 mục này CÓ cờ).
-- (3) THÊM 1 mục hoàn toàn mới không xuất hiện ở bất kỳ loại nào trước đó:
--     "Kiểm tra điện trở nối đất CHỐNG SÉT" (17, có cờ Có/không có + value
--     field riêng) -- xen giữa "Điện trở nối đất" (16) và "Điện trở cách
--     điện" (18).
-- (4) Mục an toàn (11) có thêm "Bộ hãm an toàn" bên cạnh "Thiết bị khống
--     chế hành trình" và "Bộ khống chế tải trọng nâng".
-- (5) Hạng mục thử tải thứ 3 (22) là "Thử BỘ HÃM AN TOÀN của thiết bị:
--     100% SWL" -- KHÔNG PHẢI "Thử thiết bị khống chế quá tải" như các
--     loại thiết bị nâng khác (đặc thù vận thăng nâng hàng dùng governor/
--     safety catch, không dùng bộ khống chế quá tải kiểu cẩu trục).
--
-- ⚠️ Migration này KHÔNG idempotent -- CHỈ chạy 1 lần trên SQL Editor. Lỡ
-- chạy 2 lần thì xóa hết rồi chạy lại: delete from
-- equipment_checklist_templates where equipment_type = 'Thiết bị nâng -
-- Vận thăng nâng hàng'; (cascade xóa luôn items).
-- =========================================================================

insert into equipment_checklist_templates (equipment_type, name, source_document)
values (
  'Thiết bị nâng - Vận thăng nâng hàng',
  'Biên bản kiểm định vận thăng nâng hàng',
  'Dự thảo QTKĐ III.01 - Thiết bị nâng, Phụ lục 5'
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
  -- ===== A. Kiểm tra bên ngoài =====
  (
    'A. Kiểm tra bên ngoài', 1, '1',
    'Kiểm tra vị trí lắp đặt thiết bị, hệ thống điện, bảng hướng dẫn nội quy sử dụng, các chướng ngại vật cần lưu ý trong suốt quá trình tiến hành kiểm định',
    '1.5.7.1.7 đến 1.5.7.1.11 TCVN 4244: 2005',
    false, '[]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 2, '2',
    'Các khoảng trống từ thiết bị nâng đến các vị trí cố định xung quanh',
    '1.5.2.1 TCVN 4244: 2005',
    false, '[]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 3, '3',
    'Sự phù hợp của các bộ phận, chi tiết và thông số kỹ thuật của thiết bị so với hồ sơ, lý lịch',
    '1.5.1 TCVN 4244: 2005',
    false, '[]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 4, '4',
    'Kết cấu kim loại của thiết bị nâng, các mối hàn, mối ghép đinh tán (nếu có), mối ghép bulông của kết cấu kim loại',
    '1.5.2.2 TCVN 4244: 2005; Phụ lục 6 TCVN 4244:2005',
    false, '[]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 5, '5',
    'Buồng/cabin điều khiển, thang, sàn và che chắn buồng/cabin điều khiển',
    '1.5.2.3; 1.5.2.4 TCVN 4244: 2005',
    true, '[]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 6, '6',
    'Lan can, hành lang và sàn của thiết bị nâng',
    '1.5.2.5 TCVN 4244: 2005',
    true, '[]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 7, '7',
    'Cầu thang và thang dùng để tiếp cận thiết bị nâng',
    '1.5.2.6 TCVN 4244: 2005',
    true, '[]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 8, '8',
    'Thiết bị cơ khí – Dẫn động cáp / xích',
    '1.5.3.1 TCVN 4244: 2005',
    false, '[]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 9, '9',
    'Thiết bị cơ khí – Cụm móc cẩu, puly và các thiết bị chịu tải khác',
    '1.5.3.2 TCVN 4244: 2005, Phụ lục 13A, 13B, 13C, 18A, 18B, 18D, 19A, 19B, 19C, 20A, 20B TCVN 4244: 2005',
    false, '[{"key":"boi_suat","label":"Bội suất cáp/xích nâng tải","unit":null}]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 10, '10',
    'Thiết bị cơ khí – Phanh',
    '1.5.3.3 TCVN 4244: 2005',
    false, '[{"key":"loai_phanh","label":"Loại phanh","unit":null}]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 11, '11',
    'Thiết bị an toàn: Thiết bị khống chế hành trình (nâng hạ) - Bộ hãm an toàn - Bộ khống chế tải trọng nâng (nếu có)',
    '1.5.5 TCVN 4244: 2005',
    false, '[]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 12, '12',
    'Kiểm tra cáp và loại bỏ',
    'TCVN 10837:2015',
    false, '[{"key":"duong_kinh","label":"Đường kính cáp/xích","unit":null}]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 13, '13',
    'Các bộ phận cố định cáp',
    'Đáp ứng yêu cầu của nhà chế tạo hoặc tham khảo Phụ lục 18C, 21 TCVN 4244: 2005',
    false, '[{"key":"loai_co_dinh","label":"Loại cố định cáp","unit":null}]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 14, '14',
    'Đường ray',
    'Phụ lục 5 TCVN 4244: 2005',
    false, '[]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 15, '15',
    'Cáp điện, tủ điều khiển',
    'Dây cáp điện động lực phải theo đúng chủng loại của nhà chế tạo, đầu nối trong tủ điều khiển phải được bắt chặt và đảm bảo các quy định về an toàn điện',
    false, '[]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 16, '16',
    'Kiểm tra điện trở nối đất của thiết bị',
    'không được quá 4,0Ω',
    true, '[{"key":"dien_tro_noi_dat","label":"Điện trở nối đất","unit":"Ω"}]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 17, '17',
    'Kiểm tra điện trở nối đất chống sét của thiết bị',
    'không được quá 10Ω',
    true, '[{"key":"dien_tro_noi_dat_chong_set","label":"Điện trở nối đất chống sét","unit":"Ω"}]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 18, '18',
    'Kiểm tra và đánh giá điện trở cách điện mạch động lực',
    '≥0,25 MΩ với điện áp thử 250 V; ≥1 MΩ với điện áp thử 500V, 1000 V',
    true, '[{"key":"dien_tro_cach_dien","label":"Điện trở cách điện","unit":"MΩ"}]'::jsonb
  ),
  -- ===== B. Kiểm tra kỹ thuật - Thử không tải =====
  (
    'B. Kiểm tra kỹ thuật - Thử không tải', 19, '19',
    'Tiến hành thử không tải các cơ cấu và thiết bị, bao gồm: tất cả các cơ cấu và trang bị điện, các thiết bị an toàn, phanh, hãm và các thiết bị điều khiển, chiếu sáng, tín hiệu, âm hiệu',
    'Kết quả đạt yêu cầu khi các cơ cấu và thiết bị an toàn của thiết bị khi thử hoạt động đúng thông số và tính năng thiết kế. Các phép thử trên được thực hiện không ít hơn 03 (ba) lần.',
    false, '[]'::jsonb
  ),
  -- ===== C. Các chế độ thử tải - Phương pháp thử =====
  (
    'C. Các chế độ thử tải - Phương pháp thử', 20, '20',
    'Thử tĩnh',
    'Kết quả đạt yêu cầu khi trong 10 (mười) phút treo tải, tải không trôi, sau khi hạ tải xuống, các cơ cấu và bộ phận của thiết bị không có vết nứt, không có biến dạng dư hoặc các hư hỏng khác',
    false, '[{"key":"tai_trong_su_dung","label":"Tải trọng sử dụng","unit":"tấn"},{"key":"tai_trong_thu","label":"Tải trọng thử","unit":"tấn"}]'::jsonb
  ),
  (
    'C. Các chế độ thử tải - Phương pháp thử', 21, '21',
    'Thử động',
    'Kết quả đạt yêu cầu khi các cơ cấu và bộ phận của thiết bị hoạt động đúng tính năng thiết kế và các yêu cầu của các Tiêu chuẩn kỹ thuật an toàn hiện hành, không có vết nứt, không có biến dạng hoặc các hư hỏng khác',
    false, '[{"key":"tai_trong_su_dung","label":"Tải trọng sử dụng","unit":"tấn"},{"key":"tai_trong_thu","label":"Tải trọng thử","unit":"tấn"}]'::jsonb
  ),
  (
    'C. Các chế độ thử tải - Phương pháp thử', 22, '22',
    'Thử bộ hãm an toàn của thiết bị: 100% SWL',
    'Kết quả đạt yêu cầu khi trong quá trình thử tải bộ hãm an toàn giữ được bàn nâng không trôi; các cơ cấu, bộ phận của thiết bị không có vết nứt, không có biến dạng vĩnh cửu hoặc hư hỏng khác',
    true, '[{"key":"tai_trong_su_dung","label":"Tải trọng sử dụng","unit":"tấn"},{"key":"tai_trong_thu","label":"Tải trọng thử","unit":"tấn"}]'::jsonb
  )
) as v(section, item_order, item_code, title, technical_requirement, has_presence_flag, value_fields)
where t.equipment_type = 'Thiết bị nâng - Vận thăng nâng hàng';
