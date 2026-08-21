# PROMPT-60: Module Báo giá (mới) + liên kết Báo giá ⇄ Hợp đồng

PROMPT NÀY PHỤ THUỘC PROMPT-59 ĐÃ CHẠY TRƯỚC — mục 7 (tạo hợp đồng từ báo giá) copy `quantity`/`unit_price` sang `contract_equipment`, các cột này chỉ tồn tại sau khi PROMPT-59 (migration 0031) đã chạy. Nếu Hải paste PROMPT-60 trước PROMPT-59, dừng lại và báo cho Hải chạy PROMPT-59 trước.

## Bối cảnh (để Claude Code hiểu, không cần hỏi lại)

App hiện có module Hợp đồng (M2 v1, PROMPT-56/57/58/59). Báo giá trước giờ KHÔNG nằm trong DB app — soạn qua skill Cowork `baogia-incosaf` (chạy ở phiên chat riêng, ngoài app). Anh Hải giờ quyết định đảo lại quyết định đó: muốn app TỰ có module Báo giá, lưu trạng thái đầy đủ, và liên kết được với module Hợp đồng.

Đã hỏi kỹ + chốt phạm vi qua AskUserQuestion (21/08/2026):

1. Lưu đầy đủ trong DB, theo dõi trạng thái (không phải chỉ công cụ xuất file) — giống mức độ module Hợp đồng.
2. Hỗ trợ cả khách hàng CHƯA có trong `/customers` (khách tiềm năng) — báo giá thường làm TRƯỚC khi khách chốt hợp tác, không thể bắt buộc phải tạo customer trước.
3. KHÔNG kiểm tra đơn giá tối thiểu theo Thông tư 41/2016/TT-BLĐTBXH ở v1 — quyết định có chủ đích: bảng giá tối thiểu phụ thuộc loại/công suất/tải trọng thiết bị, phức tạp, dữ liệu tham chiếu chưa chắc đã sạch/đầy đủ (kể cả skill `baogia-incosaf` cũng ghi "nếu có" khi nói tới tài liệu này). Không tự chế bảng giá để tránh sai mà không ai biết. Ghi vào backlog, đánh giá riêng sau nếu cần.
4. CÓ liên kết Báo giá ⇄ Hợp đồng — báo giá được chấp nhận có thể "Tạo hợp đồng" tự điền sẵn thiết bị + đơn giá.

## Quyết định thiết kế đã chốt

### 1. Bảng `quotes` (báo giá)

```sql
create table quotes (
  id uuid primary key default gen_random_uuid(),
  code text unique,                          -- tự sinh BG-<năm>-NNN, mirror generate_contract_code()
  customer_id uuid references customers(id) on delete set null, -- NULL nếu khách chưa có trong CRM
  -- Snapshot thông tin khách hàng LÚC LẬP báo giá -- báo giá phải giữ nguyên nội dung đã gửi
  -- khách dù sau này customer đổi thông tin, và bắt buộc phải có với khách chưa tồn tại trong
  -- /customers. Nếu customer_id có giá trị, điền sẵn từ bản ghi customer lúc tạo (KHÔNG tự
  -- đồng bộ lại sau đó).
  customer_name_snapshot text not null,
  customer_address_snapshot text,
  customer_contact_snapshot text,             -- người đại diện / người liên hệ
  customer_phone_snapshot text,
  customer_tax_code_snapshot text,
  title text,                                 -- nội dung/tên báo giá
  valid_until date,                            -- thời hạn báo giá
  status text not null default 'nhap'
    check (status in ('nhap', 'da_gui', 'da_chap_nhan', 'tu_choi', 'het_han')),
  total_value numeric(14, 0) not null default 0, -- cache, trigger mục 3 tự cập nhật
  note text,
  quote_file_path text,                       -- file .docx đã xuất (lưu lại bản đã gửi khách)
  converted_contract_id uuid references contracts(id) on delete set null, -- set khi đã "Tạo hợp đồng từ báo giá này"
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quotes_customer_id_idx on quotes (customer_id);
```

Mã `code` tự sinh mirror ĐÚNG `generate_customer_code()`/`generate_contract_code()` (sequence riêng `quote_code_seq`, prefix `BG-`). KHÔNG cần trường "số báo giá thật nhập tay" kiểu `contract_no` của hợp đồng — báo giá do chính app tạo ra từ đầu, không phải đối chiếu với văn bản giấy có sẵn từ trước, nên `code` tự sinh dùng làm số báo giá luôn.

