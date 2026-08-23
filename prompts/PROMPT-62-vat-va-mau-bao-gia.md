# PROMPT-62: Đồng bộ quy ước VAT Báo giá ⇄ Hợp đồng + làm lại file xuất Báo giá đúng mẫu thật

## Bối cảnh (để Claude Code hiểu, không cần hỏi lại)

Xuất phát từ 2 việc:

1. Anh Hải phản hồi file "Xuất báo giá" (PROMPT-60) quá đơn giản, gửi mẫu thật `Mau_Bao_Gia_INCERT.pdf` đang dùng thực tế (logo, letterhead, căn cứ pháp lý, "địa điểm thực hiện", bảng 3 dòng tổng "Cộng chưa VAT/Thuế VAT (8%)/TỔNG CỘNG", khối ký tên) — khác hẳn bảng đơn giản hiện có.
2. Khi thiết kế lại theo mẫu đó, phát sinh: `quote_items.unit_price` phải đổi ý nghĩa từ "đã gồm VAT" sang "CHƯA gồm VAT". Anh Hải sau đó yêu cầu thêm: đơn giá giữ hợp đồng và báo giá phải giống nhau — tức `contract_equipment.unit_price` (PROMPT-59) cũng phải đổi sang "CHƯA gồm VAT" để nhất quán, không chỉ đổi riêng báo giá. Đã xác nhận với anh Hải: hiện chưa có hợp đồng thật nào nhập đơn giá/số lượng thật qua dialog "Sửa" (PROMPT-59) — mọi `contract_equipment.unit_price` thật vẫn đang là 0 mặc định — nên đổi quy ước này AN TOÀN, không cần backfill số liệu cũ.

Vì đổi quy ước ở CẢ 2 bảng, PROMPT này chạm vào 4 chỗ, không chỉ file báo giá: (A) migration đổi 2 trigger tính tổng, (B) bỏ bước nhân VAT ở luồng "Tạo hợp đồng từ báo giá" (không cần nữa vì giờ cùng đơn vị), (C) làm lại `quote-export.ts` theo mẫu thật, (D) sửa 2 file xuất của Hợp đồng đang dùng đơn giá dòng để khỏi bị lệch số khi cộng — `contract-equipment-list.ts` (PROMPT-59, ĐÃ merge master) và `contract-acceptance.ts` (PROMPT-61, CHƯA commit — vẫn sửa kịp, không phải revert sau).

Lưu ý về pháp nhân: mẫu báo giá dùng tên "CÔNG TY CỔ PHẦN KIỂM ĐỊNH KỸ THUẬT AN TOÀN INCERT" (Số 12 Đầm Sen 20, phường Ngũ Hành Sơn, TP. Đà Nẵng) — khác với "INCOSAF" đã hardcode ở PROMPT-61 cho Biên bản nghiệm thu. Đây là 2 pháp nhân/chi nhánh khác nhau anh Hải đang vận hành — mục C dưới đây CHỈ dùng thông tin INCERT cho báo giá, KHÔNG đổi hằng số INCOSAF đã có.

## A. Migration mới — đổi quy ước VAT (2 bảng) + thêm "Địa điểm thực hiện"

`supabase/migrations/0034_vat_convention_and_site_location.sql`:

```sql
-- Phần 1: thêm "Địa điểm thực hiện" (tên nhà máy/công trình, tùy chọn) trên
-- quotes -- mẫu báo giá thật có dòng này, quotes hiện chưa có cột tương ứng.
alter table quotes
  add column site_location text;

-- Phần 2: đổi ý nghĩa quote_items.unit_price từ "đã gồm VAT" sang "CHƯA gồm
-- VAT" (khớp mẫu báo giá thật, có 3 dòng tổng riêng). An toàn vì production
-- đang có 0 báo giá (xác nhận ở PROMPT-60) -- không cần backfill.
create or replace function public.sync_quote_total_value()
returns trigger
language plpgsql
as $$
declare
  target_quote_id uuid;
begin
  target_quote_id := coalesce(new.quote_id, old.quote_id);

  update quotes
    set total_value = round(coalesce(
      (select sum(quantity * unit_price) from quote_items where quote_id = target_quote_id),
      0
    ) * 1.08)
    where id = target_quote_id;

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Phần 3: ĐỒNG BỘ -- đổi ý nghĩa contract_equipment.unit_price từ "chưa có
-- quy ước rõ ràng" (PROMPT-59) sang "CHƯA gồm VAT" y hệt quote_items, theo
-- yêu cầu anh Hải "đơn giá giữ hợp đồng và báo giá như nhau". An toàn vì đã
-- xác nhận với anh Hải: CHƯA có hợp đồng thật nào nhập đơn giá/số lượng
-- thật qua dialog "Sửa" -- mọi contract_equipment.unit_price thật vẫn là 0
-- mặc định, không cần backfill.
create or replace function public.sync_contract_total_value()
returns trigger
language plpgsql
as $$
declare
  target_contract_id uuid;
begin
  target_contract_id := coalesce(new.contract_id, old.contract_id);

  update contracts
    set total_value = round(coalesce(
      (select sum(quantity * unit_price) from contract_equipment where contract_id = target_contract_id),
      0
    ) * 1.08)
    where id = target_contract_id;

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
```

