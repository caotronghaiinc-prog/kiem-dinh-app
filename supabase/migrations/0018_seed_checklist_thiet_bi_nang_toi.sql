-- =========================================================================
-- PROMPT-26 (mentor draft): Seed checklist kiểm định "Thiết bị nâng - Tời"
-- (gộp chung Tời điện + Tời kéo tay, đúng 1 mẫu biên bản duy nhất trong
-- nguồn -- không tách 2 loại riêng, giống cách làm với Palăng)
--
-- Nguồn: mau-bien-ban/KTAT/DU-THAO-QTKD-III.01-Thiet-bi-nang.pdf, Phụ lục 4
-- "BIÊN BẢN KIỂM ĐỊNH TỜI ĐIỆN, TỜI KÉO TAY" (trang 67-73/87), mục 2
-- "Kiểm tra bên ngoài, thử không tải, thử tải" -- đủ 3 mục A/B/C, 20 hạng
-- mục -- CẤU TRÚC CHECKLIST GIỐNG HỆT Palăng (migration 0017): không có
-- mục "Buồng/cabin điều khiển", "Đường ray" (13) và "Cáp điện, tủ điều
-- khiển" (14) có cờ Có/không có. Không seed mục "1- Kiểm tra hồ sơ kỹ
-- thuật" (thang kết quả khác) và dòng trống "Các ghi nhận khác" cuối mục C
-- -- theo đúng quy ước đã áp dụng ở Cầu trục/Cần trục/Palăng.
--
-- Dữ liệu has_presence_flag/value_fields dưới đây đã đối chiếu trực tiếp
-- ảnh chụp 7 trang PDF (67-73) thay vì chỉ dựa vào trích xuất văn bản thô.
--
-- Khác Palăng ở ĐÚNG 1 điểm: hạng mục 8 ghi "Bội suất cáp/xích nâng/kéo
-- tải" (không phải "nâng tải") -- vì tời có thể kéo ngang, không chỉ nâng
-- thẳng đứng như palăng; các hạng mục còn lại giống hệt Palăng cả về nội
-- dung lẫn has_presence_flag/value_fields.
--
-- ⚠️ Ghi chú phát hiện: trang 72 PDF đánh số mục ảnh là "4- Thu thập hình
-- ảnh" (thay vì "3-" như Cầu trục/Cần trục/Palăng) nhưng không có mục "3-"
-- nào khác xuất hiện giữa checklist và mục ảnh -- nhiều khả năng lỗi đánh
-- số trong bản dự thảo gốc, không ảnh hưởng nội dung checklist seed dưới
-- đây (chỉ ảnh hưởng heading khi dựng mẫu Word, sẽ dùng "3-" cho nhất quán
-- với các loại khác).
--
-- ⚠️ Migration này KHÔNG idempotent -- CHỈ chạy 1 lần trên SQL Editor. Lỡ
-- chạy 2 lần thì xóa hết rồi chạy lại: delete from
-- equipment_checklist_templates where equipment_type = 'Thiết bị nâng -
-- Tời'; (cascade xóa luôn items).
-- =========================================================================