### 2. Bảng `quote_items` (hạng mục báo giá) — KHÔNG bắt buộc gắn thiết bị có sẵn

```sql
create table quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  equipment_id uuid references equipment(id) on delete set null, -- NULL nếu thiết bị/khách chưa có trong /equipment
  item_name text not null,                    -- tên hạng mục/thiết bị (tự nhập, không phụ thuộc equipment_id)
  unit text,                                   -- đơn vị tính (cái, bộ...)
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(14, 0) not null default 0 check (unit_price >= 0),
  note text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index quote_items_quote_id_idx on quote_items (quote_id);
```

Khác hẳn `contract_equipment` (bảng nối, BẮT BUỘC `equipment_id`, không có `item_name` tự do): báo giá xảy ra TRƯỚC khi chắc chắn có hợp đồng, khách có thể còn chưa từng nhập thiết bị vào `/equipment` — nên `quote_items` phải tự chứa đủ thông tin hiển thị (`item_name`/`unit`) mà KHÔNG bắt buộc liên kết bản ghi thiết bị thật. `equipment_id` chỉ là liên kết TÙY CHỌN khi khách đã có sẵn thiết bị trong hệ thống (tiện tra cứu ngược sau này).

### 3. `quotes.total_value` — cache tự tính, mirror `sync_contract_paid_total()`

Trigger `after_quote_item_change_sync_total` (AFTER INSERT OR UPDATE OR DELETE on `quote_items`) → update `quotes.total_value = coalesce(sum(quantity * unit_price), 0)` theo `quote_id`. Không cho sửa `total_value` tay ở form.

### 4. RLS — mirror ĐÚNG quy ước `contracts`/`contract_equipment`

* `quotes`: select mọi user đã đăng nhập; insert/update admin+inspector; delete chỉ admin.
* `quote_items`: select mọi user đã đăng nhập; insert/update/delete admin+inspector (khác `contract_equipment` vốn chỉ có select/insert/delete — ở đây CẦN update vì sửa số lượng/đơn giá/tên hạng mục là thao tác chính, không lặp lại thiếu sót đã gặp ở migration 0030).

### 5. Audit log

Mở rộng `log_audit_event()` (đã có, không viết lại) sang `quotes` + `quote_items` — cùng lý do đã áp dụng cho `contracts`/`contract_payments`: dữ liệu tài chính, chi phí gắn thêm gần như 0.

### 6. UI — mirror cấu trúc thư mục `contracts/`

* `/quotes` — danh sách (lọc theo trạng thái/khách hàng, tìm theo `code`/tên khách), nút "+ Tạo báo giá", nav link mọi role (giống `/contracts`).
* `/quotes/new`, `/quotes/[id]/edit` — form: chọn khách hàng có sẵn (Select, giống `ContractForm`) HOẶC bấm "Khách chưa có trong hệ thống" chuyển sang 5 ô nhập tay (`customer_name_snapshot`/`customer_address_snapshot`/`customer_contact_snapshot`/ `customer_phone_snapshot`/`customer_tax_code_snapshot`) — nếu chọn khách có sẵn, tự điền sẵn 5 ô này từ bản ghi customer (vẫn cho sửa tay, vì là snapshot). `title`, `valid_until`, `status`, `note`.
* `/quotes/[id]` — trang chi tiết: thông tin chung + bảng `quote_items` (thêm/sửa/xóa hạng mục — KHÔNG cần dialog tìm-kiếm-thiết-bị bắt buộc như `AddEquipmentDialog`, mặc định thêm dòng trống nhập tay `item_name`/`unit`/`quantity`/`unit_price`, có nút phụ "Liên kết thiết bị có sẵn" tùy chọn nếu muốn gắn `equipment_id`), dòng "Tổng cộng" cuối bảng.
* Nút "Xuất báo giá" trên trang chi tiết — dựng file `.docx` bằng thư viện `docx` (như PROMPT-59 đã quyết định cho bảng kê, KHÔNG cần file mẫu tải lên). Nội dung tối thiểu: tên công ty (dùng lại thông tin/logo đã có ở `public/logo.png` + brand color), tiêu đề "BÁO GIÁ DỊCH VỤ KIỂM ĐỊNH KỸ THUẬT AN TOÀN", số báo giá (`code`), thông tin khách hàng (snapshot), bảng hạng mục (STT/Tên hạng mục/Đơn vị tính/Số lượng/Đơn giá/Thành tiền), tổng cộng, thời hạn báo giá, ghi chú "Đơn giá trên đã bao gồm thuế GTGT 8%." (đúng quy ước công ty đang dùng, xem skill `baogia-incosaf`/`soan-hop-dong-kiem-dinh` để nhất quán hình thức, dù KHÔNG dùng chung code).

