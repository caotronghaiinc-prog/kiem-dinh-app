# INCERT AI OS — PROGRESS TRACKER
> Cập nhật file này sau mỗi buổi làm việc.
> Paste cùng với PROJECT_CONTEXT.md khi mở chat mới.

---

## TRẠNG THÁI TỔNG QUAN
**Phase hiện tại:** Phase 1 — CRM & Nền móng  
**Tuần hiện tại:** Tuần 5-6 — Hoàn thiện  
**Cập nhật lần cuối:** 11/08/2026

---

## ✅ ĐÃ HOÀN THÀNH

### Thiết kế & Kiến trúc
- [x] Xác định scope dự án: KTAT + Thiết bị XD + NDT
- [x] Chốt 6 module: M1-CRM · M2-HĐ/TC · M3-KĐ/BB · M4-TBĐo · M5-Lịch · M6-BC
- [x] Chốt tech stack: Next.js 14 + Supabase + Vercel + Claude API
- [x] Chốt lộ trình 3 Phase (6 tháng)
- [x] Chốt database schema Phase 1
- [x] Tạo PRD Phase 1 (file Word)
- [x] Tạo PROJECT_CONTEXT.md
- [x] Tạo PROGRESS.md (file này)

---

## 🔄 ĐANG LÀM

- [ ] **[PROMPT-14]** Responsive mobile

---

## ⏳ VIỆC TIẾP THEO — Phase 1

### Tuần 1: Setup nền móng — ✅ HOÀN THÀNH (08/2026)
- [x] Tạo tài khoản GitHub, Supabase, Vercel
- [x] **[PROMPT-01]** Khởi tạo project Next.js 14 + TypeScript + shadcn/ui + Tailwind (gộp luôn kết nối Supabase)
  - Repo: `caotronghaiinc-prog/kiem-dinh-app`
  - shadcn/ui viết tay thủ công (registry ui.shadcn.com bị chặn trong sandbox Claude Code — không ảnh hưởng chất lượng, chỉ cần lưu ý khi thêm component mới sau này)
- [x] Kết nối Supabase + tạo database schema Phase 1 (4 bảng: customers, equipment, inspection_history, profiles)
  - Supabase project: `incert-ai-os`, region Singapore (ap-southeast-1)
  - Project ID: `bgdnvgcyxmtbzluuiawv`
  - Dùng bộ key "Legacy anon/service_role" (không dùng hệ mới publishable/secret) để khớp code
- [x] Deploy lần đầu lên Vercel — THÀNH CÔNG
  - URL production: https://kiem-dinh-app.vercel.app
  - Team Vercel: INCERT (gói Hobby — cân nhắc nâng Pro khi vận hành chính thức)
  - Trang /test-connection xác nhận: "Thành công — Đã kết nối thành công tới Supabase project"
- [x] **[PROMPT-03]** Setup Supabase Auth + phân quyền 2 vai trò (Admin/Kiểm định viên)
  - Migration: `supabase/migrations/0002_auth_rls.sql`
  - Cột `is_locked` (boolean) đã thêm vào `inspection_history` — chỗ móc cho M3 Phase 2 (xuất phiếu chứng nhận tự động khóa)
  - Trigger tự tạo `profiles` khi có user mới trong `auth.users`
  - Trigger chặn user tự đổi role/active của chính mình
  - RLS đầy đủ cho 4 bảng theo ma trận: Admin toàn quyền, Inspector chỉ sửa được equipment + inspection_history (không xóa), không sửa được customers, không sửa được inspection_history đã `is_locked = true`
  - Middleware bảo vệ toàn bộ route, chưa đăng nhập → redirect /login
  - Trang /login, /unauthorized, nút Đăng xuất, hiển thị role trên dashboard
  - Đã test qua Preview URL: middleware chặn đúng, login/logout hoạt động, 2 role hiển thị đúng trên UI
  - Đã merge vào master
  - 2 tài khoản test: caotronghai.inc@gmail.com (admin), caotronghai.incosaf@gmail.com (inspector)

