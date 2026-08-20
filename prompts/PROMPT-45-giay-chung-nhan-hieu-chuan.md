# PROMPT-45: Lịch sử hiệu chuẩn + upload giấy chứng nhận cho dụng cụ đo

## Bối cảnh

Anh Hải đã dùng thử module "Dụng cụ đo" (`/tools`, PROMPT-43/44) và yêu cầu thêm
(nguyên văn): *"bổ sung thêm phần Giấy chứng nhận hiệu chuẩn và up file chứng
nhận lên cho từng thiết bị để khi có người kiểm tra có thể show ra"*.

## Đã có sẵn (KHÔNG cần làm lại)

Migration `supabase/migrations/0025_inspection_tool_calibrations.sql` đã viết sẵn
(mentor draft) — anh Hải sẽ chạy trên SQL Editor TRƯỚC khi bạn code phần này. Đọc
file đó trước, tóm tắt:

- Bảng mới **`inspection_tool_calibrations`** = LỊCH SỬ từng lần hiệu chuẩn (KHÔNG
  phải chỉ 1 file duy nhất) — cột: `id, tool_id (FK inspection_tools), cert_no,
  issued_date, due_date, issuer, file_path, note, created_by, created_at`.
- Sau khi INSERT 1 dòng có `due_date`, **trigger tự đồng bộ**
  `inspection_tools.calibration_due_date` + `calibration_cert_no` +
  `calibration_not_applicable = false` — nghĩa là danh sách `/tools`, filter hạn
  hiệu chuẩn, widget dashboard (đã làm ở PROMPT-43) **KHÔNG cần sửa gì** — chúng
  đọc thẳng 2 cột đó trên `inspection_tools` như cũ, tự động khớp sau khi thêm
  lần hiệu chuẩn mới.
- File lưu trong **CÙNG bucket Storage `inspection-files`** đã có sẵn (tạo ở
  migration 0009, dùng chung cho `inspection_history.attachment_url`) — KHÔNG
  tạo bucket mới, KHÔNG cần RLS storage mới (chính sách hiện có không phân biệt
  theo path/prefix trong bucket, chỉ theo `bucket_id` + role). Quy ước path MỚI
  cho phần này: `tool-certs/<tool_id>/<uuid>.<ext>`.
- RLS bảng mới mirror đúng `inspection_tools`/`inspection_tool_loans`: select =
  authenticated; insert/update = admin+inspector; delete = admin.
- `tool-form.tsx` (đã có từ PROMPT-43) VẪN giữ nguyên 2 field `calibration_due_date`
  / `calibration_cert_no` cho phép sửa tay trực tiếp (không khóa lại) — dùng cho
  sửa nhanh/khắc phục dữ liệu gốc (5 dòng seed đang thiếu chứng từ, xem note
  trong migration 0024). Việc thêm lần hiệu chuẩn có file ở PROMPT này là luồng
  CHÍNH thức, KHÔNG bắt buộc phải sửa/khóa form cũ.

## Mirror các file này (đọc trước khi viết code — pattern GẦN NHẤT cho tính năng
## upload file + lịch sử, đã có sẵn cho `equipment`)

- `src/app/(dashboard)/equipment/[id]/add-inspection-dialog.tsx` — pattern CHÍNH
  cần mirror: Dialog + react-hook-form + upload file lên Storage TRƯỚC, insert
  bản ghi kèm path SAU, xử lý lỗi upload riêng khỏi lỗi insert.
- `src/app/(dashboard)/equipment/[id]/inspection-history-section.tsx` — pattern
  section bảng lịch sử + nút mở dialog.
- `src/app/(dashboard)/equipment/[id]/attachment-link.tsx` — component link mở
  file qua signed URL (10 phút) — COPY sang `tools/[id]/attachment-link.tsx`
  (đừng import thẳng từ `equipment/`, giữ 2 tính năng tách biệt như PROMPT-43 đã
  làm), chỉ đổi nếu cần, logic y hệt (vẫn dùng chung `ATTACHMENT_BUCKET`).
- `src/lib/inspection/form-schema.ts` — CÁC HẰNG SỐ dùng chung, KHÔNG phải
  code riêng của `equipment`, import thẳng từ đây (không copy):
  `ATTACHMENT_BUCKET`, `MAX_ATTACHMENT_SIZE_BYTES`,
  `ALLOWED_ATTACHMENT_EXTENSIONS`, `validateAttachmentFile()`.

## Việc cần làm

### 1. `src/lib/tools/calibration-form-schema.ts`

