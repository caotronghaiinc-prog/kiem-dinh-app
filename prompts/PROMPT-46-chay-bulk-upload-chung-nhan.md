# PROMPT-46: Chạy migration 0025+0026 và bulk-upload 33 giấy chứng nhận hiệu chuẩn

Mentor đã đọc thủ công toàn bộ 34 file PDF trong `giay-chung-nhan-hieu-chuan/`,
khớp với `inspection_tools` theo số chế tạo/serial, và anh Hải đã xác nhận mapping
qua chat. Việc còn lại là 3 bước sau, KHÔNG cần đọc/viết code mới.

## 1. Chạy 2 migration trên SQL Editor (nếu chưa chạy)

Theo đúng thứ tự:
1. `supabase/migrations/0025_inspection_tool_calibrations.sql` (nếu anh Hải
   CHƯA chạy trước đó -- kiểm tra bằng cách thử `select 1 from
   inspection_tool_calibrations limit 1;`, nếu báo lỗi "relation does not
   exist" thì chưa chạy).
2. `supabase/migrations/0026_seed_3_dung_cu_ndt_be_tong.sql` (thêm DC-049,
   DC-050, DC-051).

## 2. Xác nhận folder chứng nhận đã có ở gốc repo

```
ls "giay-chung-nhan-hieu-chuan" | wc -l
```

Phải ra 34 (34 file PDF, xem `scripts/bulk-upload-calibration-certs.js` để biết
danh sách chi tiết).

## 3. Chạy script bulk-upload

Từ gốc repo (Node >= 20.6, không cần cài thêm gói gì -- `@supabase/supabase-js`
đã có sẵn trong `package.json`, dùng `--env-file` có sẵn của Node để đọc
`.env.local`):

```
node --env-file=.env.local scripts/bulk-upload-calibration-certs.js
```

Script sẽ:
- Upload từng file PDF lên bucket Storage `inspection-files` (bucket đã có sẵn
  từ migration 0009), path `tool-certs/<tool_id>/<uuid>.pdf`.
- Insert 1 dòng `inspection_tool_calibrations` cho mỗi file (33 dòng -- bỏ qua
  "Can treo dien tu 2.pdf" vì là bản scan trùng lặp với file 1).
- Trigger `sync_tool_after_calibration()` (migration 0025) tự cập nhật
  `inspection_tools.calibration_due_date`/`calibration_cert_no` -- KHÔNG cần
  sửa gì thêm ở `/tools`.
- In ra log từng dòng `[OK]`/`[LỖI]`/`[BỎ QUA - đã có]`, tổng kết ở cuối. Script
  idempotent theo `(tool_id, cert_no)` -- chạy lại nhiều lần an toàn, không tạo
  trùng.

## 4. Xác nhận kết quả

Sau khi chạy xong, báo lại cho anh Hải:
- Số dòng "OK" (kỳ vọng 33 nếu chạy lần đầu).
- Có dòng "[LỖI]" nào không -- nếu có, dán nguyên văn lỗi để mentor xem lại (khả
  năng cao là do migration 0025/0026 chưa chạy, hoặc thiếu file PDF).
- Vào `/tools` kiểm tra nhanh 2-3 dụng cụ bất kỳ (vd DC-001, DC-013, DC-049) --
  mục "Lịch sử hiệu chuẩn" phải thấy dòng vừa thêm, bấm "Xem file" mở đúng PDF.

KHÔNG commit `.env.local` hay bất kỳ giá trị service role key nào lên git.
