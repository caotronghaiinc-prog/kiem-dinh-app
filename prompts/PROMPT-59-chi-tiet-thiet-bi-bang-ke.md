# PROMPT-59: Số lượng/đơn giá/số tem/ngày kiểm định từng thiết bị trong hợp đồng + xuất bảng kê thiết bị

## Bối cảnh (để Claude Code hiểu, không cần hỏi lại)

Module Hợp đồng — M2 v1 (PROMPT-56/57/58, migration `0030_contracts.sql`) đã xong: bảng `contracts` / `contract_equipment` (bảng nối, 1 hợp đồng nhiều thiết bị) / `contract_payments`. Hiện tại `contracts.total_value` là 1 số tổng nhập tay lúc tạo hợp đồng (trước cả khi gắn thiết bị nào vào), còn `contract_equipment` chỉ có `equipment_id` + `note` — không có giá, số lượng, số tem, ngày kiểm định.

Anh Hải đã xác nhận qua phiên mentor Cowork (21/08/2026), quyết định phạm vi qua nhiều vòng hỏi đáp:

* Mỗi dòng thiết bị trong hợp đồng cần: số lượng, đơn giá, số tem, ngày kiểm định (nhập tay riêng cho hợp đồng, KHÔNG tự lấy từ `inspection_history` vì hợp đồng có thể ký trước, kiểm định thực tế sau).
* App cần nút xuất "bảng kê thiết bị" — chỉ là 1 bảng dữ liệu (STT, thiết bị, mã hiệu, số chế tạo, số lượng, số tem, ngày kiểm định, đơn giá, thành tiền, tổng cộng), KHÔNG phải toàn văn hợp đồng pháp lý — toàn văn hợp đồng (10 Điều khoản, căn cứ Thông tư 41...) vẫn soạn qua skill Cowork `soan-hop-dong-kiem-dinh` như hiện tại (đã phân tích kỹ với Hải: nội dung pháp lý đó đã tinh chỉnh qua nhiều lần thực tế, port vào code app có rủi ro trôi nội dung giữa 2 nơi, và cần 1 kiến trúc xuất file hoàn toàn khác — không đáng đánh đổi).
* Vì chỉ là bảng dữ liệu (không phải mẫu nhà nước bắt buộc), KHÔNG cần file mẫu Word tải lên — dựng trực tiếp bằng thư viện `docx` (npm), khác với cách M3 dùng file mẫu tĩnh + `docxtemplater` (M3 phải khớp đúng mẫu biên bản nhà nước, còn bảng kê này thì không).

## Quyết định đã chốt — làm theo đúng, không cần hỏi lại

### 1. Schema `contract_equipment` — 4 cột mới

* `unit_price numeric(14, 0) not null default 0 check (unit_price >= 0)` — đơn giá.
* `quantity integer not null default 1 check (quantity > 0)` — số lượng.
* `so_tem text` — số tem, nullable (có thể chưa dán tem lúc mới ký hợp đồng).
* `ngay_kiem_dinh date` — nullable, nhập tay riêng cho hợp đồng (không liên kết `inspection_history`).
* "Thành tiền" của 1 dòng = `quantity * unit_price` — KHÔNG lưu thành cột riêng, tính khi hiển thị/xuất (tránh dữ liệu trùng lặp phải đồng bộ).

### 2. `contracts.total_value` đổi ý nghĩa: cache tự tính

* Từ "nhập tay lúc tạo hợp đồng" sang cache tự tính = SUM(quantity × unit_price) theo `contract_id`, mirror ĐÚNG pattern `sync_contract_paid_total()` đã có ở migration 0030 (trigger AFTER INSERT OR UPDATE OR DELETE, xử lý cả 3 thao tác vì dữ liệu có thể bị sửa/xóa nhầm).
* Bỏ hẳn trường "Giá trị hợp đồng" khỏi form tạo/sửa hợp đồng (`total_value` mặc định 0 lúc tạo, tự tăng khi thêm thiết bị + nhập đơn giá/số lượng ở trang chi tiết).
* Không đổi công thức công nợ (`debt = total_value - paid_total`).