Không cần drop/create lại 2 trigger (`after_quote_item_change_sync_total`, `after_contract_equipment_change_sync_total`) — cả 2 đã trỏ vào đúng 2 function này từ trước, `CREATE OR REPLACE` giữ nguyên OID nên tự áp dụng logic mới, mirror đúng cách migration 0029 đã vá `audit_log`. Không cần RLS/audit mới (cột `site_location` được cover bởi policy row-level đã có; không đổi cấu trúc bảng nào khác).

⚠️ Lưu ý riêng cho `HD-2026-003` (hợp đồng thật duy nhất trong production, đã ghi nhận từ PROMPT-59): `total_value` của hợp đồng này ĐANG lệch (150.000.000đ, giá trị nhập tay cũ từ trước PROMPT-59) vì chưa có dòng `contract_equipment` nào bị sửa/thêm/xóa — trigger chưa có dịp chạy lại. Điều này KHÔNG đổi sau migration này (đúng như đã chốt trước đó, không backfill) — sẽ tự đúng khi ai đó mở dialog "Sửa" nhập lại số lượng/đơn giá thật (lúc đó sẽ hiểu là giá CHƯA VAT).

Migration KHÔNG idempotent — rollback: `alter table quotes drop column if exists site_location;` + trả lại 2 function về đúng thân hàm gốc (bỏ `round(... * 1.08)`, dùng lại `coalesce(...)` trực tiếp như migration 0032/0031 gốc).

## B. Bỏ bước nhân VAT ở luồng "Tạo hợp đồng từ báo giá" — giờ copy thẳng 1:1

Sửa `src/app/(dashboard)/contracts/contract-form.tsx`, đoạn copy `quote_items` → `contract_equipment` (trong khối `if (fromQuoteId) { ... }`) — giữ nguyên `unit_price: i.unit_price` không nhân gì cả, vì sau migration A, cả 2 bảng đều lưu giá CHƯA VAT — copy thẳng là đúng.

## C. Viết lại `buildQuoteDocx()` trong `src/lib/reports/quote-export.ts` — theo ĐÚNG mẫu thật

### C1. Thông tin công ty cho letterhead — hằng số mới

Tạo `src/lib/reports/company-info.ts`:

```ts
export const INCERT_COMPANY = {
  name: "CÔNG TY CỔ PHẦN KIỂM ĐỊNH KỸ THUẬT AN TOÀN INCERT",
  address: "Số 12 Đầm Sen 20, phường Ngũ Hành Sơn, TP. Đà Nẵng",
  email: "incertjsc@gmail.com",
  hotline: "0936565579",
};
```

Logo: dùng lại `public/logo.png` có sẵn (không cần Hải upload logo mới). Hàm build chạy client-side (`"use client"`), lấy ảnh qua `fetch("/logo.png").then(r => r.arrayBuffer())` rồi truyền vào `ImageRun`. Đọc thử kích thước gốc thật của file (không đoán tỉ lệ) để tính `transformation.width/height` giữ đúng khung hình — chiều cao gợi ý ~50-60px trong trang A4.

### C2. Header/Footer lặp lại mỗi trang (dùng `Header`/`Footer` thật của `docx`, KHÔNG paste thủ công)

1 dòng in nghiêng, cỡ nhỏ, căn giữa, phía trên có đường kẻ ngang mảnh: `"<INCERT_COMPANY.name> – <INCERT_COMPANY.address> – Email: <INCERT_COMPANY.email> – Hotline: <INCERT_COMPANY.hotline>"` — dùng `Footer` để lặp lại mọi trang tự động (mẫu trang 2 gần như trống, chỉ có khối ký tên + dòng này).

### C3. Letterhead (đầu trang 1 — nội dung thường, KHÔNG phải Header của docx)

