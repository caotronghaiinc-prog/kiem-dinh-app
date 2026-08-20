# PROMPT-43: Quản lý dụng cụ đo (route `/tools`)

## Bối cảnh

Anh Hải yêu cầu (nguyên văn): *"một mục quản lý riêng: người quản lý, người
mượn, ngày mượn, đang làm ở đâu, không trùng lặp, quản lý thời hạn kiểm
định, giấy kiểm định, hiệu chuẩn"*.

Đây là danh mục **dụng cụ đo/thiết bị kiểm tra của CÔNG TY** (máy siêu âm,
đồng hồ vạn năng, thước kẹp, áp kế chuẩn...) — khác hẳn bảng `equipment`
(thiết bị CỦA KHÁCH HÀNG cần kiểm định). Route mới hoàn toàn `/tools`,
KHÔNG đụng vào `/equipment` hay code report hiện có.

## Đã có sẵn (KHÔNG cần làm lại)

Migration `supabase/migrations/0024_inspection_tools.sql` đã chạy thành
công trên Supabase. Đọc file này trước để biết đúng tên cột/kiểu dữ liệu.
Tóm tắt:

- **`inspection_tools`** (danh mục gốc, đã seed sẵn 48 dòng thật): `id`,
  `code` (DC-001.. tự sinh), `name`, `model`, `serial_number`,
  `ownership_doc`, `calibration_due_date` (date), `calibration_not_applicable`
  (bool), `calibration_cert_no` (hiện toàn NULL, chưa có trong danh mục
  gốc), `custodian_id` (FK `profiles.id`, người quản lý — hiện toàn NULL,
  anh Hải sẽ gán sau trên UI), `default_location` (default `'Kho INCERT'`),
  `status` (`active`/`maintenance`/`retired`), `note`, `created_at`,
  `updated_at`.
