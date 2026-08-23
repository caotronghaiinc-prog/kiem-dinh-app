# PROMPT-61: Xuất Biên bản nghiệm thu hợp đồng (tự sinh từ dữ liệu app)

Bản đã rà soát lại (21/08/2026) trước khi đưa cho Claude Code chạy — đối chiếu với code THẬT hiện có trên `master` (sau khi PROMPT-59/60 đã merge), không phải chỉ đối chiếu với thiết kế ban đầu. Phát hiện 3 điểm cần sửa so với bản nháp trước, đã sửa trực tiếp trong file này — xem mục "Đã sửa sau khi rà soát" ngay dưới đây để biết chính xác khác gì so với bản cũ.

## Đã sửa sau khi rà soát (so với bản nháp trước)

1. Số migration đổi từ `0032` → `0033` — PROMPT-60 (đã chạy, đã merge) dùng đúng số `0032_quotes.sql` rồi, không thể trùng.
2. Phát hiện `contract_equipment.unit` (đơn vị tính) CHƯA TỪNG được thêm thật — bản thiết kế PROMPT-59 ban đầu có nhắc tới cột này (bổ sung lúc thiết kế PROMPT-61), nhưng đối chiếu migration `0031_contract_equipment_details.sql` THẬT đã chạy, type `ContractEquipmentRow`, và `contract-equipment-list.ts` THẬT trên `master` thì cột này không tồn tại — PROMPT-59 khi triển khai thực tế chỉ thêm 4 cột (`unit_price`/`quantity`/`so_tem`/`ngay_kiem_dinh`), không có `unit`. Vì bảng nghiệm thu ở PROMPT này cần cột "Đơn vị tính" theo đúng mẫu `skil-bb-nt`, PROMPT-61 sẽ tự bổ sung cột này luôn (mục 1 dưới đây) thay vì giả định nó đã có sẵn.
3. Làm rõ: PHẢI dùng khổ A4/dxa/Times New Roman như mô tả ở mục 5, KHÔNG mirror kiểu bảng đơn giản (percentage width, font mặc định docx, không set khổ giấy) mà `contract-equipment-list.ts` (PROMPT-59) và `quote-export.ts` (PROMPT-60) đang dùng — 2 file đó hợp lý cho bảng kê nội bộ/báo giá, nhưng Biên bản nghiệm thu phải khớp visual với văn bản pháp lý thật đã ký nhiều lần qua skill `skil-bb-nt`, nên cố ý dùng mức chi tiết cao hơn. Nói rõ ở đây để Claude Code không tự ý "mirror cho nhất quán" với 2 file kia.

## Bối cảnh (để Claude Code hiểu, không cần hỏi lại)

Nối tiếp PROMPT-59 (số lượng/đơn giá/số tem/ngày kiểm định + xuất bảng kê thiết bị) và PROMPT-60 (module Báo giá, đã merge master commit `9a51f1e`). Anh Hải quyết định: app tự sinh luôn Biên bản nghiệm thu (văn bản xác nhận khối lượng/chất lượng công việc đã hoàn thành theo hợp đồng, dùng làm căn cứ thanh toán — hiện đang soạn qua skill Cowork `skil-bb-nt`) từ dữ liệu hợp đồng đã có trong app, KHÔNG phải chỉ lưu file đính kèm.