Layout 2 "cột" (bảng không viền `borders: NONE`, hoặc 2 `Paragraph` cạnh nhau — chọn cách nào ra đúng layout nhất):

* Trái: logo (`ImageRun`).
* Phải, màu `#13577E` (brand primary đã dùng cho `--primary` trong `globals.css` — KHÔNG dùng `#1F4E79` của skill INCOSAF, 2 pháp nhân khác nhau):
  * `INCERT_COMPANY.name` — bold.
  * `Địa chỉ: <INCERT_COMPANY.address>`.
  * `Email: <INCERT_COMPANY.email> • Hotline: <INCERT_COMPANY.hotline>`.
* Dưới cùng: đường kẻ ngang dày màu `#13577E` ngăn cách letterhead với phần quốc hiệu.

### C4. Nội dung chính — ĐÚNG thứ tự, không bỏ/thêm/đổi câu chữ trừ chỗ điền dữ liệu động

1. Quốc hiệu tiêu ngữ (căn giữa): "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" (bold) / "Độc lập - Tự do - Hạnh phúc" (bold) / "---o0o---".
2. Tiêu đề "BÁO GIÁ" — in hoa, đậm, cỡ lớn, màu `#13577E`, căn giữa.
3. Phụ đề in nghiêng đậm, căn giữa: "Dịch vụ kiểm định kỹ thuật an toàn thiết bị".
4. "Số: `<quote.code>`" — dùng nguyên mã tự sinh của app (vd `BG-2026-001`), KHÔNG đổi format cho giống khung điền tay `BG-......./......../INCERT` của mẫu giấy — mirror cách các file export khác trong app luôn in mã hệ thống thật.
5. "V/v: `<quote.title hoặc "Báo giá dịch vụ kiểm định kỹ thuật an toàn" nếu title trống>`".
6. "Kính gửi: `<quote.customer_name_snapshot>`" — bold nhãn, tên khách giữ nguyên như đã nhập, KHÔNG ép in hoa.
7. "Địa chỉ: `<quote.customer_address_snapshot>`" — bỏ dòng nếu rỗng.
8. "Địa điểm thực hiện: `<quote.site_location>`" — CHỈ in nếu có giá trị (field mới ở mục D), bỏ hẳn dòng nếu trống.
9. "Căn cứ:" (bold), 2 gạch đầu dòng cố định (đã chốt với Hải, không thêm field chọn loại dịch vụ):
   * "Thông tư số 41/2016/TT-BLĐTBXH ngày 11/11/2016 của Bộ Lao động - Thương binh và Xã hội quy định giá tối thiểu đối với dịch vụ kiểm định kỹ thuật an toàn lao động máy, thiết bị, vật tư và các chất có yêu cầu nghiêm ngặt về an toàn lao động;"
   * "Nhu cầu kiểm định kỹ thuật an toàn thiết bị của Quý khách hàng."
10. Đoạn giới thiệu: "`<INCERT_COMPANY.name>` trân trọng gửi tới Quý khách hàng bảng báo giá dịch vụ kiểm định kỹ thuật an toàn như sau:".
11. Bảng báo giá — cột: STT | Tên công việc / hạng mục | ĐVT | Số lượng | Đơn giá (VNĐ) | Thành tiền (VNĐ). Header nền `#13577E`, chữ trắng, đậm, căn giữa. Dòng hạng mục từ `items` (`item_name`/`unit || "—"`/`quantity`/`unit_price`/`quantity*unit_price`) — GIỮ NGUYÊN logic hiện có (đơn giá hiển thị đúng là giá chưa VAT lưu trong DB, không đổi gì ở đây). Sau dòng hạng mục cuối, 3 dòng tổng (label ở cột gộp `columnSpan` 5 cột đầu, số ở cột cuối — PHẢI dùng `columnSpan` không chỉ set `width`, cùng lỗi kỹ thuật docx-js đã ghi nhận ở PROMPT-59/61):
    * "Cộng chưa VAT:" — `SUM(quantity × unit_price)` tính trực tiếp từ `items` (không lấy từ `quote.total_value`, tính độc lập để khớp đúng bảng đang hiển thị).
    * "Thuế VAT (8%):" — `round(Cộng chưa VAT × 0.08)`.
    * "TỔNG CỘNG:" — Cộng chưa VAT + Thuế VAT (KHÔNG lấy lại `quote.total_value`; nếu số này khác `quote.total_value` trên trang chi tiết thì đó là dấu hiệu cần kiểm tra lại trigger). Nổi bật hơn 2 dòng trên: nền `#13577E`, chữ trắng, đậm, CẢ label lẫn giá trị.