- **`inspection_tool_loans`** (lịch sử mượn/trả, hiện TRỐNG — chưa có
  lượt mượn nào): `id`, `tool_id` (FK), `borrower_id` (FK `profiles.id`,
  người mượn), `borrowed_at` (date, default hôm nay), `expected_return_at`,
  `returned_at` (NULL = đang mượn), `work_location` (text, "đang làm ở
  đâu"), `customer_id` (FK `customers.id`, optional), `note`, `created_by`,
  `created_at`.
- **Ràng buộc "không trùng lặp"**: unique index MỘT PHẦN
  `inspection_tool_loans_one_active_idx` trên `(tool_id) WHERE returned_at
  IS NULL` — Postgres tự chặn nếu insert lượt mượn thứ 2 cho 1 dụng cụ
  đang có lượt mượn chưa trả (lỗi `duplicate key value violates unique
  constraint "inspection_tool_loans_one_active_idx"`). Form "Cho mượn"
  PHẢI bắt lỗi này và hiện thông báo tiếng Việt dễ hiểu, KHÔNG hiện lỗi
  Postgres nguyên văn (đúng OWASP RULE-20 đã áp dụng cho `equipment.code`
  trong `equipment-form.tsx` — mirror logic `mapEquipmentError()`).
- RLS: `select` = mọi người đã đăng nhập; `insert`/`update` = admin +
  inspector; `delete` = chỉ admin — giống hệt bảng `equipment`.

## Quy ước bắt buộc mirror (đọc các file này trước khi viết code)

- `src/app/(dashboard)/equipment/page.tsx`, `equipment-toolbar.tsx`,
  `equipment-row.tsx`, `types.ts`, `equipment-form.tsx` — pattern trang
  danh sách + toolbar filter qua URL searchParams + bảng + form
  create/edit dùng `react-hook-form` + `zodResolver` + Supabase client
  trực tiếp từ client component (KHÔNG dùng server actions).
- `src/app/(dashboard)/equipment/[id]/page.tsx` +
  `inspection-history-section.tsx` + `add-inspection-dialog.tsx` — pattern
  trang chi tiết + section lịch sử (bảng) + Dialog thêm bản ghi mới bằng
  `react-hook-form` trong `<Dialog>` (component `AddInspectionDialog` là
  ví dụ MẪU GẦN NHẤT cho Dialog "Cho mượn" bên dưới).
- `src/lib/utils/expiry-status.ts` (`getExpiryStatus()`,
  `EXPIRY_COLOR_DOT_CLASS`, `EXPIRY_COLOR_TEXT_CLASS`) — TÁI DÙNG THẲNG cho
  `calibration_due_date` (không viết logic màu mới). Khi
  `calibration_not_applicable = true`, coi như "Chưa có hạn" (giống
  `expiryDate = null`) — không tính đỏ/vàng.
- `src/lib/auth/require-role.ts`, `src/components/auth/role-gate.tsx`,
  `src/hooks/use-current-user-profile.ts` — auth/role guard, mirror y hệt
  equipment (admin+inspector sửa, chỉ admin xóa).
- `src/lib/errors.ts` (`logAndGetSafeMessage`), `src/hooks/use-toast.ts`.
- `src/app/(dashboard)/dashboard/expiry-alert-widget.tsx` +
  `dashboard/page.tsx` — mirror cho widget cảnh báo hạn hiệu chuẩn (mục 7
  bên dưới).

## Việc cần làm

### 1. Nav link

`src/app/(dashboard)/layout.tsx`: thêm vào mảng `NAV_LINKS`, ngay sau
`{ href: "/equipment", label: "Thiết bị" }`:

```ts
{ href: "/tools", label: "Dụng cụ đo" },
```

### 2. Types — `src/app/(dashboard)/tools/types.ts`

Định nghĩa (đặt tên tùy ý miễn rõ nghĩa, đây là gợi ý field cần có):

- `ProfileOption { id: string; label: string }` — dùng cho dropdown người
  quản lý/người mượn, `label` = `full_name || email`.
- `ToolListItem` — dùng cho bảng danh sách: `id, code, name, model,
  serial_number, calibration_due_date, calibration_not_applicable,
  custodian: { full_name: string | null } | null`, và **lượt mượn đang mở
  nếu có** (join `inspection_tool_loans` lọc `returned_at is null`, lấy
  `borrower:profiles(full_name)`, `borrowed_at`, `work_location`) để cột
  "Trạng thái" hiện "Đang mượn — <tên người mượn> (<work_location>)" hoặc
  "Sẵn có".
- `ToolRecord` — đầy đủ field cho form create/edit (không cần loan).
- `LoanRow` — cho bảng lịch sử mượn/trả ở trang chi tiết: `id,
  borrowed_at, expected_return_at, returned_at, work_location, note,
  borrower: { full_name } | null, customer: { company_name } | null`.

### 3. Trang danh sách `/tools` — `src/app/(dashboard)/tools/page.tsx`

Server component, mirror `equipment/page.tsx`:

- Filter qua searchParams: `q` (tìm theo `name`/`code`/`model`, dùng
  `.ilike`/`.or()` như equipment), `status` (`all` | `available` |
  `on_loan`), `calibration` (`all` | `expiring` — hạn ≤60 ngày hoặc quá
  hạn, dùng `getExpiryStatus`).
- Query `inspection_tools` kèm `custodian:profiles(full_name)` và
  `loans:inspection_tool_loans(borrower:profiles(full_name), borrowed_at,
  work_location, returned_at)` — lọc `returned_at is null` phía JS sau khi
  fetch (mảng loans mỗi tool rất ngắn, không cần filter phía SQL phức
  tạp), lấy loan đang mở đầu tiên (nếu có, tối đa 1 theo ràng buộc unique
  index) làm `activeLoan`.
- Bảng cột: Mã | Tên dụng cụ | Model/Serial | Người quản lý | Trạng thái
  (badge "Đang mượn"/"Sẵn có" + tên người mượn nếu có) | Hạn hiệu chuẩn
  (dùng `getExpiryStatus`, hoặc "Không áp dụng" nếu
  `calibration_not_applicable`) | (nếu canEdit) nút Sửa.
- Toolbar (`tools-toolbar.tsx`, mirror `equipment-toolbar.tsx`): ô tìm
  kiếm + 2 Select filter (trạng thái mượn, hạn hiệu chuẩn) + nút "+ Thêm
  dụng cụ" (RoleGate admin+inspector) sang `/tools/new`. KHÔNG cần nút
  Import Excel (danh mục đã seed đủ 48 dòng thật).
- Click 1 dòng -> `/tools/[id]`.

### 4. Form thêm/sửa — `/tools/new`, `/tools/[id]/edit`

Mirror `equipment/new/page.tsx` + `equipment-form.tsx`:

- `src/lib/tools/form-schema.ts`: zod schema
  `toolFormSchema` — `name` bắt buộc, các field còn lại optional/nullable
  (`model, serial_number, ownership_doc, calibration_due_date,
  calibration_not_applicable, calibration_cert_no, custodian_id,
  default_location, status, note`). KHÔNG có `code` trong form (server
  tự sinh qua trigger `set_inspection_tool_code`, giống `equipment.code`
  — client insert KHÔNG gửi `code`, để trigger lo).
- `tool-form.tsx` (client component): fetch danh sách `profiles` (id,
  full_name, email) để làm option cho `custodian_id` — Select có thêm
  option "-- Chưa gán --" (giá trị null). Toggle
  `calibration_not_applicable` (checkbox) disable field
  `calibration_due_date` khi bật, giống UX "Không đánh giá" ở checklist
  form hiện có.
- `mapToolError()` mirror `mapEquipmentError()`: bắt lỗi
  `duplicate key ... inspection_tools_code_key` (nếu có, do trigger đua
  race hiếm) -> thông báo tiếng Việt thân thiện; các lỗi khác qua
  `logAndGetSafeMessage`.
- `/tools/new/page.tsx`: `requireRole(["admin","inspector"])`, fetch
  `profiles` để truyền `custodianOptions` xuống form.
- `/tools/[id]/edit/page.tsx`: tương tự, fetch thêm dòng `inspection_tools`
  theo id.

### 5. Trang chi tiết `/tools/[id]` — `src/app/(dashboard)/tools/[id]/page.tsx`

Mirror `equipment/[id]/page.tsx`:

- Header: `code — name`, badge trạng thái hạn hiệu chuẩn (dùng
  `getExpiryStatus`/màu), nút "Sửa" (RoleGate admin+inspector) sang
  `/tools/[id]/edit`.
- Section "Thông tin chung": model, serial_number, ownership_doc,
  calibration_due_date (hoặc "Không áp dụng"), calibration_cert_no,
  custodian (tên người quản lý), default_location, status, note — dùng
  lại pattern `InfoField` (copy hoặc import nếu tách được thành component
  dùng chung; nếu không tách được thì viết `InfoField` riêng trong file
  này, không sửa file equipment).
- Section "Lịch sử mượn/trả" (`loan-history-section.tsx`, mirror
  `inspection-history-section.tsx`): bảng các `inspection_tool_loans` của
  tool này, mới nhất trước, cột Người mượn | Ngày mượn | Đang làm ở đâu |
  Ngày trả (hoặc badge "Đang mượn" nếu `returned_at is null`) | Ghi chú.
  Nếu có `activeLoan` -> hiện nút "Trả dụng cụ" trên dòng đó (RoleGate
  admin+inspector) -> `UPDATE inspection_tool_loans SET returned_at =
  <hôm nay> WHERE id = ...` qua Supabase client, `router.refresh()` sau
  khi xong. Nếu KHÔNG có `activeLoan` -> hiện nút "+ Cho mượn" mở
  `LoanDialog`.
- `loan-dialog.tsx` (mirror `add-inspection-dialog.tsx` gần như y hệt cấu
  trúc Dialog+react-hook-form): field `borrower_id` (Select từ
  `profiles`, bắt buộc), `borrowed_at` (date, default hôm nay),
  `expected_return_at` (date, optional), `work_location` (text, "Đang làm
  ở đâu", bắt buộc), `customer_id` (Select từ `customers`, optional —
  fetch `customers(id, company_name)` order theo tên), `note` (optional).
  Submit -> `supabase.from("inspection_tool_loans").insert({ tool_id,
  borrower_id, borrowed_at, expected_return_at: value || null,
  work_location, customer_id: value || null, note: value || null,
  created_by: user.id })`. Bắt lỗi unique violation (mã lỗi Postgres
  `23505`, hoặc check `error.message.includes("inspection_tool_loans_one_active_idx")`)
  -> toast "Dụng cụ này đang được mượn, không thể cho mượn tiếp. Vui lòng
  tải lại trang." + `router.refresh()` để đồng bộ UI (trường hợp 2 người
  cùng bấm "Cho mượn" gần như đồng thời).

