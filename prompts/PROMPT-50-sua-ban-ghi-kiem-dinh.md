# PROMPT-50: Xây tính năng "Sửa bản ghi kiểm định"

## Bối cảnh

Hệ thống hiện **chưa có bất kỳ UI nào để sửa 1 bản ghi `inspection_history` đã
tạo** — chỉ có "+ Thêm bản ghi kiểm định" (tạo mới). Anh Hải yêu cầu bổ sung khả
năng sửa, đi kèm cơ chế khóa sau khi xuất biên bản Word (xem migration
`supabase/migrations/0027_inspection_lock_and_edit_requests.sql` — mentor đã viết,
đang chờ anh Hải chạy). PROMPT này CHỈ xây phần "sửa được", CHƯA xây phần "xin mở
khóa" (đó là PROMPT-51, làm sau).

RLS đã có sẵn từ migration 0002 (không cần sửa): Admin luôn sửa được
`inspection_history`/`inspection_checklist_results`/`inspection_photos` kể cả khi
`is_locked = true`. Inspector chỉ sửa được khi `is_locked = false`.

## Việc cần làm

### 1. Bổ sung `is_locked` vào dữ liệu đang fetch

- `src/app/(dashboard)/equipment/[id]/types.ts`: thêm `is_locked: boolean` vào
  `InspectionHistoryDetailRow` (hoặc interface tương đương đang dùng).
- `src/app/(dashboard)/equipment/[id]/page.tsx`: thêm cột `is_locked` vào câu
  select `inspection_history` hiện có (tìm chỗ đang select
  `inspection_date, report_number, ...` cho danh sách lịch sử).

### 2. Sửa cho equipment CÓ checklist template (`/equipment/[id]/inspect`)

File `inspect-checklist-form.tsx` (875 dòng, dùng chung cho tạo mới) hiện chỉ
INSERT. Cần thêm chế độ edit:

- Thêm route mới `src/app/(dashboard)/equipment/[id]/inspect/[historyId]/edit/page.tsx`
  — mirror `inspect/page.tsx` nhưng thêm: fetch bản ghi `inspection_history` theo
  `historyId` (kèm `is_locked`), fetch sẵn `inspection_checklist_results` theo
  `inspection_history_id`, fetch `inspection_photos` nếu cần hiển thị ảnh đã có.
  Nếu `is_locked = true` VÀ role hiện tại là `inspector` → gọi `notFound()` hoặc
  redirect về trang chi tiết thiết bị kèm thông báo lỗi (không cho vào form sửa —
  phòng trường hợp họ tự gõ URL, dù nút "Sửa" ở bước 4 đã ẩn sẵn).
- Sửa `InspectChecklistForm` (`inspect-checklist-form.tsx`) để nhận thêm prop tùy
  chọn, ví dụ `mode: "create" | "edit"` (mặc định `"create"` để không phá vỡ chỗ
  gọi cũ ở `inspect/page.tsx`) và `initialData` (bản ghi `inspection_history` +
  `checklist_results` hiện có để điền sẵn form). Khi `mode === "edit"`:
  - Điền sẵn toàn bộ giá trị form từ `initialData` (checklist answers, các field
    header như ngày kiểm định/kết quả/số biên bản/hạn mới/ghi chú, và các field
    "extra form" riêng theo loại thiết bị nếu equipment đó có — Nồi hơi/Nồi gia
    nhiệt dầu/Bình áp lực đều có file `*-extra-form.tsx` riêng, xem cách chúng
    đang nhận props để điền sẵn tương tự).
  - Khi submit: UPDATE thay vì INSERT — `inspection_history` (theo `id` bản ghi
    đang sửa), và với `inspection_checklist_results`: cách đơn giản nhất là xóa
    hết kết quả cũ theo `inspection_history_id` rồi insert lại toàn bộ (giống
    logic tạo mới), thay vì upsert từng dòng — đỡ phải so khớp item nào đổi/không
    đổi. Ảnh (`inspection_photos`)/file đính kèm: GIỮ NGUYÊN ảnh cũ theo mặc định
    (không xóa), chỉ cho thêm ảnh mới nếu người dùng chọn — không bắt buộc phải
    làm UI xóa ảnh cũ trong phạm vi PROMPT này (có thể để nguyên, đánh giá thêm
    sau nếu anh Hải cần).
  - Nút submit đổi label thành "Lưu thay đổi" thay vì "Hoàn tất kiểm định" khi
    `mode === "edit"`.
  - Sau khi lưu thành công: điều hướng về trang chi tiết thiết bị (không lock lại
    tự động ở đây — chỉ export lại Word mới khóa lại, theo đúng thiết kế).

