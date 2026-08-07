-- =========================================================================
-- Chặn trùng mã số thuế (tax_code) ở tầng DB — lớp bảo vệ cuối cùng, sau
-- validate phía client trong form thêm/sửa khách hàng. Cùng tinh thần với
-- RLS: dù UI đã kiểm tra, vẫn cần 1 ràng buộc cứng ở DB để không thể lách
-- qua (vd 2 người submit gần như đồng thời, hoặc thao tác trực tiếp qua
-- SQL Editor/API).
-- =========================================================================
-- Partial unique index: chỉ áp dụng cho tax_code có giá trị thật, bỏ qua
-- NULL (và chuỗi rỗng, phòng trường hợp dữ liệu cũ/nhập tay có '' thay vì
-- NULL) — vì tax_code không bắt buộc, nhiều khách hàng có thể cùng không
-- có mã số thuế.
create unique index if not exists customers_tax_code_unique_idx
  on customers (tax_code)
  where tax_code is not null and tax_code <> '';