12. "GHI CHÚ:" (bold) + danh sách đánh số:
    1. "Đơn giá trên chưa bao gồm chi phí di chuyển, lưu trú (nếu có) – sẽ thỏa thuận thêm theo thực tế."
    2. "Thuế VAT 8% áp dụng theo quy định hiện hành."
    3. "Thời gian thực hiện: Sau khi nhận được xác nhận hợp đồng và đủ điều kiện triển khai."
    4. "Kết quả: Cấp đầy đủ hồ sơ kiểm định theo quy định."
    5. CHỈ thêm nếu `quote.valid_until` có giá trị: "Báo giá có hiệu lực đến hết ngày `<valid_until>`."
    * Nếu `quote.note` có giá trị, thêm 1 đoạn riêng sau khối GHI CHÚ (giữ hành vi cũ, không đổi).
13. Khối ký tên — CĂN PHẢI (chỉ 1 bên ký, không phải bảng 2 cột như Biên bản nghiệm thu):
    * "Đà Nẵng, ngày `<ngày xuất>` tháng `<tháng xuất>` năm `<năm xuất>`" — in nghiêng (dùng thời điểm lúc xuất file, `quotes` không có cột ngày ký riêng).
    * "`<INCERT_COMPANY.name>`" — bold, ngay dưới, KHÔNG thêm dòng chi nhánh/chức danh nào khác (mẫu thật chỉ có đúng 2 dòng ở khối ký tên).

### C5. Font/khổ giấy

Times New Roman toàn văn bản, khổ A4 (11907×16840 dxa), margin: top 900 / right 850 / bottom 1000 / left 1701 (dxa, đúng skill `baogia-incosaf` gốc). Cỡ chữ thân bài 20 (10pt, half-point của `docx`), tiêu đề "BÁO GIÁ" cỡ lớn hơn rõ rệt (~32, 16pt). (Cỡ chữ này KHÁC cỡ 26 đã dùng ở Biên bản nghiệm thu PROMPT-61 — 2 loại văn bản khác nhau, không cần nhất quán cỡ chữ giữa 2 file.)

## D. Thêm trường "Địa điểm thực hiện" vào form + trang chi tiết báo giá

* `src/lib/quotes/form-schema.ts`: thêm `site_location: z.string().trim().optional()`.
* `src/app/(dashboard)/quotes/quote-form.tsx`: thêm `<FormField name="site_location">` (Input, label "Địa điểm thực hiện (nếu có)", placeholder "Tên nhà máy/công trình") — sau field `title`, trước `valid_until`.
* `src/app/(dashboard)/quotes/types.ts`: thêm `site_location: string | null;` vào `QuoteRecord`.
* `src/app/(dashboard)/quotes/[id]/page.tsx`: thêm `site_location` vào `select(...)` của `quotes`; thêm `<InfoField label="Địa điểm thực hiện" value={quote.site_location} />`; truyền vào prop `quote` của `<ExportQuoteButton>`.
* `src/lib/reports/quote-export.ts` (`QuoteExportInput`): thêm `site_location: string | null;`.

## E. Sửa `contract-equipment-list.ts` (PROMPT-59, bảng kê thiết bị — ĐÃ trên master) — thêm 3 dòng VAT

Vì `contract_equipment.unit_price` giờ là giá CHƯA VAT (mục A), dòng "Tổng cộng" hiện tại (`Tổng cộng` = `SUM(quantity*unit_price)`, không cộng VAT) sẽ THIẾU 8% so với số khách thực trả nếu để nguyên. Sửa `src/lib/reports/contract-equipment-list.ts`: đổi 1 dòng "Tổng cộng" hiện có thành 3 dòng, mirror ĐÚNG cấu trúc mới ở mục C4 #11 (Cộng chưa VAT / Thuế VAT (8%) / TỔNG CỘNG, cùng cách `columnSpan`, cùng cách tính từ `equipment` trực tiếp không lấy `contract.total_value`). Giữ nguyên phần còn lại của file (cột Mã hiệu/Số chế tạo/Số tem/Ngày kiểm định không đổi).

## F. Sửa `contract-acceptance.ts` (PROMPT-61, Biên bản nghiệm thu — CHƯA commit) — khớp số hiển thị