### Tuần 2: CRUD Khách hàng
- [x] **[PROMPT-04]** Màn hình danh sách khách hàng (tìm kiếm, lọc, phân trang)
- [x] **[PROMPT-05]** Form thêm/sửa khách hàng (validation đầy đủ)
- [x] **[PROMPT-06]** Trang chi tiết khách hàng (4 tab)

### Tuần 3: CRUD Thiết bị — ✅ HOÀN THÀNH
- [x] **[PROMPT-07]** Màn hình danh sách thiết bị (lọc theo loại, trạng thái hạn)
- [x] **[PROMPT-08]** Form thêm/sửa thiết bị (gắn với KH, màu trạng thái hạn)
- [x] **[PROMPT-09]** Trang chi tiết thiết bị + lịch sử KĐ

### Tuần 4: Dashboard — ✅ HOÀN THÀNH
- [x] **[PROMPT-10]** Dashboard 4 widget chính
- [x] ~~**[PROMPT-11]**~~ Widget cảnh báo hạn KĐ (đỏ/vàng/xanh) — **đã gộp vào Widget 1 của PROMPT-10** (đếm 3 màu + danh sách 5 thiết bị hạn gần nhất, tính qua `getExpiryStatus()`), không cần làm PROMPT-11 riêng nữa
- [x] **[PROMPT-12]** Nút soạn tin nhắn Zalo qua AI — dùng **OpenAI** (ngoại lệ riêng cho tính năng này, xem ghi chú bên dưới), không phải Claude API như tên gọi gốc trong kế hoạch

### Tuần 5-6: Hoàn thiện
- [x] **[PROMPT-13]** Tìm kiếm toàn hệ thống
- [x] Logo + màu thương hiệu chính thức (bổ sung, không phải PROMPT đánh số gốc) — xem ghi chú bên dưới
- [ ] **[PROMPT-14]** Responsive mobile
- [ ] **[PROMPT-15]** Kiểm tra phân quyền 4 vai trò

### Tuần 7-8: Deploy & Onboard
- [ ] **[PROMPT-16]** Deploy Vercel production
- [ ] **[PROMPT-17]** Hướng dẫn sử dụng cho team
- [ ] Onboard 10 người dùng

---

## ❌ VẤN ĐỀ / BLOCKERS

*Chưa có*

---

## 📝 GHI CHÚ QUAN TRỌNG

- AI chỉ soạn thảo văn bản — KĐV quyết định chuyên môn
- Tích hợp MISA + Cổng DVC Bộ NV để sau (Phase 3+)
- Thí nghiệm XD (19 chỉ tiêu) bổ sung sau Phase 3
- Hóa đơn điện tử: tích hợp VNPT/Viettel ở Phase 3
- Sandbox Claude Code bị chặn network ra ngoài (ui.shadcn.com, supabase.co...) — không test được kết nối thật trong sandbox, phải deploy lên Vercel mới xác nhận được. Đây là giới hạn môi trường, không phải lỗi code.
- GitHub App của Claude cần cài thủ công qua https://github.com/apps/claude (lệnh /install-github-app không khả dụng trong môi trường đang dùng)
- Auth + RLS (2 role admin/inspector) đã xong, đã test qua Preview URL và merge vào master
- Cột is_locked đã có sẵn trong inspection_history, chờ M3 (Phase 2) gắn vào nút "Xuất phiếu chứng nhận"
- RLS phần "chặn xóa" mới xác nhận qua đọc policy, chưa test trực quan bằng UI thật (vì UI CRUD chưa có) — sẽ verify lại khi làm PROMPT-04/05
- 2 tài khoản test: caotronghai.inc@gmail.com (admin), caotronghai.incosaf@gmail.com (inspector)
- **Phân quyền `customers` đã đổi** (migration `0005_customers_insert_inspector.sql`): Admin CRUD toàn quyền. Inspector: chỉ **Tạo mới** được, KHÔNG Sửa/Xóa (kể cả bản ghi tự tạo). Accountant/Office: chưa triển khai policy riêng, để sau. Chi tiết + câu SQL chạy tay ở README mục 11.
- **PROMPT-12 dùng OpenAI, không phải Claude API** — đây là NGOẠI LỆ chỉ áp dụng cho tính năng soạn tin nhắn Zalo (API key OpenAI mua tạm để test). Mọi tính năng AI khác của dự án (M3 soạn biên bản, Phase 2...) vẫn giữ nguyên kế hoạch gốc dùng Claude API. Code đã tách riêng lệnh gọi provider vào `src/lib/ai/draft-message.ts` để sau này đổi sang Claude chỉ cần sửa 1 file này.
- **⚠️ Cần làm thủ công**: biến `OPENAI_API_KEY` mới thêm khung (rỗng) vào `.env.local`/`.env.example` — phải tự lấy key thật tại platform.openai.com rồi điền vào `.env.local` để test local, VÀ thêm vào Vercel (Project Settings → Environment Variables) để chạy được trên production/preview. Khác với `E2E_TEST_LOGIN_SECRET` (biến đó KHÔNG được đặt trên Vercel).
- **Logo + màu thương hiệu**: `public/logo.png` (wordmark đầy đủ, dùng ở header + `/login`) và `src/app/icon.png` (crop vuông riêng phần icon ngôi sao + "IN" — dùng làm favicon qua quy ước file metadata của Next.js, wordmark ngang gốc quá dẹt để làm favicon dễ đọc). Màu thương hiệu #13577E (đậm) làm `--primary`, #36B4E7 (sáng) CHỈ dùng cho `--ring` + tint nhạt của `--accent` — không dùng #36B4E7 làm nền nút chữ trắng vì tương phản chỉ 2.38:1 (dưới chuẩn WCAG AA 4.5:1), trong khi #13577E đạt 7.8:1. Chỉ đổi 3 biến `--primary`/`--accent`/`--ring` trong `globals.css`, không đụng màu ngữ nghĩa (đỏ/vàng/xanh lá đã dùng cho trạng thái hạn kiểm định).

