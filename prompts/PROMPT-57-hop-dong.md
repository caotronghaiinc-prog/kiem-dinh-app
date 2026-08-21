# PROMPT-57: Module Hợp đồng (M2 v1)

## Bối cảnh

Migration `supabase/migrations/0030_contracts.sql` (mentor đã viết, chờ anh Hải
chạy) tạo 3 bảng: `contracts` (hợp đồng), `contract_equipment` (nối hợp đồng ↔
thiết bị, 1 hợp đồng gắn nhiều thiết bị), `contract_payments` (từng đợt thanh
toán thực tế, tổng đã thu tự cache vào `contracts.paid_total` qua trigger). Đọc
kỹ phần comment đầu file migration trước khi làm — đặc biệt: `code` (mã nội bộ
tự sinh `HD-<năm>-<NNN>`, KHÔNG tự nhập) khác với `contract_no` (số hợp đồng thật
in trên văn bản giấy, BẮT BUỘC người dùng tự nhập tay); `paid_total` là cột cache
do trigger tự cập nhật — KHÔNG được set tay từ code ứng dụng.

Phạm vi đã chốt với anh Hải: KHÔNG có tính năng "báo giá" trong app (vẫn dùng
skill Cowork riêng như hiện tại). Admin + Inspector đều thêm/sửa được (giống quy
ước equipment/customers), chỉ Admin xóa được.

## Việc cần làm

### 1. `src/app/(dashboard)/contracts/types.ts`

Định nghĩa các interface cần dùng: `ContractListItem`, `ContractDetail`,
`ContractEquipmentRow` (kèm thông tin thiết bị: `code`, `name`, `type` — join từ
`equipment`), `ContractPaymentRow`. Trường `paid_total`/`total_value` kiểu
`number`.

### 2. Trang danh sách `/contracts`

Mirror cấu trúc `/tools` (đã có: `page.tsx`, toolbar, row/card) hoặc `/customers`
(có phân trang) — tùy anh thấy cái nào khớp hơn, nhưng CẦN có:
- Tìm kiếm theo `contract_no`/`code`/tên khách hàng (join `customers.company_name`).
- Lọc theo `status` (dropdown: Tất cả/Đang thực hiện/Hoàn thành/Đã thanh lý/Hủy).
- Mỗi dòng hiện: `code`, `contract_no`, tên khách hàng, giá trị hợp đồng
  (`total_value`, format tiền VNĐ — xem cách các chỗ khác trong app đang format
  số tiền, nếu có sẵn hàm dùng chung thì tái dùng, không viết lại), công nợ còn
  lại (`total_value - paid_total`, in màu đỏ nếu > 0, xanh nếu = 0), trạng thái
  (badge màu theo `status`).
- Nút "+ Thêm hợp đồng" (RoleGate admin+inspector) trỏ `/contracts/new`.
- Phân trang (mirror `customers/pagination-controls.tsx`, copy sang thư mục
  `contracts/` theo đúng cách các module khác đang làm).

### 3. Form tạo/sửa hợp đồng (`/contracts/new`, `/contracts/[id]/edit`)

Trường: chọn khách hàng (dropdown/combobox từ bảng `customers` — công ty vài
trăm khách hàng có thể cần search-as-you-type, xem cách `equipment-form.tsx`
đang chọn `customer_id` để tái dùng đúng pattern/component), `contract_no` (bắt
buộc), `title` (tên/nội dung hợp đồng, tùy chọn), `signed_date`, `total_value`
(input số, format nghìn phân cách khi hiển thị, lưu số nguyên), `status`
(select, mặc định "Đang thực hiện"), `note`, upload file hợp đồng đã ký
(PDF/JPG/PNG, tái dùng `ATTACHMENT_BUCKET`/`validateAttachmentFile`/
`MAX_ATTACHMENT_SIZE_BYTES`/`ALLOWED_ATTACHMENT_EXTENSIONS` từ
`@/lib/inspection/form-schema.ts` — ĐÃ CÓ SẴN, không viết lại, xem cách
`add-inspection-dialog.tsx`/`calibration-dialog.tsx` đang dùng để upload đúng
convention). Path upload: `contract-files/${contractId}/${crypto.randomUUID()}${ext}`
(cần tạo `contractId` trước khi upload — với tạo mới, insert `contracts` trước
với `contract_file_path = null`, upload xong thì update lại, giống cách
`inspect-checklist-form.tsx` xử lý ảnh — HOẶC insert sau khi có path nếu form
validate file trước, tùy anh thấy cách nào gọn hơn).