KHÔNG đổi cấu trúc 16 mục đã chốt, KHÔNG đổi label "Tổng cộng (đã bao gồm thuế GTGT 8%):" — đây là văn bản pháp lý port nguyên văn từ skill `skil-bb-nt` đã dùng thật, không tự ý thêm/bớt dòng như mục E. Vấn đề CHỈ nằm ở cột "Đơn giá (đồng)"/"Thành tiền (đồng)" từng dòng thiết bị (mục 10 của PROMPT-61): nếu hiển thị đúng số lưu trong `contract_equipment.unit_price` (giờ là giá CHƯA VAT) thì cộng các dòng lại sẽ KHÔNG khớp dòng "Tổng cộng (đã bao gồm thuế GTGT 8%)" (dòng tổng này lấy từ `contract.total_value`, đã tự động gồm VAT nhờ trigger sửa ở mục A — không cần đổi gì ở chỗ lấy tổng).

Sửa: ở bảng "1. KHỐI LƯỢNG CÔNG VIỆC NGHIỆM THU", cột "Đơn giá (đồng)" và "Thành tiền (đồng)" hiển thị số ĐÃ NHÂN VAT cho từng dòng — CHỈ đổi cách HIỂN THỊ trong file này, KHÔNG đổi số lưu trong DB:

```
const unitPriceWithVat = Math.round(row.unit_price * 1.08);
```

dùng `unitPriceWithVat` (và `quantity * unitPriceWithVat`) để in vào 2 cột đó, thay vì `row.unit_price` thô. Như vậy mọi số trên trang đều nhất quán (đã gồm VAT), khớp đúng label đã có, và số tiền bằng chữ (mục 11 của PROMPT-61, đọc từ `contract.total_value`) vẫn đúng như thiết kế ban đầu — không cần đổi hàm `numberToVietnameseWords()` hay nguồn dữ liệu nó đọc.

## Ngoài phạm vi — KHÔNG làm trong PROMPT này

* Không thêm trường "loại dịch vụ" để chọn căn cứ pháp lý khác nhau — đã chốt, luôn in căn cứ kiểm định.
* Không tách bảng báo giá thành "I. Kiểm định / II. Huấn luyện" — INCERT không có dịch vụ huấn luyện.
* Không tự động tính đơn giá theo Thông tư 41 — quyết định cũ ở PROMPT-60 vẫn giữ.
* Không đổi format "Số:" của báo giá thành khung điền tay giống mẫu giấy.
* Không sửa `soan-hop-dong-kiem-dinh` (skill Cowork, ngoài app) hay hằng số INCOSAF ở `contract-acceptance.ts`.

## Kiểm thử

* Render `.docx` báo giá ra ảnh xem lại bằng mắt, so trực tiếp với `Mau_Bao_Gia_INCERT.pdf`: logo đúng tỉ lệ, letterhead 2 cột đúng vị trí, quốc hiệu/tiêu đề/căn cứ/bảng/ghi chú/chữ ký đúng thứ tự và nội dung, footer lặp đúng mọi trang.
* `site_location` có/không có → dòng "Địa điểm thực hiện" hiện đúng/ẩn đúng ở cả form, trang chi tiết, và file xuất.
* Tạo 1 báo giá 2-3 hạng mục, đối chiếu tay "Cộng chưa VAT"/"Thuế VAT (8%)"/"TỔNG CỘNG" trong file khớp công thức và khớp `quote.total_value` trên trang chi tiết (trigger migration A).
* Bấm "Tạo hợp đồng từ báo giá" → xác nhận `contract_equipment.unit_price` tạo ra BẰNG ĐÚNG `quote_items.unit_price` (copy thẳng, không nhân gì) — đối chiếu tay bằng SQL hoặc UI.
* Xuất bảng kê thiết bị (mục E) trên 1 hợp đồng có ≥2 thiết bị đã nhập đơn giá → 3 dòng tổng đúng công thức, không tràn lề, cột thẳng hàng.
* Xuất Biên bản nghiệm thu (mục F) trên 1 hợp đồng có đơn giá → cột "Đơn giá"/"Thành tiền" từng dòng CỘNG LẠI đúng khớp dòng "Tổng cộng (đã bao gồm thuế GTGT 8%)", không lệch; số tiền bằng chữ vẫn đúng như PROMPT-61 đã test.
* Xác nhận `HD-2026-003` không bị ảnh hưởng bất thường (vẫn lệch như ghi chú cũ cho tới khi ai đó sửa dòng thiết bị thật — không phải bug mới).
* `tsc --noEmit` + `npm run build` sạch.
* Test RLS: inspector sửa được `site_location` qua form (policy `quotes_update_admin_or_inspector` có sẵn).
