# PROMPT-63: Danh sách Nhân viên/Kiểm định viên + Chứng chỉ + Phạm vi hoạt động

## Bối cảnh

Trước khi mời đồng nghiệp dùng thử (PROMPT-17), Hải muốn có thêm: danh sách nhân viên, kiểm định viên và các chứng chỉ của họ, cùng phạm vi hoạt động (loại thiết bị) mà mỗi chứng chỉ cho phép kiểm định.

Phương án đã được Hải duyệt qua phỏng vấn (AskUserQuestion nhiều vòng):

* "Nhân viên" = mở rộng bảng `profiles` có sẵn (không tạo khái niệm mới).
* Phạm vi hoạt động gắn theo TỪNG chứng chỉ, có cấu trúc (chọn loại thiết bị từ danh mục có sẵn) + mô tả tự do (ghi nguyên văn theo chứng chỉ gốc).
* Có cảnh báo (không chặn) khi phạm vi không khớp lúc phân công kiểm định.
* Có theo dõi + cảnh báo dashboard khi chứng chỉ sắp/đã hết hạn.
* Có upload file scan chứng chỉ gốc.
* Trang danh sách nhân viên + quyền thêm/sửa chứng chỉ: CHỈ ADMIN.

## ⚠️ Đã sửa sau khi rà soát code thật (mentor, 23/08/2026)

Trước khi đưa prompt này cho Claude Code chạy, đã stage + đọc trực tiếp các file liên quan trên `master` hiện tại và phát hiện 4 điểm cần sửa/làm rõ so với phương án ban đầu đã thống nhất bằng lời với Hải:

1. KHÔNG tạo bucket Storage mới `certificate-files`. Bucket `inspection-files` (tạo từ migration 0009, `ATTACHMENT_BUCKET` trong `src/lib/inspection/form-schema.ts`) đã được dùng chung cho nhiều loại file khác nhau bằng cách phân biệt qua PATH PREFIX (`<equipment_id>/...` cho biên bản kiểm định, `tool-certs/<tool_id>/...` cho hiệu chuẩn dụng cụ đo — xem migration 0025). Mirror y hệt: file chứng chỉ nhân viên dùng prefix mới `employee-certs/<profile_id>/<uuid>.ext`, KHÔNG cần bucket hay RLS storage mới.
2. KHÔNG có bước "chọn/phân công kiểm định viên" nào tồn tại trong hệ thống hiện tại. Cả 2 luồng tạo `inspection_history` hiện có (`equipment/[id]/add-inspection-dialog.tsx` dòng 196 VÀ `equipment/[id]/inspect/inspect-checklist-form.tsx` dòng 542) đều tự động gán `inspector_id: user.id` — LUÔN LÀ NGƯỜI ĐANG ĐĂNG NHẬP, không có dropdown chọn người khác. Vậy tính năng "cảnh báo phạm vi không khớp" (đã chốt ở phỏng vấn) phải hiểu lại là: cảnh báo cho CHÍNH người đang nhập bản ghi kiểm định thấy, nếu CHÍNH HỌ chưa có chứng chỉ còn hạn phù hợp với loại thiết bị đang kiểm định — hiện ngay trong 2 dialog/form nói trên, không phải ở một bước "phân công" riêng.
3. RLS SELECT trên bảng chứng chỉ mới cần mở thêm cho chính chủ, ngoài admin xem toàn bộ (`profile_id = auth.uid() OR get_user_role() = 'admin'`) — nếu chỉ admin đọc được (như phương án gốc), sửa #2 ở trên không thể hoạt động vì trang/dialog kiểm định của 1 kiểm định viên không tự đọc được chứng chỉ của chính họ để so sánh. INSERT/UPDATE/DELETE vẫn giữ nguyên CHỈ ADMIN đúng như đã chốt.
4. Không cần trigger đồng bộ cache kiểu `sync_tool_after_calibration()` (migration 0025). Khác dụng cụ đo (chỉ 1 hạn hiệu chuẩn hiện hành có ý nghĩa), 1 nhân viên có thể có NHIỀU chứng chỉ còn hạn cùng lúc, mỗi cái phủ 1 phạm vi khác nhau — không có khái niệm "hạn gần nhất" đại diện cho cả người đó. Trang chi tiết + widget dashboard đọc thẳng bảng chứng chỉ, không cache lên `profiles`.