### 6. Trang danh sách phần "Sẵn có ngay" (không bắt buộc, bỏ qua nếu tốn thời gian)

Không cần trang riêng — trạng thái Đang mượn/Sẵn có đã lộ đủ trên bảng
`/tools` (mục 3) và filter `status=on_loan`/`available` đã đủ dùng cho
nhu cầu "muốn mượn cái gì đó, xem cái nào đang rảnh".

### 7. Dashboard: widget cảnh báo hạn hiệu chuẩn

Vì anh Hải nhấn mạnh "quản lý thời hạn kiểm định... hiệu chuẩn", thêm 1
widget mirror HỆT `expiry-alert-widget.tsx`:

- `src/app/(dashboard)/dashboard/calibration-alert-widget.tsx` — copy cấu
  trúc `ExpiryAlertWidget`, đổi nguồn dữ liệu sang
  `inspection_tools.calibration_due_date` (bỏ qua các dòng
  `calibration_not_applicable = true` khỏi phần đếm đỏ/vàng/xanh VÀ khỏi
  danh sách "5 dụng cụ gần hết hạn nhất" — coi như không có hạn cần theo
  dõi), tiêu đề "Cảnh báo hạn hiệu chuẩn dụng cụ đo", link "Xem tất cả" ->
  `/tools`, mỗi dòng link -> `/tools/[id]`.