PROMPT NÀY PHỤ THUỘC PROMPT-59 ĐÃ CHẠY TRƯỚC (cần cột `unit_price`/`quantity`/`so_tem`/`ngay_kiem_dinh` trên `contract_equipment`, và dependency `docx` đã cài) — nếu Hải paste PROMPT-61 trước PROMPT-59, dừng lại và báo cho Hải chạy PROMPT-59 trước. (Cột `unit` KHÔNG nằm trong điều kiện phụ thuộc này vì PROMPT-61 tự thêm cột đó — xem mục "Đã sửa sau khi rà soát" #2.)

Đây là văn bản có giá trị pháp lý thật (căn cứ thanh toán giữa 2 doanh nghiệp) — bố cục dưới đây đã được anh Hải chốt qua nhiều vòng chỉnh sửa thực tế trên 1 biên bản nghiệm thu thật (không phải suy đoán), PHẢI theo ĐÚNG từng chi tiết, không tự ý bỏ/thêm/đổi câu chữ.

## Quyết định thiết kế đã chốt

### 1. Migration mới (`supabase/migrations/0033_contract_acceptance.sql`)

```sql
-- Phần A: bổ sung cột "unit" (đơn vị tính) còn thiếu cho contract_equipment
-- -- PROMPT-59 thiết kế ban đầu có cột này nhưng bản triển khai thật (đã
-- merge master) không có. Bổ sung ở đây vì Biên bản nghiệm thu (Phần B)
-- cần hiển thị "Đơn vị tính" từng dòng thiết bị theo đúng mẫu skil-bb-nt.
alter table contract_equipment
  add column unit text;

-- Phần B: thêm cột vào contracts cho thông tin nghiệm thu
alter table contracts
  add column acceptance_date date,
  add column acceptance_location text,
  add column acceptance_result text check (acceptance_result in ('dat', 'co_van_de')),
  add column acceptance_note text,              -- bắt buộc có nội dung nếu acceptance_result = 'co_van_de'
  add column representative_a_name text,          -- Ông/Bà + tên người đại diện Bên A ký biên bản
  add column representative_a_title text,         -- chức vụ người đại diện Bên A
  add column acceptance_copies_note text,         -- vd "Biên bản lập thành 04 bản, mỗi bên giữ 02 bản."
  add column acceptance_file_path text;           -- file biên bản đã ký, upload lại sau (tùy chọn)
```

KHÔNG cần RLS mới cho cả 2 phần (policy `contract_equipment_update_admin_or_inspector` đã có sẵn từ migration 0031, policy `contracts_update_admin_or_inspector` đã có sẵn từ migration 0030 — cả 2 cover đủ cột mới). KHÔNG cần trigger audit mới (trigger `audit_contracts` đã gắn trên toàn bảng `contracts` từ migration 0030, tự động cover cột mới; `contract_equipment` hiện KHÔNG có audit trigger riêng — giữ nguyên như vậy, không phải phạm vi PROMPT này). Migration KHÔNG idempotent — ghi comment rollback (drop cột `unit` + drop 8 cột acceptance) nếu lỡ chạy 2 lần.

### 2. Bổ sung nhập "Đơn vị tính" (unit) cho `contract_equipment`

* `src/lib/contracts/contract-equipment-form-schema.ts`: thêm field `unit: z.string().trim().optional()`.
* `src/app/(dashboard)/contracts/[id]/edit-contract-equipment-dialog.tsx`: thêm 1 `<Input>` "Đơn vị tính" (mirror đúng cách các field `so_tem`/`ngay_kiem_dinh` hiện có trong file này), gợi ý mặc định "Cái" khi ô đang trống (giống cách `quote-export.ts` xử lý `unit || "—"`, nhưng ở đây là gợi ý lúc nhập, không phải lúc hiển thị).
* `src/app/(dashboard)/contracts/types.ts`: thêm `unit: string | null;` vào `ContractEquipmentRow`.
* `src/app/(dashboard)/contracts/[id]/page.tsx`: thêm `unit` vào câu `select(...)` của `contract_equipment` (hiện đang là `"id, equipment_id, unit_price, quantity, so_tem, ngay_kiem_dinh, equipment:equipment(...)"` — thêm `unit` vào giữa `quantity` và `so_tem`).
* Tùy chọn, không bắt buộc: hiển thị thêm cột "Đơn vị tính" trong bảng kê thiết bị (`src/lib/reports/contract-equipment-list.ts`, PROMPT-59) vì giờ dữ liệu đã có sẵn — làm nếu tiện, bỏ qua nếu muốn giữ phạm vi PROMPT này gọn, KHÔNG bắt buộc phải làm.

### 3. Bổ sung `address`/`contact_name` của khách hàng vào trang chi tiết hợp đồng

`src/app/(dashboard)/contracts/[id]/page.tsx` hiện chỉ select `customer:customers(company_name)` — cần thêm `address, contact_name` (đã có sẵn trên bảng `customers`, không cần migration) để dùng làm giá trị gợi ý mặc định ở dialog nghiệm thu (mục 4) và điền vào phần "ĐẠI DIỆN BÊN A" của văn bản (mục 5). Cập nhật type `ContractDetail`/interface `customer` tương ứng trong `types.ts` (hiện là `{ company_name: string } | null`, đổi thành `{ company_name: string; address: string | null; contact_name: string | null } | null`).

### 4. Khối "Nghiệm thu hợp đồng" trên `contracts/[id]/page.tsx`

* Section mới (đặt sau `ContractPaymentsSection`, cùng cấu trúc `<section>` như các khối khác trong trang) — hiển thị các trường trên nếu đã có (`InfoField` pattern có sẵn trong file này), nút "Cập nhật thông tin nghiệm thu" (chỉ `canEdit`) mở dialog `acceptance-dialog.tsx` mới — mirror cấu trúc `payment-dialog.tsx`:
  * Ngày nghiệm thu (date, bắt buộc trước khi xuất được biên bản).
  * Địa điểm nghiệm thu (text, gợi ý mặc định = địa chỉ khách hàng nếu còn trống).
  * Kết quả kiểm định: radio "Đạt yêu cầu hoàn toàn" / "Có vấn đề, ghi chú" — chọn vế sau thì hiện thêm textarea bắt buộc (`acceptance_note`).
  * Tên người đại diện Bên A (text, gợi ý mặc định = `customer.contact_name` nếu còn trống, KHÔNG tự validate định dạng "Ông/Bà" — để người nhập tự thêm).
  * Chức vụ người đại diện Bên A (text, KHÔNG có ở đâu khác trong hệ thống — cố ý không thêm cột này vào bảng `customers` vì chức vụ người ký có thể khác theo từng lần, không phải thuộc tính cố định của khách hàng).
  * Ghi chú số bản lập (text, mặc định gợi ý "Biên bản lập thành 04 bản, mỗi bên giữ 02 bản." — đúng quy ước công ty đang dùng ở skill `soan-hop-dong-kiem-dinh`, cho sửa nếu hợp đồng cụ thể khác).
  * Upload file biên bản đã ký (tùy chọn, cùng cơ chế `ALLOWED_ATTACHMENT_EXTENSIONS`/`ATTACHMENT_BUCKET` (import từ `@/lib/inspection/form-schema`, đúng như `contract-form.tsx` đang dùng cho `contract_file_path`) đã dùng cho `contract_file_path`, path `contract-files/<contract_id>/acceptance-<uuid>.<ext>` để phân biệt với file hợp đồng gốc (path hiện tại của file hợp đồng là `contract-files/<contract_id>/<uuid>.<ext>`, xem `contract-form.tsx` dòng tạo `path`).
  * Submit: `supabase.from("contracts").update({...}).eq("id", contract.id)`.
* Nút "Xuất biên bản nghiệm thu" — disabled kèm chú thích rõ lý do nếu `acceptance_date` chưa có giá trị (bắt buộc điền qua dialog trên trước). Khi đủ điều kiện, gọi hàm build ở mục 6, tự tải `.docx` về máy (client component, không cần dialog hỏi thêm gì — mọi thứ đã có trong DB).
* Hiển thị file biên bản đã ký (nếu có `acceptance_file_path`) qua component `AttachmentLink` có sẵn (`src/app/(dashboard)/contracts/attachment-link.tsx`) — nhưng component này hiện HARDCODE nhãn nút "Xem file hợp đồng" (không có prop tùy chỉnh nhãn). Thêm prop tùy chọn `label?: string` (mặc định giữ nguyên `"Xem file hợp đồng"` để KHÔNG phá vỡ chỗ đang gọi nó ở mục "Thông tin chung"), truyền `label="Xem biên bản đã ký"` khi dùng cho `acceptance_file_path`.

### 5. Phạm vi v1 — CHỈ nghiệm thu TOÀN BỘ hợp đồng 1 lần

Bảng "khối lượng công việc nghiệm thu" trong biên bản lấy TẤT CẢ dòng `contract_equipment` của hợp đồng — KHÔNG hỗ trợ nghiệm thu từng phần/nhiều đợt cho 1 hợp đồng ở v1 (mỗi hợp đồng chỉ có 1 bộ thông tin nghiệm thu, ghi đè khi cập nhật lại). Nếu sau này cần nghiệm thu nhiều đợt, đó là 1 PROMPT thiết kế riêng (đổi từ cột trên `contracts` sang bảng `contract_acceptances` con) — KHÔNG tự làm trong phạm vi này.

### 6. Hàm build Word — `src/lib/reports/contract-acceptance.ts`

Dùng dependency `docx` (đã cài từ PROMPT-59/60, không cài lại). Hàm thuần `buildContractAcceptanceDocx(input): Promise<Blob>` nhận `contract` (đủ field bảng `contracts` + `customer` gồm `company_name`/`address`/`contact_name` — xem mục 3), `equipment: ContractEquipmentRow[]` (đủ `unit`/`quantity`/`unit_price` — cột `unit` mới thêm ở mục 1/2).

BẮT BUỘC theo đúng cấu trúc 16 mục dưới đây, đúng thứ tự, không bỏ/thêm/đổi câu chữ (nguyên văn từ skill `skil-bb-nt` đã được anh Hải chốt qua thực tế, port sang code lần này thay vì chạy skill mỗi lần):

1. Quốc hiệu tiêu ngữ: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" / "Độc lập - Tự do - Hạnh phúc" / "---o0o---". KHÔNG thêm header 2 cột kiểu cơ quan chủ quản (văn bản giữa 2 doanh nghiệp độc lập).
2. Tiêu đề: "BIÊN BẢN NGHIỆM THU" — in hoa, đậm, cỡ chữ lớn hơn thân bài 4-6pt.
3. Phụ đề in nghiêng đậm: "Khối lượng, chất lượng công việc kiểm định kỹ thuật an toàn thiết bị".
4. Dòng in nghiêng: "Thuộc Hợp đồng kinh tế số: `<contract.contract_no>` ngày `<ngày>` tháng `<tháng>` năm `<năm>`" (tách từ `contract.signed_date` — nếu null, để "……" như skill quy ước khi thiếu dữ liệu, KHÔNG tự bịa ngày).
5. Hai gạch đầu dòng "Căn cứ": (a) căn cứ hợp đồng kinh tế đã ký, (b) căn cứ kết quả/thực tế công việc đã thực hiện.
6. "Hôm nay, ngày `<acceptance_date>`, tại `<acceptance_location>`, chúng tôi gồm có:".
7. "I. ĐẠI DIỆN BÊN A: `<customer.company_name>`" — KHÔNG thêm nhãn phụ "(Bên giao thầu)". Dòng tiếp: "`<representative_a_name>`" và "Chức vụ: `<representative_a_title>`" canh cùng 1 dòng bằng khoảng trắng. Dòng địa chỉ riêng (`customer.address`).
8. "II. ĐẠI DIỆN BÊN B: CÔNG TY CỔ PHẦN KIỂM ĐỊNH KỸ THUẬT, AN TOÀN VÀ TƯ VẤN XÂY DỰNG – INCOSAF – CHI NHÁNH ĐÀ NẴNG" — cấu trúc tương tự Bên A, KHÔNG thêm "(Bên nhận thầu)". Thông tin Bên B CỐ ĐỊNH (hardcode hằng số, KHÔNG đọc từ DB — công ty chỉ có 1, không đổi theo hợp đồng):

```
Ông Dương Kim Ái — Giám đốc
Địa chỉ: 20 Nguyễn Lộ Trạch, Phường Hòa Cường, TP. Đà Nẵng
```

9. "Hai bên cùng tiến hành nghiệm thu khối lượng, chất lượng công việc thực hiện theo Hợp đồng kinh tế nêu trên, cụ thể như sau:".
10. Mục "1. KHỐI LƯỢNG CÔNG VIỆC NGHIỆM THU" — bảng 6 cột: STT | Nội dung công việc (= `equipment.name`) | Đơn vị tính (= `contract_equipment.unit`, mặc định "Cái" nếu trống) | Số lượng | Đơn giá (đồng) | Thành tiền (đồng). Header tô nền xám nhạt, đậm. Dòng cuối "Tổng cộng (đã bao gồm thuế GTGT 8%):" — PHẢI dùng `columnSpan` để gộp ô thật sự, KHÔNG chỉ set `width` (lỗi đã từng xảy ra thật trong skill gốc — xem mẫu code mục 7). Tổng khớp `contract.total_value`.
11. Ngay dưới bảng, in nghiêng: "Bằng chữ: `<số tiền bằng chữ>` đồng./." — cần viết hàm `numberToVietnameseWords(n: number): string` mới (`src/lib/utils/number-to-words-vi.ts`, KHÔNG có sẵn trong repo) đọc số tiền tiếng Việt đúng chuẩn (nghìn/triệu/tỷ, biến âm "mốt"/"lăm"/"linh"...) — cẩn thận, đây là logic dễ sai ở các trường hợp biên (số tròn chục/trăm, số có chữ số 0 ở giữa). Tự viết vài test case bằng số tiền thật của các hợp đồng đang có trong DB, đối chiếu bằng mắt trước khi coi là xong.
12. Mục "2. NHẬN XÉT, ĐÁNH GIÁ" — các gạch đầu dòng: đã kiểm định đúng quy trình/tiêu chuẩn; kết quả đạt yêu cầu (nếu `acceptance_result = 'dat'`) HOẶC nêu đúng nội dung `acceptance_note` (nếu `co_van_de`); đã bàn giao hồ sơ kỹ thuật (biên bản kiểm định, kết quả kiểm định, tem kiểm định); khối lượng/chất lượng đúng thỏa thuận tại hợp đồng.
13. Mục "3. KẾT LUẬN" — hai bên thống nhất nghiệm thu, xác nhận Bên B đã hoàn thành nghĩa vụ, biên bản là cơ sở để thanh toán.
14. Dòng số bản lập: `<acceptance_copies_note>`.
15. KHÔNG thêm dòng "Biên bản kết thúc lúc ... giờ ... phút" — cố ý bỏ, không thêm dù có vẻ "thiếu".
16. Chữ ký: bảng 2 cột CÓ viền (không phải bảng ẩn viền). Mỗi cột: "ĐẠI DIỆN BÊN A"/"ĐẠI DIỆN BÊN B" in đậm, "(Ký, ghi rõ họ tên, đóng dấu)" in nghiêng ngay dưới, khoảng trống ~3 dòng, rồi tên người đại diện in đậm ở cuối (`representative_a_name` / "Dương Kim Ái" cố định cho Bên B). KHÔNG thêm dòng tên công ty riêng giữa nhãn và dòng "(Ký, ghi rõ...)".

### 7. Chi tiết kỹ thuật docx-js — PHẢI làm đúng ngay từ đầu (lỗi thật đã từng xảy ra ở skill gốc)

Nhắc lại mục "Đã sửa sau khi rà soát" #3: văn bản này dùng mức chi tiết định dạng CAO HƠN 2 file export trước đó (`contract-equipment-list.ts`, `quote-export.ts` — 2 file đó dùng bảng width theo %, không set khổ giấy/margin/font riêng). KHÔNG mirror kiểu đơn giản của 2 file đó cho văn bản này — làm đúng theo mô tả dưới đây:

* Khổ A4 = 11907 x 16840 dxa, margin trái 1701 / phải 1134 / top-bottom 1134 → chiều rộng nội dung khả dụng = 9072 dxa. Tổng `columnWidths` của MỌI bảng trong văn bản phải cộng lại ≤ 9072 — sai chỗ này khiến cột cuối bảng ("Thành tiền") tràn ra ngoài lề (lỗi đã xảy ra thật).
* Ô gộp cột bắt buộc dùng `columnSpan`, không chỉ set `width` lớn hơn — chỉ set width khiến các cột không thẳng hàng giữa các dòng của bảng (lỗi thứ hai đã xảy ra thật, dòng "Tổng cộng" bị lệch so với header).
* Font Times New Roman, cỡ chữ thân bài 26 (13pt, đơn vị half-point của `docx`), tiêu đề 32 (16pt), line spacing 276, đoạn văn thường `AlignmentType.JUSTIFIED`, các dòng ngắn (tiêu đề, quốc hiệu, tên chức danh) `AlignmentType.CENTER`.
* Bảng chữ ký dùng viền mặc định của `Table` (KHÔNG set `borders: NONE`).
* Nếu cần tham khảo cấu trúc code cụ thể (cell/columnSpan/font helper functions), xem skill nội bộ `skil-bb-nt` (`Read` file `SKILL.md` của skill này nếu cần đối chiếu thêm chi tiết — không bắt buộc, phần trên đã đủ thông tin).

### 8. Đặt tên file khi tải về

`Bien_ban_nghiem_thu_<contract.code>_<slug(customer.company_name)>.docx` (mirror cách các file export khác trong app đặt tên rõ ràng, dễ phân biệt).

## Ngoài phạm vi — KHÔNG làm trong PROMPT này

* Không hỗ trợ nghiệm thu nhiều đợt/từng phần cho 1 hợp đồng (xem mục 5).
* Không thêm "chức vụ" thành cột cố định trên `customers` — chỉ nhập tay mỗi lần nghiệm thu qua dialog.
* Không tự động gửi biên bản qua email — chỉ xuất file, gửi tay như các export khác trong app.
* Không đổi nội dung/thứ tự 16 mục đã chốt ở trên dù có vẻ "có thể cải thiện" — đây là bố cục đã được anh Hải xác nhận qua thực tế, không tự ý diễn giải lại.
* Không bắt buộc thêm cột "Đơn vị tính" vào bảng kê thiết bị của PROMPT-59 (mục 2, phần tùy chọn) — làm nếu tiện, không làm cũng không sao.

## Kiểm thử

* Hợp đồng CHƯA có `acceptance_date` → nút "Xuất biên bản nghiệm thu" disabled, chú thích rõ lý do.
* Điền đủ thông tin nghiệm thu qua dialog (cả 2 nhánh: Đạt yêu cầu / Có vấn đề kèm ghi chú) → xác nhận lưu đúng, hiện đúng trên trang chi tiết.
* Nhập "Đơn vị tính" qua dialog sửa thiết bị (mục 2) → xác nhận lưu đúng, xuất hiện đúng trong bảng nghiệm thu (mục "1. KHỐI LƯỢNG CÔNG VIỆC NGHIỆM THU"); để trống → hiện "Cái" mặc định.
* Xuất file `.docx` → render ra ảnh xem lại bằng mắt (như các PROMPT export trước vẫn làm): khổ A4 đúng, bảng không tràn lề, cột thẳng hàng ở dòng "Tổng cộng" (test riêng — đây là đúng 2 lỗi đã từng xảy ra thật), số tiền bằng chữ đọc đúng với ít nhất 3-4 giá trị tiền khác nhau (có số 0 giữa, số tròn chục/trăm, số có "mốt"/"lăm").
* Hợp đồng có `signed_date` null → dòng "Thuộc Hợp đồng kinh tế số..." hiện đúng dấu chấm thay vì lỗi/crash.
* File biên bản đã ký (nếu có upload) → nút hiện đúng nhãn "Xem biên bản đã ký" (không lẫn với nút "Xem file hợp đồng" ở khối Thông tin chung).
* Test RLS: xác nhận admin/inspector cập nhật được thông tin nghiệm thu VÀ đơn vị tính thiết bị, cùng chính sách hiện có của `contracts`/`contract_equipment` (không cần policy mới, chỉ cần xác nhận không có gì bị chặn ngoài ý muốn).
* `tsc --noEmit` + `npm run build` sạch (như quy ước mọi PROMPT trước).