## A. Migration 0035 — Bảng `inspector_certificates`

```sql
create table inspector_certificates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  certificate_type text,        -- Loại/hạng chứng chỉ (vd "Kiểm định viên hạng 2")
  certificate_number text,      -- Số hiệu chứng chỉ
  issued_by text,                -- Cơ quan/đơn vị cấp
  issued_date date,
  expiry_date date not null,     -- Bắt buộc -- cần để tính cảnh báo hết hạn
  equipment_types text[] not null default '{}',
                                  -- Phạm vi có cấu trúc: giá trị PHẢI khớp
                                  -- EQUIPMENT_TYPE_OPTIONS
                                  -- (src/lib/equipment/form-schema.ts)
  scope_note text,               -- Mô tả tự do, ghi nguyên văn phạm vi trên
                                  -- chứng chỉ gốc (không nhất thiết khớp
                                  -- 100% cách phân loại của app)
  file_path text,                -- path trong bucket "inspection-files",
                                  -- prefix "employee-certs/<profile_id>/..."
  note text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inspector_certificates_profile_id_idx
  on inspector_certificates (profile_id);
```

RLS:

* SELECT: `profile_id = auth.uid() or public.get_user_role() = 'admin'`
* INSERT/UPDATE/DELETE: `public.get_user_role() = 'admin'` (chỉ admin, đúng như đã chốt phỏng vấn)

Audit log: mở rộng trigger `log_audit_event()` có sẵn (migration 0028) sang bảng này luôn, mirror cách đã làm cho `quotes`/`quote_items` ở migration 0032 — gần như miễn phí, giữ nhất quán.

KHÔNG cần sửa `profiles` — không thêm cột nào lên bảng đó.

## B. Trang `/employees` — Danh sách nhân viên (chỉ Admin)

Mirror `src/app/(dashboard)/tools/page.tsx`:

* Gate bằng `await requireRole(["admin"])` ở đầu Server Component (mirror `audit-log/page.tsx` dòng 30) — KHÔNG chỉ ẩn UI, phải chặn cả server-side.
* Query `profiles`: `id, full_name, email, role, phone, active`, sắp xếp theo `full_name`.
* Ô tìm kiếm theo tên/email (mirror `sanitizeSearchTerm` pattern có sẵn) + filter theo `role` (dùng nhãn `ROLE_LABELS` đã có sẵn trong `layout.tsx`, chuyển ra file dùng chung nếu cần).
* Bảng/card hiển thị: Họ tên, Email, Vai trò (nhãn tiếng Việt), SĐT, Trạng thái (đang làm việc/ngừng — dựa cột `active`).
* Click vào 1 dòng → `/employees/[id]`.

## C. Trang `/employees/[id]` — Chi tiết nhân viên + chứng chỉ (chỉ Admin)

Mirror `src/app/(dashboard)/tools/[id]/page.tsx`:

