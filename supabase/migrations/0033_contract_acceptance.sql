-- =========================================================================
-- PROMPT-61: Xuất Biên bản nghiệm thu hợp đồng (tự sinh từ dữ liệu app) --
-- văn bản xác nhận khối lượng/chất lượng công việc đã hoàn thành theo hợp
-- đồng, dùng làm căn cứ thanh toán (trước giờ soạn qua skill Cowork
-- skil-bb-nt). Bố cục 16 mục của văn bản đã được anh Hải chốt qua thực tế,
-- port nguyên văn vào src/lib/reports/contract-acceptance.ts.
--
-- Phần A: bổ sung cột "unit" (đơn vị tính) còn thiếu cho contract_equipment
-- -- thiết kế PROMPT-59 ban đầu có cột này nhưng bản triển khai thật (đã
-- merge master, migration 0031) không có 4 cột unit_price/quantity/so_tem/
-- ngay_kiem_dinh chỉ). Bổ sung ở đây vì Biên bản nghiệm thu (Phần B) cần
-- hiển thị "Đơn vị tính" từng dòng thiết bị theo đúng mẫu skil-bb-nt.
--
-- Phần B: 8 cột thông tin nghiệm thu trên contracts -- v1 CHỈ hỗ trợ nghiệm
-- thu TOÀN BỘ hợp đồng 1 lần (mỗi hợp đồng 1 bộ thông tin, ghi đè khi cập
-- nhật lại), KHÔNG hỗ trợ nhiều đợt/từng phần (backlog, thiết kế riêng sau
-- nếu cần -- đổi từ cột trên contracts sang bảng contract_acceptances con).
--
-- KHÔNG cần RLS mới: policy contract_equipment_update_admin_or_inspector đã
-- có sẵn từ migration 0031, policy contracts_update_admin_or_inspector đã
-- có sẵn từ migration 0030 -- cả 2 cover đủ cột mới ở đây (RLS áp theo
-- BẢNG, không theo từng cột). KHÔNG cần trigger audit mới: audit_contracts
-- đã gắn trên toàn bảng contracts từ migration 0030, tự động cover cột
-- mới; contract_equipment hiện KHÔNG có audit trigger riêng -- giữ nguyên,
-- không phải phạm vi PROMPT này.
--
-- ⚠️ Migration này KHÔNG idempotent -- CHỈ chạy 1 lần. Lỡ chạy 2 lần thì:
--   alter table contract_equipment drop column if exists unit;
--   alter table contracts
--     drop column if exists acceptance_date,
--     drop column if exists acceptance_location,
--     drop column if exists acceptance_result,
--     drop column if exists acceptance_note,
--     drop column if exists representative_a_name,
--     drop column if exists representative_a_title,
--     drop column if exists acceptance_copies_note,
--     drop column if exists acceptance_file_path;
-- =========================================================================

alter table contract_equipment
  add column unit text;

alter table contracts
  add column acceptance_date date,
  add column acceptance_location text,
  add column acceptance_result text check (acceptance_result in ('dat', 'co_van_de')),
  add column acceptance_note text,
  add column representative_a_name text,
  add column representative_a_title text,
  add column acceptance_copies_note text,
  add column acceptance_file_path text;
