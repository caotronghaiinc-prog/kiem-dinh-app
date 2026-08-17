-- =========================================================================
-- PROMPT-20: Thông số kỹ thuật có cấu trúc cho pilot "Thiết bị nâng - Cầu trục"
--
-- Cột spec_values (jsonb) lưu các trường thông số kỹ thuật có cấu trúc theo
-- loại thiết bị (xem src/lib/equipment/spec-fields.ts) -- chuẩn bị dữ liệu
-- cho PROMPT-21 (xuất biên bản Word tự động điền). Loại thiết bị nào chưa
-- định nghĩa field thì vẫn dùng cột specifications (text tự do) như cũ,
-- không ảnh hưởng.
--
-- Không cần policy RLS mới -- dùng chung policy hiện có của bảng equipment
-- (migration 0002/0006).
-- =========================================================================

alter table equipment
  add column spec_values jsonb not null default '{}';