* Gate `requireRole(["admin"])`.
* Section "Thông tin chung": họ tên, email, SĐT, vai trò, trạng thái.
* Section "Chứng chỉ" (component mới `certificates-section.tsx`, mirror `calibration-history-section.tsx`): bảng liệt kê mọi chứng chỉ của người này — Loại/hạng, Số hiệu, Cơ quan cấp, Ngày cấp, Hạn hiệu lực (dùng `getExpiryStatus()` có sẵn trong `src/lib/utils/expiry-status.ts` để tô màu đỏ/vàng/xanh y hệt cách `/tools/[id]` đang làm), Phạm vi (badge cho từng loại thiết bị trong `equipment_types` + `scope_note` bên dưới), File đính kèm (`AttachmentLink`), nút Sửa/Xóa (chỉ hiện khi admin — luôn đúng vì cả trang đã gate admin rồi, nhưng vẫn giữ tường minh).
* Nút "+ Thêm chứng chỉ" mở dialog mới `certificate-dialog.tsx` (mirror `calibration-dialog.tsx`):
  * Form fields: Loại/hạng chứng chỉ (text), Số hiệu (text), Cơ quan cấp (text), Ngày cấp (date), Hạn hiệu lực (date, bắt buộc), Phạm vi thiết bị (multi-select checkbox theo đúng `EQUIPMENT_TYPE_GROUPS` trong `src/lib/equipment/form-schema.ts` — dùng lại `import`, KHÔNG chép lại danh sách), Mô tả phạm vi tự do (textarea), File đính kèm (`ALLOWED_ATTACHMENT_EXTENSIONS`/`validateAttachmentFile` từ `@/lib/inspection/form-schema`, path `employee-certs/<profile_id>/<uuid>.ext`), Ghi chú.
  * Cùng dialog dùng cho Sửa (mirror pattern `mode`/`initialData` đã dùng ở `add-inspection-dialog.tsx`).

## D. Nav — thêm link "Nhân viên" (chỉ Admin)

Sửa `src/app/(dashboard)/layout.tsx`: thêm `{ href: "/employees", label: "Nhân viên" }` vào cùng điều kiện admin-only đang áp cho "Nhật ký thay đổi" (dòng 36-39) — có thể gộp chung 1 mảng `ADMIN_ONLY_NAV_LINKS` cho gọn thay vì viết 2 điều kiện `profile?.role === "admin"` riêng lẻ.

## E. Cảnh báo hết hạn chứng chỉ trên Dashboard (chỉ Admin thấy widget)

Mirror `dashboard/calibration-alert-widget.tsx` → widget mới `certificate-alert-widget.tsx`:

* Đếm số chứng chỉ theo màu đỏ/vàng/xanh (dùng `getExpiryStatus()`, KHÔNG viết lại logic ngày).
* Danh sách 5 chứng chỉ gần hết hạn nhất (tên nhân viên + loại chứng chỉ + trạng thái), click vào → `/employees/[id]`.
* Widget này CHỈ hiện cho admin (mirror cách `EditRequestAlertWidget` chỉ hiện `isAdmin && ...` ở `dashboard/page.tsx` dòng 195-197) — nhất quán với việc thông tin nhân sự/chứng chỉ chỉ admin xem được ở các trang khác trong prompt này.
* `dashboard/page.tsx`: thêm 1 query `inspector_certificates` (chỉ chạy khi `isAdmin`, mirror cách query `inspection_edit_requests` đã làm có điều kiện) lấy `id, profile_id, certificate_type, certificate_number, expiry_date, profile:profiles(full_name)`, sắp theo `expiry_date` tăng dần.
* Thêm `CertificateAlertRow` vào `dashboard/types.ts`.

## F. Cảnh báo phạm vi khi tự nhập bản ghi kiểm định (self-check, không chặn)

Áp dụng CẢ 2 nơi đang set `inspector_id: user.id`:

### F1. `equipment/[id]/add-inspection-dialog.tsx`

* Cần thêm prop `equipmentType: string | null` (đã có sẵn ở `InspectionHistorySection` — chỉ cần truyền tiếp xuống, xem `equipment/[id]/inspection-history-section.tsx` dòng 40 đã nhận `equipmentType`).
* Khi dialog mở + đã có `profile` (từ `useCurrentUserProfile()` đã dùng sẵn trong file), fetch `supabase.from("inspector_certificates").select("equipment_types, expiry_date").eq("profile_id", profile.id)`.
* Tính: có ít nhất 1 dòng với `expiry_date >= hôm nay` VÀ `equipment_types` chứa `equipmentType` hay không.
* Nếu KHÔNG (kể cả trường hợp người này chưa có chứng chỉ nào trong hệ thống) → hiện banner cảnh báo (màu vàng, không phải đỏ — không chặn): "Bạn chưa có chứng chỉ còn hạn ghi nhận phạm vi phù hợp với loại thiết bị này trong hệ thống. Vẫn có thể tiếp tục lưu." Đặt phía trên `DialogFooter`, không disable nút Lưu.