### 3. RLS còn thiếu

`contract_equipment` hiện CHƯA có policy UPDATE (migration 0030 chỉ có select/insert/delete) — bổ sung, mirror đúng điều kiện policy insert cùng bảng (admin + inspector).

### 4. Migration mới (`supabase/migrations/0031_contract_equipment_details.sql`)

```sql
alter table contract_equipment
  add column unit_price numeric(14, 0) not null default 0 check (unit_price >= 0),
  add column quantity integer not null default 1 check (quantity > 0),
  add column so_tem text,
  add column ngay_kiem_dinh date;
```

* Viết `public.sync_contract_total_value()` (function, mirror cấu trúc `sync_contract_paid_total()` ở migration 0030: lấy `target_contract_id` từ `coalesce(new.contract_id, old.contract_id)`, update `contracts.total_value` bằng `coalesce((select sum(quantity * unit_price) from contract_equipment where contract_id = target_contract_id), 0)`, xử lý nhánh `TG_OP = 'DELETE'` return `old`).
* Trigger `after_contract_equipment_change_sync_total` — `after insert or update or delete on contract_equipment for each row execute function public.sync_contract_total_value()`.
* Policy `contract_equipment_update_admin_or_inspector` — `for update using (public.get_user_role() in ('admin', 'inspector')) with check (public.get_user_role() in ('admin', 'inspector'))`.
* Migration KHÔNG idempotent (giống quy ước 0030) — ghi comment rollback ở đầu file (drop trigger, drop function, drop policy, drop 4 cột) nếu lỡ chạy 2 lần.
* Chỉ chạy tay trên Supabase SQL Editor như các migration trước — không tự chạy trong sandbox (không có mạng ra Supabase).

### 5. Types (`src/app/(dashboard)/contracts/types.ts`)

* `ContractEquipmentRow`: thêm `unit_price: number`, `quantity: number`, `so_tem: string | null`, `ngay_kiem_dinh: string | null`. Mở rộng `equipment` object trong cùng interface để có thêm `serial_number: string | null` và `spec_values: Record<string, string> | null` (cần cho Mã hiệu — xem mục 7).

### 6. Bỏ `total_value` khỏi form tạo/sửa hợp đồng

* `src/lib/contracts/form-schema.ts`: xóa field `total_value` khỏi `contractFormSchema` + `ContractFormValues`.
* `src/app/(dashboard)/contracts/contract-form.tsx`: xóa `FormField name="total_value"`, xóa khỏi `defaultValues` và `payload`. Thêm 1 dòng ghi chú nhỏ dưới tiêu đề form (kiểu dòng "Mã hợp đồng sẽ được tự động tạo..." đã có sẵn cho `code`): "Giá trị hợp đồng được tự động tính bằng tổng số lượng × đơn giá thiết bị, cập nhật ở trang chi tiết hợp đồng sau khi tạo."

### 7. Mã hiệu — đọc từ `equipment.spec_values`, tên key KHÔNG đồng nhất

Xem `src/lib/equipment/spec-fields.ts`: 6 loại "Thiết bị nâng - *" dùng key `ma_hieu`, còn "Bình áp lực"/"Nồi hơi"/"Nồi gia nhiệt dầu" dùng key `loai_ma_hieu` (gộp "Loại, mã hiệu"). Các loại KTAT khác (thang máy, NDT...) chưa có trong `EQUIPMENT_SPEC_FIELDS`, sẽ không có mã hiệu. Viết 1 hàm nhỏ (đặt cạnh `getEquipmentSpecFields`/`getSpecSectionLabel` trong `spec-fields.ts` cho nhất quán vị trí):

```ts
export function getEquipmentModelCode(specValues: Record<string, string> | null | undefined): string | null {
  if (!specValues) return null;
  return specValues.ma_hieu ?? specValues.loai_ma_hieu ?? null;
}
```