### 3. Sửa cho equipment KHÔNG có checklist template (`add-inspection-dialog.tsx`)

- Thêm chế độ tương tự: prop `mode`/`initialData` cho `AddInspectionDialog`, hoặc
  tách riêng `EditInspectionDialog` dùng chung phần lớn JSX/logic qua 1 component
  form con — tùy anh thấy cách nào ít trùng lặp code hơn thì làm, miễn hành vi
  đúng: điền sẵn dữ liệu cũ, submit là UPDATE theo `id`, nút đổi thành "Lưu thay
  đổi".

### 4. Thêm nút "Sửa" vào `inspection-history-section.tsx`

- Mỗi dòng lịch sử kiểm định (cả bảng desktop lẫn card mobile): thêm nút "Sửa"
  cạnh nút xuất biên bản.
- Điều kiện hiển thị nút "Sửa":
  - Vai trò `admin` → LUÔN hiện (bất kể `is_locked`).
  - Vai trò `inspector` → chỉ hiện khi `item.is_locked === false`.
  - Vai trò khác/chưa đăng nhập → không hiện (đã có `canEdit` prop sẵn, dùng
    logic tương tự chỗ đang check `canEdit` cho nút "+ Thêm bản ghi kiểm định").
- Khi `hasChecklistTemplate` → link tới
  `/equipment/${equipmentId}/inspect/${item.id}/edit`. Khi không có template →
  mở `EditInspectionDialog`/dialog chế độ edit ở bước 3.

### 5. Gọi RPC khóa sau khi xuất biên bản

Trong `export-report-dialog.tsx`, hàm `handleExport()`, NGAY SAU dòng
`await generateReport(...)` thành công (trước dòng `toast({ title: "Đã xuất biên
bản Word" })`), thêm:

```ts
const { error: lockError } = await supabase.rpc("lock_inspection_history", {
  p_inspection_history_id: inspectionHistoryId,
});
if (lockError) {
  // Không throw -- file Word đã tải về thành công rồi, không nên báo "xuất thất
  // bại" chỉ vì bước khóa lỗi. Log lại để biết, báo toast riêng nhẹ nhàng.
  console.error("Lock inspection_history failed:", lockError);
  toast({
    variant: "destructive",
    title: "Đã xuất file nhưng khóa bản ghi thất bại",
    description: "Bản ghi này có thể vẫn sửa được bình thường. Báo lại cho admin nếu cần.",
  });
}
```

(Dùng đúng tên hàm RPC `lock_inspection_history` và tham số
`p_inspection_history_id` — khớp chữ ký hàm trong migration 0027. Nếu migration
0027 đổi tên tham số, dùng lại đúng tên đó.)

## Không làm trong phạm vi này

- KHÔNG xây "Xin sửa"/duyệt/từ chối — đó là PROMPT-51.
- KHÔNG cần UI xóa ảnh cũ khi sửa (nêu ở bước 2).
- KHÔNG cần widget dashboard.

## Sau khi xong

Test tay (không cần Playwright đầy đủ, nhưng nên có ít nhất): sửa 1 bản ghi của
equipment có checklist (vd Cần trục), sửa 1 bản ghi của equipment không có
checklist, xuất biên bản Word rồi xác nhận `is_locked` chuyển `true` trong DB
(query tay), đăng nhập vai trò inspector xác nhận nút "Sửa" biến mất trên bản ghi
đã khóa nhưng vẫn hiện trên bản ghi chưa khóa, đăng nhập admin xác nhận nút "Sửa"
luôn hiện. Báo cáo lại: file nào đã sửa/thêm, kết quả test, và `npx tsc --noEmit`
sạch trước khi dừng — CHƯA commit/merge (chờ PROMPT riêng sau khi mentor review).