insert into equipment_checklist_templates (equipment_type, name, source_document)
values (
  'Thiết bị nâng - Tời',
  'Biên bản kiểm định tời điện, tời kéo tay',
  'Dự thảo QTKĐ III.01 - Thiết bị nâng, Phụ lục 4'
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
    'Lan can, hành lang và sàn của thiết bị nâng',
    '1.5.2.5 TCVN 4244: 2005',
    true, '[]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 6, '6',
    'Cầu thang và thang dùng để tiếp cận thiết bị nâng',
    '1.5.2.6 TCVN 4244: 2005',
    true, '[]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 7, '7',
    'Thiết bị cơ khí – Dẫn động cáp / xích',
    '1.5.3.1 TCVN 4244: 2005',
    false, '[]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 8, '8',
    'Thiết bị cơ khí – Cụm móc cẩu, puly và các thiết bị chịu tải khác',
    '1.5.3.2 TCVN 4244: 2005, Phụ lục 13A, 13B, 13C, 18A, 18B, 18D, 19A, 19B, 19C, 20A, 20B TCVN 4244: 2005',
    false, '[{"key":"boi_suat","label":"Bội suất cáp/xích nâng/kéo tải","unit":null}]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 9, '9',
    'Thiết bị cơ khí – Phanh',
    '1.5.3.3 TCVN 4244: 2005',
    false, '[{"key":"loai_phanh","label":"Loại phanh","unit":null}]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 10, '10',
    'Thiết bị an toàn: Thiết bị khống chế hành trình (nâng hạ, di chuyển) - Bộ khống chế tải trọng nâng (nếu có)',
    '1.5.5 TCVN 4244: 2005',
    false, '[]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 11, '11',
    'Kiểm tra cáp và loại bỏ',
    'TCVN 10837:2015',
    false, '[{"key":"duong_kinh","label":"Đường kính cáp/xích","unit":null}]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 12, '12',
    'Các bộ phận cố định cáp/xích',
    'Đáp ứng yêu cầu của nhà chế tạo hoặc tham khảo Phụ lục 18C, 21 TCVN 4244: 2005',
    false, '[{"key":"loai_co_dinh","label":"Loại cố định cáp/xích","unit":null}]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 13, '13',
    'Đường ray',
    'Phụ lục 5 TCVN 4244: 2005',
    true, '[]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 14, '14',
    'Cáp điện, tủ điều khiển',
    'Dây cáp điện động lực phải theo đúng chủng loại của nhà chế tạo, đầu nối trong tủ điều khiển phải được bắt chặt và đảm bảo các quy định về an toàn điện',
    true, '[]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 15, '15',
    'Kiểm tra điện trở nối đất của thiết bị',
    'không được quá 4,0Ω',
    true, '[{"key":"dien_tro_noi_dat","label":"Điện trở nối đất","unit":"Ω"}]'::jsonb
  ),
  (
    'A. Kiểm tra bên ngoài', 16, '16',
    'Kiểm tra và đánh giá điện trở cách điện mạch động lực',
    '≥0,25 MΩ với điện áp thử 250 V; ≥1 MΩ với điện áp thử 500V, 1000 V',
    true, '[{"key":"dien_tro_cach_dien","label":"Điện trở cách điện","unit":"MΩ"}]'::jsonb
  ),
  -- ===== B. Kiểm tra kỹ thuật - Thử không tải =====
  (
    'B. Kiểm tra kỹ thuật - Thử không tải', 17, '17',
    'Tiến hành thử không tải các cơ cấu và thiết bị, bao gồm: tất cả các cơ cấu và trang bị điện, các thiết bị an toàn, phanh, hãm và các thiết bị điều khiển, chiếu sáng, tín hiệu, âm hiệu',
    'Kết quả đạt yêu cầu khi các cơ cấu và thiết bị an toàn của thiết bị khi thử hoạt động đúng thông số và tính năng thiết kế. Các phép thử trên được thực hiện không ít hơn 03 (ba) lần.',
    false, '[]'::jsonb
  ),
  -- ===== C. Các chế độ thử tải - Phương pháp thử =====
  (
    'C. Các chế độ thử tải - Phương pháp thử', 18, '18',
    'Thử tĩnh',
    'Kết quả đạt yêu cầu khi trong 10 (mười) phút treo tải, tải không trôi, sau khi hạ tải xuống, các cơ cấu và bộ phận của thiết bị không có vết nứt, không có biến dạng dư hoặc các hư hỏng khác',
    false, '[{"key":"tai_trong_su_dung","label":"Tải trọng sử dụng","unit":"tấn"},{"key":"tai_trong_thu","label":"Tải trọng thử","unit":"tấn"}]'::jsonb
  ),
  (
    'C. Các chế độ thử tải - Phương pháp thử', 19, '19',
    'Thử động',
    'Kết quả đạt yêu cầu khi các cơ cấu và bộ phận của thiết bị hoạt động đúng tính năng thiết kế và các yêu cầu của các Tiêu chuẩn kỹ thuật an toàn hiện hành, không có vết nứt, không có biến dạng hoặc các hư hỏng khác',
    false, '[{"key":"tai_trong_su_dung","label":"Tải trọng sử dụng","unit":"tấn"},{"key":"tai_trong_thu","label":"Tải trọng thử","unit":"tấn"}]'::jsonb
  ),
  (
    'C. Các chế độ thử tải - Phương pháp thử', 20, '20',
    'Thử thiết bị khống chế quá tải',
    'Thiết bị khống chế quá tải phải ngăn chặn được các cơ cấu tiếp tục hoạt động vượt quá giới hạn an toàn của thiết bị và chỉ cho phép các cơ cấu đó hoạt động theo chiều ngược lại để đưa tải về trạng thái an toàn hơn',
    true, '[{"key":"tai_trong_su_dung","label":"Tải trọng sử dụng","unit":"tấn"},{"key":"tai_trong_thu","label":"Tải trọng thử","unit":"tấn"}]'::jsonb
  )
) as v(section, item_order, item_code, title, technical_requirement, has_presence_flag, value_fields)
where t.equipment_type = 'Thiết bị nâng - Tời';
