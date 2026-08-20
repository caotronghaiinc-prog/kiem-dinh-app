-- =========================================================================
-- PROMPT-45 (mentor draft, bổ sung): 3 dụng cụ đo THẬT phát hiện qua giấy
-- chứng nhận hiệu chuẩn do anh Hải cung cấp (folder
-- giay-chung-nhan-hieu-chuan/) nhưng CHƯA có trong danh mục gốc 48 dòng
-- (migration 0024) -- công ty có sở hữu, chỉ thiếu sót khi lập danh mục
-- ban đầu. Anh Hải đã xác nhận thêm mới (không phải thuê ngoài).
--
-- Nguồn: 3 giấy chứng nhận hiệu chuẩn/kết quả đo kiểm tra do Công ty CP
-- Dịch vụ Kiểm định Hiệu chuẩn Đo lường Miền Trung cấp ngày 22/07/2026,
-- cùng hạn hiệu lực 21/07/2027 cho cả 3.
--
-- code tiếp nối DC-049..DC-051 (danh mục gốc dừng ở DC-048), set tường
-- minh giống cách seed migration 0024 (không dựa trigger count(*) cho
-- insert nhiều dòng cùng lúc).
--
-- ⚠️ Migration này KHÔNG idempotent -- CHỈ chạy 1 lần. Lỡ chạy 2 lần thì
-- xóa rồi chạy lại:
--   delete from inspection_tools where code in ('DC-049','DC-050','DC-051');
-- =========================================================================

insert into inspection_tools (
  code, name, model, serial_number, calibration_due_date,
  calibration_not_applicable, note
)
values
  (
    'DC-049',
    'Máy siêu âm bê tông',
    'Matest C369N',
    'C369N/BE/0061',
    '2027-07-21',
    false,
    'Bổ sung từ giấy chứng nhận kết quả đo kiểm tra số 3593E.26/ĐLMT (Công ty CP Dịch vụ Kiểm định Hiệu chuẩn Đo lường Miền Trung, cấp 22/07/2026) -- không có trong danh mục gốc 48 dòng, phát hiện qua rà soát giấy chứng nhận hiệu chuẩn.'
  ),
  (
    'DC-050',
    'Máy siêu âm định vị cốt thép',
    'BJZJ-R63',
    'ZD25321434',
    '2027-07-21',
    false,
    'Bổ sung từ giấy chứng nhận kết quả đo kiểm tra số 3594E.26/ĐLMT (Công ty CP Dịch vụ Kiểm định Hiệu chuẩn Đo lường Miền Trung, cấp 22/07/2026) -- không có trong danh mục gốc 48 dòng, phát hiện qua rà soát giấy chứng nhận hiệu chuẩn.'
  ),
  (
    'DC-051',
    'Thiết bị thử cường độ bê tông bằng phương pháp bật nảy',
    'ZC3-A',
    '007598',
    '2027-07-21',
    false,
    'Bổ sung từ giấy chứng nhận hiệu chuẩn số 3592E.26/ĐLMT (Công ty CP Dịch vụ Kiểm định Hiệu chuẩn Đo lường Miền Trung, cấp 22/07/2026) -- không có trong danh mục gốc 48 dòng, phát hiện qua rà soát giấy chứng nhận hiệu chuẩn.'
  );