KHÔNG cho sửa `code`/`paid_total` trong form (2 trường này không thuộc form,
`code` do trigger tự set, `paid_total` do trigger đồng bộ từ `contract_payments`).

### 4. Trang chi tiết `/contracts/[id]`

- Thông tin chung: mọi field ở mục 3 (dạng xem, không phải form), kèm nút "Sửa"
  (RoleGate admin+inspector) trỏ trang edit, link "Xem file hợp đồng" nếu có
  (`AttachmentLink`, tái dùng y hệt component đã có ở `equipment/[id]/attachment-link.tsx`
  hoặc `tools/[id]/attachment-link.tsx` — copy sang `contracts/[id]/`).
- **Danh sách thiết bị gắn với hợp đồng này** (`contract_equipment` join
  `equipment`): bảng/card hiện `code`, `name`, `type` thiết bị (link tới
  `/equipment/${equipment_id}`), nút "Gỡ" (xóa dòng `contract_equipment`, RoleGate
  admin+inspector — unique constraint đã có sẵn ở DB nên không lo trùng). Nút
  "+ Thêm thiết bị" mở dialog chọn 1 hoặc nhiều thiết bị từ `/equipment` CHƯA có
  trong hợp đồng này (search theo `code`/`name`, loại trừ những `equipment_id`
  đã có trong `contract_equipment` của hợp đồng hiện tại) — insert vào
  `contract_equipment`.
- **Lịch sử thanh toán** (`contract_payments`): bảng/card hiện `paid_date`,
  `amount` (format tiền), `method`, `note`, người tạo. Hiện rõ 3 số tổng quan ở
  đầu section: Giá trị hợp đồng / Đã thu (`paid_total`) / Còn nợ
  (`total_value - paid_total`). Nút "+ Ghi nhận thanh toán" mở dialog nhập
  `amount` (bắt buộc, > 0), `paid_date` (mặc định hôm nay), `method` (tùy chọn,
  text đơn giản — vd "Tiền mặt"/"Chuyển khoản", không cần dropdown cố định),
  `note` — insert vào `contract_payments`, `paid_total` trên `contracts` TỰ CẬP
  NHẬT qua trigger DB, chỉ cần `router.refresh()` sau khi insert thành công,
  KHÔNG tự tính/set `paid_total` từ client.

### 5. Nav link

Thêm mục "Hợp đồng" vào `NAV_LINKS`/`BASE_NAV_LINKS` trong
`src/app/(dashboard)/layout.tsx` — hiện cho MỌI role (không gate như
"Nhật ký thay đổi", vì admin+inspector đều thao tác hợp đồng bình thường).

### 6. Widget dashboard (tùy chọn, nên làm)

Mirror `calibration-alert-widget.tsx`: widget "Hợp đồng còn công nợ" trên
`/dashboard`, liệt kê tối đa 5 hợp đồng có `total_value > paid_total` VÀ
`status != 'huy'`, sắp theo công nợ còn lại giảm dần, link tới
`/contracts/${id}`. Ẩn hẳn nếu 0 hợp đồng còn nợ.

## Không làm trong phạm vi này

- KHÔNG tích hợp GlobalSearch (giống quyết định đã áp dụng cho `/tools` ở
  PROMPT-43) — có thể làm sau nếu anh Hải cần.
- KHÔNG có tính năng báo giá, xuất hóa đơn điện tử, DNTT trong app (vẫn dùng
  skill Cowork riêng — `baogia-incosaf`, `skil-dntt`).
- KHÔNG tự động tạo file hợp đồng Word từ dữ liệu app (khác với báo cáo kiểm
  định vốn có mẫu Word tự điền) — file hợp đồng chỉ là UPLOAD file đã ký, không
  generate.

## Sau khi xong

Test tay: tạo 1 hợp đồng gắn 2-3 thiết bị có sẵn, ghi nhận 2 đợt thanh toán, xác
nhận công nợ tính đúng (`total_value - paid_total`), xác nhận `code` tự sinh
đúng định dạng `HD-2026-NNN`, thử gỡ 1 thiết bị khỏi hợp đồng, thử xóa hợp đồng
bằng tài khoản inspector (phải bị chặn — chỉ admin xóa được), kiểm tra
`/audit-log` thấy đúng log các thao tác trên `contracts`/`contract_payments`.
`npx tsc --noEmit` sạch. Báo cáo lại file đã sửa/thêm — CHƯA commit/merge.