Thiếu thì hiển thị "—" (đúng quy ước hiện có trong toàn app, xem `InfoField` ở `contracts/[id]/page.tsx` hoặc các chỗ khác dùng `|| "—"`).

### 8. `contract-equipment-section.tsx` — thêm cột + sửa qua dialog (KHÔNG inline-edit từng ô)

* Query ở `contracts/[id]/page.tsx` mở rộng select: `contract_equipment` cần thêm `unit_price, quantity, so_tem, ngay_kiem_dinh` + `equipment:equipment(code, name, type, serial_number, spec_values)`.
* Bảng thêm cột: Mã hiệu (qua `getEquipmentModelCode`), Số chế tạo (`equipment.serial_number`), Số lượng, Số tem, Ngày kiểm định (format `toLocaleDateString("vi-VN")` như các chỗ khác), Đơn giá (`formatCurrency`), Thành tiền (`formatCurrency(quantity * unit_price)`). Cột "Loại" hiện có thể bỏ nếu bảng quá rộng (đã có Mã hiệu định danh rõ hơn) — tùy Claude Code cân đối, không bắt buộc giữ. Giữ nguyên `overflow-x-auto` đã có cho bảng desktop, card mobile chỉ cần hiện các trường quan trọng nhất (thiết bị, số lượng, đơn giá, thành tiền), có thể thu gọn phần còn lại vào dòng phụ nhỏ.
* Thêm 1 dòng "Tổng cộng" cuối bảng = tổng `quantity * unit_price` toàn bộ thiết bị — chỉ hiển thị, KHÔNG tính thay `contracts.total_value` (giá trị đó luôn đọc từ DB, đã tự đúng nhờ trigger — đúng nguyên tắc xuyên suốt module này: không tính tay ở client thay cho cột đã cache).
* KHÔNG sửa inline từng ô. Thêm nút "Sửa" trên mỗi dòng (cạnh nút "Gỡ" hiện có, chỉ khi `canEdit`) mở 1 dialog mới `edit-contract-equipment-dialog.tsx` — mirror cấu trúc `payment-dialog.tsx` (form + `formatNumberInput` cho đơn giá, input số cho số lượng, input text cho số tem, input date cho ngày kiểm định) — submit gọi `supabase.from("contract_equipment").update({ unit_price, quantity, so_tem, ngay_kiem_dinh }) .eq("id", row.id)`, báo lỗi qua `logAndGetSafeMessage` + toast đúng pattern các dialog khác trong module này, `router.refresh()` sau khi lưu để `contracts.total_value` (đã tự tính qua trigger) hiện đúng ngay.
* `AddEquipmentDialog` giữ nguyên luồng thêm nhiều thiết bị 1 lúc (multi-select) — `quantity` mặc định 1, `unit_price`/`so_tem`/`ngay_kiem_dinh` mặc định rỗng/0 lúc thêm, điền chi tiết sau qua dialog "Sửa" ở trên (tránh phải nhập giá cho nhiều dòng cùng lúc trong 1 dialog tìm-kiếm vốn đã khá đông UI).

### 9. Xuất bảng kê thiết bị — dùng thư viện `docx`, KHÔNG cần file mẫu