### 7. "Tạo hợp đồng từ báo giá" — mirror pattern "Nhân bản thiết bị" (PROMPT-36)

* Nút chỉ hiện/bật khi `quote.customer_id` ĐÃ có giá trị (không NULL) — hợp đồng bắt buộc phải có khách hàng thật trong `/customers`, báo giá cho khách chưa tồn tại phải được gán vào 1 customer thật trước (sửa lại báo giá, chọn/tạo customer) mới tạo hợp đồng được. Khi bị chặn, hiện chú thích rõ lý do, không ẩn nút hoàn toàn mù mờ.
* Trỏ tới `/contracts/new?fromQuote=<quote_id>` — mirror ĐÚNG cách `equipment/new` đọc `duplicateFrom` (PROMPT-36): `ContractForm mode="create"` điền sẵn `customer_id`/`title`/`note` từ báo giá.
* Sau khi `ContractForm` insert xong `contracts` (có `id`), nếu có `fromQuote`: bulk-insert `contract_equipment` từ CÁC `quote_items` CÓ `equipment_id` (bỏ qua item không có `equipment_id` — thiết bị đó chưa tồn tại trong `/equipment`, không thể tạo dòng `contract_equipment` hợp lệ), copy `quantity`/`unit_price` sang. Sau khi tạo hợp đồng thành công, update `quotes.converted_contract_id = <contract.id>` và `quotes.status = 'da_chap_nhan'` (nếu chưa phải trạng thái đó).
* Nếu có item bị bỏ qua (không có `equipment_id`), toast báo rõ số lượng hạng mục cần thêm tay vào hợp đồng sau (vd "Đã tạo hợp đồng, còn 2 hạng mục chưa có thiết bị trong hệ thống — thêm tay ở phần Thiết bị trong hợp đồng"), KHÔNG lặng lẽ bỏ qua.
* Trang chi tiết báo giá hiện link "Đã tạo hợp đồng: `<code>`" (trỏ `/contracts/<id>`) khi `converted_contract_id` có giá trị.

## Ngoài phạm vi — KHÔNG làm trong PROMPT này

* Không kiểm tra đơn giá tối thiểu theo Thông tư 41 (backlog, đánh giá riêng sau).
* Không tự động gửi báo giá qua email/Zalo — chỉ xuất file, gửi tay như hiện tại.
* Không đồng bộ lại `customer_name_snapshot`... nếu customer gốc đổi thông tin sau khi báo giá đã tạo (đúng bản chất snapshot).
* Không cho "Tạo hợp đồng" nhiều lần từ 1 báo giá (chỉ 1 `converted_contract_id`) — nếu `converted_contract_id` đã có giá trị, ẩn/disable nút, hiện link tới hợp đồng đã tạo thay vào đó.

## Kiểm thử

* Tạo báo giá cho khách ĐÃ có trong `/customers` → xác nhận 5 ô snapshot tự điền đúng, sửa tay được, không đổi dữ liệu bảng `customers` gốc.
* Tạo báo giá cho khách CHƯA có (nhập tay 5 ô) → lưu đúng, `customer_id` NULL.
* Thêm hạng mục không gắn thiết bị (`item_name` tự do) + hạng mục có gắn `equipment_id` → xác nhận `total_value` tự tính đúng tổng.
* Xuất file `.docx` → mở lại đúng nội dung, đúng tổng.
* Báo giá có `customer_id` NULL → nút "Tạo hợp đồng" bị chặn đúng, có chú thích lý do.
* Báo giá có `customer_id` → bấm "Tạo hợp đồng" → xác nhận hợp đồng mới điền sẵn đúng khách/tiêu đề, `contract_equipment` có đủ các dòng từ item có `equipment_id`, item không có `equipment_id` bị bỏ qua kèm toast báo đúng số lượng, `quotes.converted_contract_id` + `status` cập nhật đúng.
* Test RLS qua `pg_policies` như các PROMPT trước.