### F2. `equipment/[id]/inspect/inspect-checklist-form.tsx`

* Cùng logic F1. Trước khi viết, kiểm tra lại: prop `equipment` truyền vào form này đã có sẵn field `type` chưa (nhiều khả năng có, vì trang cha `inspect/page.tsx` cần `equipment.type` để chọn đúng `equipment_checklist_templates` — nhưng vẫn cần xác nhận tên field chính xác trong `types.ts` của thư mục `inspect/` trước khi dùng, KHÔNG giả định).
* Vị trí đặt banner: gần khu vực xác nhận/nút "Lưu" ở cuối form (form này rất dài — không đặt ở đầu vì sẽ bị cuộn mất, dễ bỏ sót).

## G. Types mới

* `src/app/(dashboard)/employees/types.ts`: `EmployeeListItem`, `EmployeeDetail`, `CertificateRow` (mirror cấu trúc `CalibrationRow` trong `tools/types.ts`).
* `dashboard/types.ts`: thêm `CertificateAlertRow`.

## H. Danh sách file dự kiến

Mới:

* `supabase/migrations/0035_inspector_certificates.sql`
* `src/app/(dashboard)/employees/page.tsx`
* `src/app/(dashboard)/employees/employees-toolbar.tsx`
* `src/app/(dashboard)/employees/employee-row.tsx` / `employee-card.tsx`
* `src/app/(dashboard)/employees/types.ts`
* `src/app/(dashboard)/employees/[id]/page.tsx`
* `src/app/(dashboard)/employees/[id]/certificates-section.tsx`
* `src/app/(dashboard)/employees/[id]/certificate-dialog.tsx`
* `src/lib/employees/certificate-form-schema.ts`
* `src/app/(dashboard)/dashboard/certificate-alert-widget.tsx`

Sửa:

* `src/app/(dashboard)/layout.tsx` (thêm nav link admin-only)
* `src/app/(dashboard)/dashboard/page.tsx` + `types.ts` (widget mới)
* `src/app/(dashboard)/equipment/[id]/add-inspection-dialog.tsx` (banner cảnh báo phạm vi)
* `src/app/(dashboard)/equipment/[id]/inspection-history-section.tsx` (truyền thêm prop `equipmentType` xuống `AddInspectionDialog` — có thể đã đủ, cần xác nhận lúc code vì component này ĐÃ nhận `equipmentType` làm prop của chính nó)
* `src/app/(dashboard)/equipment/[id]/inspect/inspect-checklist-form.tsx` (banner cảnh báo phạm vi)

## I. Ngoài phạm vi (v1)

* KHÔNG chặn cứng khi phạm vi không khớp (đã chốt: chỉ cảnh báo).
* KHÔNG thêm trường HR khác (ngày vào làm, chức danh, lương...) — chỉ đúng phạm vi nhân viên/kiểm định viên + chứng chỉ + phạm vi hoạt động đã yêu cầu.
* KHÔNG cho inspector tự thêm/sửa chứng chỉ của chính mình (đã chốt: chỉ admin).
* KHÔNG đổi quyền xem `/employees` cho role khác ngoài admin.

## J. Trước khi chạy

Migration 0035 phải được Hải tự chạy tay trên Supabase SQL Editor (đúng quy trình mọi lần) — Claude Code PHẢI dừng lại xin chạy migration TRƯỚC khi bắt đầu test (rút kinh nghiệm sự cố PROMPT-61, đã làm đúng ở PROMPT-62).
