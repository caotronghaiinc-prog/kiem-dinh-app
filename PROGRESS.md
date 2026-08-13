# INCERT AI OS — PROGRESS TRACKER
> Cập nhật file này sau mỗi buổi làm việc.
> Paste cùng với PROJECT_CONTEXT.md khi mở chat mới.

---

## TRẠNG THÁI TỔNG QUAN
**Phase hiện tại:** Phase 1 — CRM & Nền móng  
**Tuần hiện tại:** Tuần 5-6 — Hoàn thiện  
**Cập nhật lần cuối:** 13/08/2026

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

- [ ] **[PROMPT-16]** Deploy Vercel production

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
  - Trang /test-connection xác nhận: "Thành công — Đã kết nối thành công tới Supabase project" (đã XÓA ở PROMPT-15 — chỉ là trang debug lúc dựng pipeline, lộ thông tin cho mọi role đã đăng nhập, không cần thiết cho bản dùng thử)
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
- [x] **[PROMPT-14]** Responsive mobile
- [x] **[PROMPT-15]** Kiểm tra phân quyền 4 vai trò + rà soát bảo mật OWASP

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
- **Chỉnh lại bố cục ô tìm kiếm toàn hệ thống** (phản hồi thẩm mỹ sau PROMPT-14): tách `<GlobalSearch>` ra hàng riêng, full-width, ngay dưới hàng nav chính — giống nhau trên mọi kích thước màn hình. Bỏ hẳn logic thu gọn icon/overlay riêng cho mobile đã làm ở PROMPT-13/14 (không còn cần thiết vì input luôn hiện sẵn). Không đổi logic tìm kiếm/hiển thị kết quả, chỉ đổi vị trí.
- **⚠️ [PROMPT-15] Cần làm thủ công TRƯỚC KHI cho đồng nghiệp dùng thử**: chạy migration `supabase/migrations/0010_storage_insert_admin_inspector.sql` trên Supabase Dashboard → SQL Editor. Migration này sửa lỗ hổng thật phát hiện ở Phần C: policy INSERT của bucket Storage `inspection-files` (tạo ở migration 0009) chỉ check `authenticated` thay vì đúng `admin`/`inspector` — nghĩa là bất kỳ user đã đăng nhập nào (kể cả accountant/office sau này) có thể upload thẳng file vào bucket qua Storage API, bỏ qua UI. **CHƯA chạy trên DB thật** vì sandbox không có quyền truy vấn SQL trực tiếp (không có `DATABASE_URL`/`pg` package, chỉ có PostgREST qua `supabase-js`) — không được coi PROMPT-15 hoàn tất về bảo mật cho tới khi chạy migration này.
- **[PROMPT-15] Next.js 14.2.35 có 5 lỗ hổng HIGH severity** (`npm audit`: DoS, SSRF, cache poisoning...), bản vá duy nhất là nâng lên Next.js 16.3.0 (breaking change — `params`/`searchParams` thành async, ảnh hưởng hàng chục file). Đã hỏi và được xác nhận: **KHÔNG nâng cấp trong PROMPT-15**, để dành 1 PROMPT riêng có test kỹ sau, vì rủi ro chủ yếu là DoS/SSRF từ bên ngoài trong khi app chỉ có 7-9 người dùng nội bộ sau đăng nhập.
- **[PROMPT-15] Rà soát bảo mật OWASP (21 rule Phần 1)**: CSP + security headers (`next.config.mjs` + `src/lib/errors.ts` chuẩn hoá message lỗi không lộ chi tiết Postgres/OpenAI), rate limit nhẹ in-memory cho `/api/search` (60/phút) và `/api/customers/[id]/draft-zalo-message` (10/5 phút — route gọi OpenAI có phí thật, xem `src/lib/rate-limit.ts`), xóa hẳn trang debug `/test-connection`. CSP `script-src` dùng `'unsafe-inline'` (không phải nonce-based) — đã thử nonce nhưng xung đột với static-cache của Next.js cho các trang tĩnh (`/login`, `/`...), xem chú thích chi tiết trong `next.config.mjs`. Dev mode (`next dev`) cần thêm `'unsafe-eval'` riêng cho Fast Refresh/HMR, production thì không.
- **[PROMPT-15] Bộ test phân quyền hợp nhất**: `e2e/permissions.spec.ts` (14 test, thay vì rải rác theo từng tính năng) — test cả tầng UI lẫn gọi thẳng Supabase bằng JWT thật của từng role (`getRoleClient()` trong `e2e/helpers/auth.ts`) để xác nhận RLS chặn thật ở Postgres, không chỉ UI ẩn nút. Bao gồm 1 role `accountant` tạo tạm thời để xác nhận role chưa có tính năng vẫn an toàn mặc định (không có quyền ghi ở đâu).

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
| PROMPT-14 | Responsive mobile toàn hệ thống | ✅ Xong | Header dưới breakpoint `sm` thu gọn thành logo + icon tìm kiếm + hamburger (`<MobileNav>`, `src/components/nav/mobile-nav.tsx`) — nav ngang + tên user/Đăng xuất chuyển vào dropdown, đóng khi đổi route/click ra ngoài/Escape; sửa thêm: 2 dialog thiếu `max-h-[90vh] overflow-y-auto` (Zalo, cảnh báo trùng tên KH) có thể tràn dọc màn hình thấp; nút icon-only (đóng dialog, trigger tìm kiếm mobile) tăng lên ~44px vùng chạm; dialog dùng `w-[calc(100%-2rem)]` thay `w-full` để có lề 2 bên trên mobile thay vì sát mép; **phát hiện + sửa 1 regression do chính PROMPT này gây ra**: thêm `relative` vào `<header>` cho hamburger khiến dropdown `<GlobalSearch>` (đang có `sm:static`) bị lạc vị trí ở desktop — sửa thành `sm:relative`; `e2e/prompt-14-responsive-mobile.spec.ts` (375×667, kiểm tra scrollWidth mọi trang + hamburger + 2 dialog tiêu biểu), tổng 29/29 pass; tăng Playwright test timeout lên 60s (test tràn ngang chạy 9 route liên tiếp, lần đầu Next dev compile route mới có thể >30s, không phải bug); đã merge master. |
| PROMPT-15 | Rà soát bảo mật + phân quyền cuối trước deploy | ✅ Xong | **Phần A** (21 rule OWASP Phần 1): tự sửa CSP+security headers (`next.config.mjs`), chuẩn hoá lỗi không lộ chi tiết Postgres/OpenAI (`src/lib/errors.ts`, áp dụng ở customer/equipment form, list page, API route Zalo), rate limit in-memory (`src/lib/rate-limit.ts`) cho `/api/search` + route Zalo (gọi OpenAI, có phí thật), thêm `.gitignore`/`dependabot.yml`; 3 quyết định đã hỏi và được xác nhận: xóa hẳn `/test-connection` (trang debug lộ thông tin), thêm rate limit nhẹ ngay (không dùng Redis), hoãn nâng cấp Next.js 14→16 (5 CVE HIGH severity, breaking change) sang 1 PROMPT riêng. **Phần B**: đối chiếu policy RLS thật (dựng lại từ lịch sử migration 0001-0009 vì sandbox không truy vấn SQL trực tiếp được) với ma trận đã chốt — khớp 100%. **Phần C**: phát hiện + sửa 1 lỗ hổng thật — policy INSERT bucket Storage `inspection-files` chỉ check `authenticated` thay vì đúng `admin`/`inspector`, migration `0010_storage_insert_admin_inspector.sql` (**chưa chạy trên DB thật, cần làm thủ công**, xem GHI CHÚ QUAN TRỌNG); mọi RLS khác đã an toàn mặc định cho role accountant/office (whitelist rõ ràng, không có chỗ nào check kiểu "not admin"). **Phần D**: `e2e/permissions.spec.ts` (14 test hợp nhất, khác với test rải rác theo tính năng trước đó) — test cả UI lẫn gọi thẳng Supabase bằng JWT thật từng role (`getRoleClient()` mới trong `e2e/helpers/auth.ts`) để xác nhận RLS chặn thật ở Postgres; phát hiện + sửa 1 bug thật trong lúc làm: CSP thiếu `'unsafe-eval'` ở dev mode làm hỏng mọi tương tác client-side khi chạy `next dev` (Fast Refresh dùng eval, production không bị ảnh hưởng); tổng 43/43 test pass (29 cũ + 14 mới); đã merge master. |
| ... | ... | ... | |

---
*Template cập nhật: Sau mỗi buổi làm việc, sửa phần "Đang làm" và tick [x] những việc xong*
