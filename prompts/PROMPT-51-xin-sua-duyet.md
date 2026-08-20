# PROMPT-51: Luồng "Xin sửa" (inspector) + Duyệt/Từ chối (admin)

## Bối cảnh

Tiếp theo PROMPT-50 (đã xây xong khả năng sửa bản ghi kiểm định, ẩn nút "Sửa" với
inspector khi bản ghi đã khóa). PROMPT này xây nốt phần còn thiếu: khi bản ghi đã
khóa, inspector cần cách "xin mở khóa" thay vì bó tay, và Admin cần chỗ duyệt/từ
chối. Dùng bảng `inspection_edit_requests` + trigger tự mở khóa khi duyệt — đã có
sẵn trong migration `supabase/migrations/0027_inspection_lock_and_edit_requests.sql`
(chờ Hải chạy nếu PROMPT-50 chưa chạy migration này). Đọc kỹ file migration đó
trước khi làm — đặc biệt phần RLS (chỉ admin update được bảng này, insert phải tự
gán `requested_by = auth.uid()` và `status = 'pending'`) và unique index chỉ cho 1
yêu cầu `pending` mỗi bản ghi.

## Việc cần làm

### 1. Nút "Xin sửa" cho inspector trên bản ghi đã khóa

Trong `inspection-history-section.tsx`, chỗ đang ẩn nút "Sửa" khi
`role === "inspector" && item.is_locked === true` (từ PROMPT-50): thay bằng 1
trong 2 trạng thái:

- Chưa có yêu cầu nào đang chờ cho bản ghi này → nút "Xin sửa" (outline, cỡ nhỏ,
  giống style `ExportReportDialog`). Bấm mở dialog nhỏ: 1 textarea "Lý do cần
  sửa" (bắt buộc, dùng `zod` như các form khác trong repo), nút "Gửi yêu cầu".
  Submit: insert vào `inspection_edit_requests`
  (`inspection_history_id`, `requested_by: user.id`, `reason`, để `status` dùng
  default `'pending'` của DB, không gửi field này lên). Toast xác nhận đã gửi.
- Đã có yêu cầu `pending` cho bản ghi này (do chính mình hoặc do dữ liệu đã có) →
  hiện badge/text tĩnh "Đang chờ Admin duyệt" thay vì nút (không cho gửi trùng —
  unique index DB cũng chặn nhưng nên chặn từ UI cho gọn, tránh lỗi 409 khó hiểu
  với người dùng).
- Cách lấy dữ liệu yêu cầu pending: fetch kèm theo `inspection_history` trong
  `page.tsx` của trang chi tiết thiết bị (join hoặc query riêng theo danh sách
  `inspection_history_id`), thêm field vào `InspectionHistoryDetailRow`, ví dụ
  `pending_edit_request: { id: string; reason: string; requested_by_name: string | null; created_at: string } | null`.

### 2. UI duyệt/từ chối cho admin

Khi `role === "admin"` VÀ bản ghi có `pending_edit_request` khác null: hiện 1
banner/card nhỏ ngay trong dòng lịch sử đó (hoặc mở rộng dòng khi bấm) với nội
dung: người gửi, lý do, thời gian gửi, 2 nút "Duyệt" / "Từ chối".

- "Duyệt": update `inspection_edit_requests` set
  `status = 'approved', reviewed_by = user.id, reviewed_at = now()` theo `id` yêu
  cầu — trigger DB tự động set `inspection_history.is_locked = false` (không cần
  tự làm ở client). Sau khi duyệt, nút "Sửa" bình thường sẽ tự hiện lại (do
  `is_locked` đổi) — cần revalidate/refresh lại dữ liệu trang (dùng
  `router.refresh()` của Next.js hoặc tương đương đang dùng trong repo cho các
  hành động khác, xem cách `loan-dialog.tsx` bên `/tools` đang làm sau khi
  submit để nhất quán).
- "Từ chối": mở thêm 1 ô nhập lý do từ chối (`admin_note`, không bắt buộc), update
  `status = 'rejected', admin_note, reviewed_by, reviewed_at`. Bản ghi VẪN khóa
  (trigger chỉ xử lý nhánh `approved`). Inspector khi thấy trạng thái `rejected`
  (không còn `pending`) thì nút "Xin sửa" hiện trở lại bình thường (được gửi yêu
  cầu mới) — không cần lưu trạng thái "đã bị từ chối" hiển thị vĩnh viễn, chỉ cần
  không còn `pending` là coi như "chưa có yêu cầu" cho UI ở bước 1.

### 3. Widget dashboard cho Admin (tùy chọn nhưng nên làm — tăng khả năng phát hiện)

Mirror đúng cấu trúc `calibration-alert-widget.tsx` (đã có trong
`src/app/(dashboard)/dashboard/`): 1 widget mới, ví dụ
`edit-request-alert-widget.tsx`, chỉ hiện cho role `admin` (dùng `RoleGate` hoặc
cách đang check role ở dashboard), liệt kê tối đa 5 yêu cầu `pending` mới nhất
(join thêm tên thiết bị + mã thiết bị để hiện link `/equipment/${equipment_id}`),
kèm số đếm tổng. Nếu 0 yêu cầu đang chờ → có thể ẩn hẳn widget (giống cách
calibration-alert-widget xử lý khi không có cảnh báo nào, xem code file đó để
theo đúng quy ước).

## Không làm trong phạm vi này

- KHÔNG cần trang riêng liệt kê toàn bộ lịch sử yêu cầu (approved/rejected) — chỉ
  cần xử lý đúng luồng pending → approved/rejected như trên.
- KHÔNG cần thông báo qua email/Zalo khi có yêu cầu mới — ngoài phạm vi.

## Sau khi xong

Test tay bằng 2 tài khoản thật (admin + inspector, đã có sẵn:
`caotronghai.inc@gmail.com` / `caotronghai.incosaf@gmail.com`): inspector xin sửa
1 bản ghi đã khóa → admin thấy yêu cầu, thử "Từ chối" trước (xác nhận vẫn khóa,
inspector gửi lại được yêu cầu mới) → gửi lại → admin "Duyệt" (xác nhận
`is_locked` chuyển `false`, inspector sửa được bình thường bằng form từ
PROMPT-50). `npx tsc --noEmit` sạch. Báo cáo lại file đã sửa/thêm — CHƯA
commit/merge (mentor sẽ viết PROMPT commit/merge riêng sau khi review toàn bộ
PROMPT-49/50/51 cùng lúc, giống cách đã làm với PROMPT-45/46/47).