---

## 📋 PROMPT LIBRARY

| ID | Tên Prompt | Trạng thái | Ghi chú |
|----|-----------|------------|---------|
| PROMPT-01 | Setup project Next.js | ✅ Xong | |
| PROMPT-02 | Supabase schema | ✅ Xong | |
| PROMPT-03 | Auth + phân quyền | ✅ Xong | 2 role admin/inspector, RLS đầy đủ, đã merge master |
| PROMPT-04 | Danh sách khách hàng | ✅ Xong | Route /customers (không phải /dashboard/customers), mã KH tự sinh tăng dần, RoleGate ẩn nút Thêm theo role |
| PROMPT-07 | Danh sách thiết bị (toàn hệ thống) | ✅ Xong | /equipment JOIN customers, tìm 3 trường (tên/mã/tên KH), lọc Loại+KH kết hợp; component <ExpiryIndicator> tách dùng chung với trang chi tiết KH; nút Thêm/Sửa cho cả admin+inspector (route đích placeholder); phát hiện equipment_insert_admin chỉ cho admin — cần sửa ở PROMPT-08; đã merge master (PR #5) |
| PROMPT-08 | Form thêm/sửa thiết bị | ✅ Xong | Mã TB tự sinh qua DB trigger (TB-<số KH 3 chữ số>-<số TB 3 chữ số>); status tự tính lại từ expiry_date qua trigger, không set trực tiếp từ form; migration 0006 (RLS INSERT equipment cho admin+inspector) + 0007 (trigger sinh mã + tính status); đã merge master (PR #7) |
| PROMPT-08b | Badge "Ngừng sử dụng" hiển thị đúng | ✅ Xong | Sửa <ExpiryIndicator> nhận thêm status để hiện badge xám khi inactive |
| PROMPT-08c | Chặn trùng KH (MST cứng, tên mềm) + MST bắt buộc cho Doanh nghiệp | ✅ Xong | Migration customers_tax_code_unique_idx (partial unique index); dialog cảnh báo trùng tên; validation MST bắt buộc động theo Loại KH; đã merge master |
| PROMPT-09 | Trang chi tiết thiết bị + lịch sử KĐ | ✅ Xong | 1 trang dài cuộn xuống (không tab); dialog "+ Thêm bản ghi kiểm định" (admin+inspector) upload file PDF/JPG/PNG vào bucket Storage private `inspection-files`, xem qua signed URL ngắn hạn; trigger DB đồng bộ equipment.expiry_date/last_inspection_date khi thêm lịch sử có hạn mới; migration 0009; đã merge master (PR #8) |
| PROMPT-10 | Dashboard 4 widget chính | ✅ Xong | Thay `/dashboard` placeholder; Widget 1 (Cảnh báo hạn KĐ) gộp luôn phần đáng lẽ là PROMPT-11 riêng — đếm 3 màu + top 5 hạn gần nhất; MỌI phân loại đỏ/vàng/xanh dùng `getExpiryStatus(expiry_date)`, không dùng cột `equipment.status` (status không phân biệt được đỏ/vàng); Widget 2/3 dùng `count()` Supabase; Widget 4 vẽ thanh ngang bằng Tailwind thuần (không thêm chart lib); có bộ test Playwright (`e2e/prompt-10-dashboard.spec.ts`, 10/10 pass) đăng nhập qua magic link + route nội bộ `/api/test-login` (chặn 2 lớp: NODE_ENV + secret header `E2E_TEST_LOGIN_SECRET` chỉ có trong `.env.local`, không đặt trên Vercel); đã merge master |
| PROMPT-12 | Nút soạn tin nhắn Zalo qua AI | ✅ Xong | Ở header `/customers/[id]`, chỉ hiện khi có ≥1 thiết bị đỏ/vàng (`getExpiryStatus`, loại trừ thiết bị inactive); dialog gọi `/api/customers/[id]/draft-zalo-message` → `draftZaloMessage()` (`src/lib/ai/draft-message.ts`) — điểm DUY NHẤT gọi SDK provider, dùng **OpenAI gpt-4o-mini** làm ngoại lệ tạm thời (không phải Claude API); nội dung sửa được, nút Copy, không lưu DB; Playwright mock ở tầng route API nội bộ (không mock được `api.openai.com` trực tiếp vì lệnh gọi chạy server-side trong Route Handler, `page.route()` không chặn được request đó) — `e2e/prompt-12-zalo-message.spec.ts`, 4/4 pass; đã merge master. **Cần làm thủ công**: thêm `OPENAI_API_KEY` thật vào `.env.local` + Vercel Environment Variables. |
| PROMPT-13 | Tìm kiếm toàn hệ thống | ✅ Xong | `<GlobalSearch>` trong header dùng chung (`(dashboard)/layout.tsx`), hiện ở mọi trang; debounce 300ms → `GET /api/search` chạy song song (`Promise.all`) `customers` (company_name/code/phone) + `equipment` (name/code), mỗi nhóm tối đa 5 kết quả + `count:"exact"` để biết tổng, "Xem tất cả X kết quả" tái dùng `?q=` đã có sẵn ở `/customers` và `/equipment`; mobile thu gọn thành icon kính lúp mở overlay full-width (dùng 1 `<input>`/1 state chung, chỉ đổi class responsive, không tách 2 component); đóng dropdown khi click ra ngoài/Escape/đổi route; `e2e/prompt-13-global-search.spec.ts` 7 test mới, tổng 21/21 pass; đã merge master. |
| Branding | Logo + màu thương hiệu chính thức | ✅ Xong | `public/logo.png` (wordmark, header + `/login`, `next/image`) + `src/app/icon.png` (crop vuông icon ngôi sao+"IN" làm favicon qua quy ước file metadata Next.js — wordmark ngang gốc quá dẹt để làm favicon); `globals.css` đổi 3 biến `--primary`/`--accent`/`--ring` sang bảng màu thương hiệu (#13577E làm primary — tương phản 7.8:1 với chữ trắng; #36B4E7 chỉ dùng cho ring + tint nhạt accent — tương phản riêng nó chỉ 2.38:1, không đạt WCAG AA nếu làm nền nút); không đổi bố cục/màu ngữ nghĩa; `e2e/branding-theme.spec.ts` xác nhận logo load được (không 404) + trang vẫn chạy sau khi đổi theme, tổng 24/24 pass; đã merge master. |
| ... | ... | ... | |

---
*Template cập nhật: Sau mỗi buổi làm việc, sửa phần "Đang làm" và tick [x] những việc xong*