* Thêm dependency `docx` (npm) — build file `.docx` bằng code, giống cách skill Cowork `soan-hop-dong-kiem-dinh` dựng hợp đồng (`Document`/`Table`/`Paragraph` từ thư viện `docx`), KHÁC cách M3 dùng `docxtemplater` + file mẫu tĩnh (không áp dụng được ở đây vì không có mẫu nhà nước bắt buộc cho bảng kê này).
* File mới `src/lib/reports/contract-equipment-list.ts` — hàm thuần `buildContractEquipmentListDocx(contract, equipment[])` trả về `Blob`, nội dung:
  * Khối đầu: tên công ty (dùng logo `public/logo.png` nếu `docx` hỗ trợ nhúng ảnh dễ dàng, không bắt buộc nếu phức tạp — ưu tiên đơn giản, đúng nội dung hơn là đẹp), "BẢNG KÊ THIẾT BỊ KÈM HỢP ĐỒNG SỐ `<contract_no>`", tên khách hàng, ngày xuất.
  * 1 bảng: cột STT / Tên thiết bị / Mã hiệu / Số chế tạo / Số lượng / Số tem / Ngày kiểm định / Đơn giá / Thành tiền — mỗi dòng 1 `contract_equipment`, định dạng số tiền có phân cách nghìn (dùng lại `formatCurrency`/logic tương tự `formatNumberInput` nếu tái dùng được ở phía client).
  * Dòng cuối bảng: "Tổng cộng" = tổng thành tiền, khớp `contracts.total_value`.
* Nút "Xuất bảng kê thiết bị" trên trang chi tiết hợp đồng (`contracts/[id]/page.tsx` hoặc ngay trong `contract-equipment-section.tsx`), disabled khi chưa có thiết bị nào trong hợp đồng (`equipment.length === 0`). Gọi hàm build ở trên (client component, `"use client"`, mirror cách `export-report-dialog.tsx`/`generate-docx.ts` tự tải file trực tiếp trong trình duyệt, không cần API route riêng), rồi tự tải `.docx` về máy — không cần dialog hỏi thêm thông tin gì (khác export biên bản M3, ở đây không có gì cần hỏi thêm).

## Ngoài phạm vi — KHÔNG làm trong PROMPT này

* Không xuất toàn văn hợp đồng pháp lý (Điều khoản, căn cứ pháp lý, kiểm tra đơn giá tối thiểu Thông tư 41...) — vẫn dùng skill Cowork `soan-hop-dong-kiem-dinh`.
* Không liên kết `ngay_kiem_dinh` với `inspection_history` — luôn nhập tay riêng cho hợp đồng.
* Không viết script backfill số lượng/đơn giá/số tem/ngày kiểm định cho dữ liệu hợp đồng cũ (đang là giai đoạn dùng thử dữ liệu giả — chấp nhận `total_value` của các hợp đồng cũ lệch cho tới khi ai đó nhập lại đầy đủ).

## Kiểm thử

* Tạo hợp đồng mới → xác nhận KHÔNG còn ô "Giá trị hợp đồng" trên form, `total_value` mặc định 0 sau khi tạo.
* Thêm 2-3 thiết bị vào hợp đồng (ít nhất 1 thiết bị thuộc loại "Thiết bị nâng - *" để test `ma_hieu`, 1 thiết bị "Bình áp lực"/"Nồi hơi" để test `loai_ma_hieu`, 1 thiết bị loại chưa có `spec_values` để xác nhận Mã hiệu hiện "—" không lỗi) → mở dialog "Sửa" từng dòng nhập số lượng/đơn giá/số tem/ngày kiểm định → xác nhận `total_value` ở đầu trang chi tiết + dòng "Tổng cộng" cuối bảng cùng khớp đúng.
* Sửa lại 1 dòng đã có → xác nhận `total_value` cập nhật lại đúng.
* Gỡ 1 thiết bị khỏi hợp đồng → xác nhận `total_value` giảm đúng theo `quantity × unit_price` của dòng vừa gỡ.
* Test RLS: đối chiếu policy mới qua `pg_policies` như các PROMPT trước đã làm (RLS UPDATE `contract_equipment` cho admin/inspector).
* Bấm "Xuất bảng kê thiết bị" → mở file `.docx` tải về, xác nhận đủ cột, đúng dữ liệu, dòng "Tổng cộng" khớp `contracts.total_value`; xác nhận nút bị ẩn/disabled khi hợp đồng chưa có thiết bị nào.
* Sau khi migrate xong: đếm số hợp đồng + số dòng `contract_equipment` hiện có trên DB thật, báo lại cho anh Hải (vì `total_value` các hợp đồng cũ sẽ lệch cho tới khi nhập lại).