- Trong `dashboard/page.tsx`: thêm 1 lệnh fetch song song (trong
  `Promise.all` hiện có) lấy `inspection_tools(id, code, name,
  calibration_due_date, calibration_not_applicable)`, render
  `<CalibrationAlertWidget tools={...} />` thêm vào lưới widget hiện có
  (`grid gap-6 lg:grid-cols-2`) — chỉ thêm, KHÔNG sửa 4 widget cũ.

### 8. KHÔNG làm trong PROMPT này (để sau nếu cần)

- KHÔNG tích hợp vào `GlobalSearch` (API `/api/search`) — để riêng, có
  thể làm sau nếu anh Hải thấy cần tìm dụng cụ qua ô tìm kiếm chung.
  Không phải yêu cầu đã nêu, bỏ qua để giữ phạm vi gọn.
- KHÔNG tích hợp picker "chọn dụng cụ đã dùng" vào các
  `*-extra-form.tsx` hiện có (Bình áp lực/Nồi hơi/Nồi gia nhiệt dầu, field
  `thiet_bi_dung_cu`) — đó là field nhập tay tên/model dụng cụ để in vào
  biên bản Word, khác mục đích với module mượn/trả này. Nếu sau này anh
  Hải muốn liên kết 2 chỗ này (tự điền từ danh mục thay vì gõ tay), báo
  lại tôi viết PROMPT riêng.
- KHÔNG cần trang quản lý `profiles`/user list riêng — chỉ fetch profiles
  làm dữ liệu option cho 2 dropdown (custodian, borrower).

## Kiểm tra trước khi báo cáo lại

- `npx tsc --noEmit` sạch.
- Chạy thử luồng: vào `/tools`, thấy đủ 48 dòng; mở 1 dòng, bấm "+ Cho
  mượn", điền form, lưu -> quay lại thấy trạng thái "Đang mượn"; bấm "+
  Cho mượn" LẦN NỮA cho CÙNG dụng cụ đó (chưa trả) -> phải bị chặn với
  thông báo tiếng Việt (test đúng ràng buộc "không trùng lặp"); bấm "Trả
  dụng cụ" -> trạng thái về "Sẵn có", lịch sử vẫn còn dòng đã trả.
- Test filter hạn hiệu chuẩn ≤60 ngày và trạng thái mượn hoạt động đúng.
- Test RoleGate: đăng nhập role `accountant`/`office` không thấy nút Sửa/
  Cho mượn/Trả (chỉ xem).
- KHÔNG có file nào trong `src/app/(dashboard)/equipment/`,
  `src/lib/reports/`, `src/lib/equipment/` bị sửa (trừ
  `layout.tsx` ở mục 1 và `dashboard/page.tsx` ở mục 7 — 2 file này CHỈ
  thêm dòng, không sửa logic cũ).

Làm xong báo lại trên nhánh riêng (gợi ý `claude/prompt-43-dung-cu-do`),
CHƯA commit/merge — chờ tôi review giống quy trình các PROMPT trước.
