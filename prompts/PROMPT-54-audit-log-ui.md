# PROMPT-54: Trang "Nhật ký thay đổi" (Audit Log) cho Admin

## Bối cảnh

Migration `supabase/migrations/0028_audit_log.sql` (mentor đã viết, chờ anh Hải
chạy) tạo bảng `audit_log` ghi lại tự động mọi thay đổi (thêm/sửa/xóa) trên 3
bảng `equipment`, `customers`, `inspection_history` qua trigger — KHÔNG cần code
ứng dụng tự ghi log, dữ liệu đã có sẵn trong DB ngay khi migration chạy xong. Đọc
kỹ phần comment trong migration trước khi làm, đặc biệt cấu trúc bảng:

```
audit_log: id, table_name, record_id, action ('insert'/'update'/'delete'),
           changed_by (FK profiles, có thể null), changed_at, old_data (jsonb),
           new_data (jsonb)
```

PROMPT này CHỈ xây UI xem lại log — không đụng gì đến trigger/logic ghi log.

## Việc cần làm

### 1. Trang `/audit-log`

- `src/app/(dashboard)/audit-log/page.tsx` — Server Component, `requireRole(["admin"])`
  ở đầu (mirror cách các trang khác đang chặn quyền, xem
  `equipment/[id]/inspect/page.tsx` làm ví dụ).
- Query params cho filter (giống cách `customers/page.tsx` xử lý filter/phân
  trang qua `searchParams`): `table` (equipment/customers/inspection_history/tất
  cả), `action` (insert/update/delete/tất cả), `changed_by` (uuid user, tất cả),
  `from`/`to` (ngày, tùy chọn), `page`.
- Query `audit_log` kèm embed `changed_by:profiles(full_name)` (chỉ 1 FK tới
  profiles trên bảng này, không bị lỗi PGRST201 ambiguous như
  `inspection_tool_loans`/`inspection_edit_requests` — không cần cú pháp
  `!fkey_name`), sắp xếp `changed_at desc`, phân trang (mirror
  `customers/pagination-controls.tsx` — copy sang thư mục `audit-log/` theo đúng
  cách các module khác đang làm, không có component dùng chung sẵn).
- Dropdown "Người thực hiện": fetch danh sách `profiles` (chỉ cần
  `id, full_name`) để làm option — công ty ít người, không cần lazy-load/search.

### 2. Hiển thị danh sách

Mỗi dòng: thời gian (`changed_at`, định dạng `toLocaleString("vi-VN")`), loại đối
tượng (dịch `table_name` sang tiếng Việt: `equipment` → "Thiết bị", `customers` →
"Khách hàng", `inspection_history` → "Lịch sử kiểm định"), hành động (dịch
`action`: `insert` → "Thêm mới", `update` → "Cập nhật", `delete` → "Xóa", dùng
màu badge khác nhau — vd xanh/vàng/đỏ), người thực hiện (`changed_by`'s
`full_name`, hoặc "Hệ thống" nếu null), và 1 nhãn nhận diện bản ghi rút ra từ
`old_data`/`new_data` (dùng `new_data ?? old_data`, viết 1 hàm nhỏ
`getRecordLabel(tableName, data)`:
- `equipment`/`customers`: `data.code` (cả 2 bảng đều có cột `code`).
- `inspection_history`: `"KĐ ngày " + formatDate(data.inspection_date)`, kèm
  link phụ "Xem thiết bị" trỏ `/equipment/${data.equipment_id}` (field
  `equipment_id` luôn có trong `old_data`/`new_data` vì là cột NOT NULL của bảng
  này).

### 3. Xem chi tiết thay đổi

Mỗi dòng có nút "Xem chi tiết" mở `Dialog` (hoặc expand inline, tùy anh thấy gọn
hơn) hiển thị:
- `action = 'insert'`: liệt kê toàn bộ field trong `new_data` dạng `key: value`
  (sắp xếp theo tên field, bỏ qua field `null`/rỗng cho gọn — không bắt buộc dịch
  tên field sang tiếng Việt, giữ nguyên tên cột DB là đủ cho phạm vi công cụ nội
  bộ này).
- `action = 'delete'`: tương tự nhưng từ `old_data`.
- `action = 'update'`: CHỈ liệt kê những field có giá trị KHÁC nhau giữa
  `old_data` và `new_data` (so sánh `JSON.stringify` từng field hoặc deep-equal
  đơn giản), hiển thị dạng `field: giá trị cũ → giá trị mới`. Nếu không field nào
  đổi (hiếm, nhưng có thể xảy ra nếu code chỗ khác `update` mà không đổi gì) thì
  ghi "Không có thay đổi nội dung".

### 4. Thêm nav link cho Admin

Trong `src/app/(dashboard)/layout.tsx`, `NAV_LINKS` hiện là mảng tĩnh — đổi thành
dựng động theo `profile.role` (thêm mục "Nhật ký thay đổi" trỏ `/audit-log` CHỈ
khi `profile?.role === "admin"`, giữ nguyên 4 mục hiện có cho mọi role). Nhớ áp
dụng cho cả nhánh desktop (`<nav>`) lẫn `<MobileNav navLinks={NAV_LINKS} .../>`
(dùng chung 1 mảng nên tự động khớp cả 2).

## Không làm trong phạm vi này

- KHÔNG cần dịch tên field DB sang tiếng Việt trong phần "Xem chi tiết" (mục 3).
- KHÔNG cần export Excel/PDF danh sách log — chỉ xem trên UI.
- KHÔNG mở rộng audit sang bảng khác ngoài 3 bảng đã có trigger sẵn trong
  migration 0028.

## Sau khi xong

Test tay bằng tài khoản admin: sửa 1 thiết bị (đổi tên/hạn kiểm định), xóa 1
khách hàng test, sửa 1 bản ghi kiểm định (dùng chính tính năng PROMPT-50 vừa
xong) → vào `/audit-log` xác nhận cả 3 hành động hiện đúng, đúng người thực hiện,
"Xem chi tiết" hiện đúng field đã đổi. Đăng nhập bằng tài khoản inspector xác
nhận: không thấy link "Nhật ký thay đổi" trên nav, và tự gõ URL `/audit-log` bị
chặn (`requireRole` redirect/unauthorized). `npx tsc --noEmit` sạch. Báo cáo lại
file đã sửa/thêm — CHƯA commit/merge.