Zod schema `calibrationFormSchema`: `due_date` bắt buộc ("Vui lòng nhập hạn hiệu
lực."), `cert_no`/`issued_date`/`issuer`/`note` optional. Export
`CALIBRATION_EMPTY_VALUES` (mirror `LOAN_EMPTY_VALUES` ở
`loan-form-schema.ts`, `due_date` để trống — KHÔNG default hôm nay vì đây là
ngày hết hạn tương lai, khác `borrowed_at`).

### 2. `src/app/(dashboard)/tools/[id]/attachment-link.tsx`

Copy nguyên `equipment/[id]/attachment-link.tsx`, import `ATTACHMENT_BUCKET` từ
`@/lib/inspection/form-schema` (giữ nguyên logic signed URL 10 phút).

### 3. `src/app/(dashboard)/tools/[id]/calibration-dialog.tsx`

Mirror `add-inspection-dialog.tsx` cấu trúc file upload + form:

- Field: Số giấy chứng nhận (`cert_no`), Ngày cấp (`issued_date`, type date), Hạn
  hiệu lực (`due_date`, type date, bắt buộc), Đơn vị hiệu chuẩn/cấp giấy
  (`issuer`), Ghi chú (`note`), File đính kèm (input file, PDF/JPG/PNG tối đa
  10MB, dùng `validateAttachmentFile`/`ALLOWED_ATTACHMENT_EXTENSIONS` import từ
  `@/lib/inspection/form-schema` — KHÔNG viết lại validate riêng).
- Submit: nếu có file -> upload lên bucket `ATTACHMENT_BUCKET`, path
  `tool-certs/${toolId}/${crypto.randomUUID()}${ext}` (mirror cách
  `add-inspection-dialog.tsx` build path `${equipmentId}/${crypto.randomUUID()}${ext}`,
  chỉ thêm tiền tố `tool-certs/`) -> nếu upload lỗi, toast lỗi, DỪNG (không
  insert bản ghi). Sau đó insert vào `inspection_tool_calibrations`: `tool_id,
  cert_no: value||null, issued_date: value||null, due_date, issuer: value||null,
  file_path: uploadedPath||null, note: value||null, created_by: user.id`.
- Toast "Đã thêm lần hiệu chuẩn", đóng dialog, `router.refresh()` (trang chi
  tiết sẽ tự đọc lại `inspection_tools.calibration_due_date` mới do trigger đã
  đồng bộ -- badge hạn hiệu chuẩn ở header cũng tự cập nhật).

### 4. `src/app/(dashboard)/tools/[id]/calibration-history-section.tsx`

Mirror `inspection-history-section.tsx` (bản đơn giản, không cần logic phức tạp
như bên đó — không có checklist/inspect riêng, chỉ 1 loại bản ghi):

- Header "Lịch sử hiệu chuẩn" + nút "+ Thêm lần hiệu chuẩn" mở
  `CalibrationDialog` (RoleGate admin+inspector).
- Bảng (+ card mobile, mirror pattern `loan-history-section.tsx` đã làm ở
  PROMPT-43): cột Ngày cấp | Số giấy | Đơn vị cấp | Hạn hiệu lực | File (
  `<AttachmentLink path={...} />` nếu có `file_path`, else "—") | Ghi chú.
  Sắp xếp mới nhất trước (theo `created_at desc`, hoặc `due_date desc` đều được
  vì luôn thêm lần mới = hạn xa hơn).
- Rỗng: "Chưa có lần hiệu chuẩn nào được ghi nhận."

### 5. `src/app/(dashboard)/tools/[id]/page.tsx` — chỉnh sửa (file đã có từ PROMPT-43)

- Thêm 1 fetch song song trong `Promise.all` hiện có: `inspection_tool_calibrations`
  theo `tool_id = params.id`, `order("created_at", { ascending: false })`, chọn
  đủ cột cho `CalibrationHistorySection`.
- Render `<CalibrationHistorySection toolId={tool.id} calibrations={...}
  canEdit={canEdit} />` — đặt NGAY SAU section "Thông tin chung", TRƯỚC
  "Lịch sử mượn/trả" (vì hạn hiệu chuẩn liên quan trực tiếp badge ở header, hợp
  lý đặt gần trên).
- KHÔNG sửa section "Thông tin chung" hay "Lịch sử mượn/trả" hiện có.

### 6. Type — thêm vào `src/app/(dashboard)/tools/types.ts` (chỉnh sửa, không tạo file mới)

```ts
export interface CalibrationRow {
  id: string;
  cert_no: string | null;
  issued_date: string | null;
  due_date: string | null;
  issuer: string | null;
  file_path: string | null;
  note: string | null;
}
```

## KHÔNG làm trong PROMPT này

- KHÔNG sửa `tool-form.tsx`/`lib/tools/form-schema.ts` — giữ nguyên 2 field sửa
  tay `calibration_due_date`/`calibration_cert_no` như đã giải thích ở trên.
- KHÔNG đụng `equipment/`, `lib/reports/`, `lib/equipment/` — chỉ ĐỌC (import
  hằng số) từ `lib/inspection/form-schema.ts`, không sửa file đó.
- KHÔNG cho sửa/xóa 1 lần hiệu chuẩn đã ghi (giống `inspection_history` bên
  equipment — chỉ thêm mới, đúng tinh thần "hồ sơ audit không sửa lại").

## Kiểm tra trước khi báo cáo lại

- `npx tsc --noEmit` sạch.
- Luồng thử: vào `/tools/[id]` một dụng cụ bất kỳ, bấm "+ Thêm lần hiệu chuẩn",
  điền hạn hiệu lực + đính kèm 1 file PDF/ảnh, lưu -> thấy dòng mới trong lịch
  sử hiệu chuẩn, bấm "Xem file" mở đúng file vừa upload; quay lại `/tools` xác
  nhận cột "Hạn hiệu chuẩn" của dụng cụ đó đã cập nhật theo hạn mới (đúng nhờ
  trigger, không cần sửa code trang danh sách).
- Test không đính kèm file (để trống input file) vẫn lưu được bản ghi bình
  thường, chỉ không có nút "Xem file" ở dòng đó.
- Test file quá 10MB hoặc sai định dạng bị chặn với thông báo tiếng Việt đúng
  (dùng chung `validateAttachmentFile`).
- RoleGate: role `accountant`/`office` không thấy nút "+ Thêm lần hiệu chuẩn".

Làm xong báo lại trên nhánh riêng (gợi ý `claude/prompt-45-giay-chung-nhan-hieu-chuan`),
CHƯA commit/merge — chờ tôi review giống quy trình các PROMPT trước.
