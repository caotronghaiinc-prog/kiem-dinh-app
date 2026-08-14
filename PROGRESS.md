# INCERT AI OS — PROGRESS TRACKER
> Cập nhật file này sau mỗi buổi làm việc.
> Paste cùng với PROJECT_CONTEXT.md khi mở chat mới.

---

## TRẠNG THÁI TỔNG QUAN
**Phase hiện tại:** Phase 1 — CRM & Nền móng  
**Tuần hiện tại:** Tuần 7-8 — Deploy & Onboard (đang ở giai đoạn onboard người dùng với dữ liệu giả, trước khi chuyển sang dữ liệu thật)  
**Cập nhật lần cuối:** 14/08/2026

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

- [ ] **[PROMPT-17]** Hướng dẫn sử dụng cho team + Onboard 7-9 đồng nghiệp dùng thử với **dữ liệu giả**, thu thập góp ý trước khi dọn dữ liệu giả và chuyển sang dữ liệu khách hàng thật chính thức (xem thêm mục Audit Log ở "📌 Ý TƯỞNG BACKLOG" — cần làm trước bước chuyển dữ liệu thật)

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
- [x] **[PROMPT-15b]** Nâng cấp Next.js 14.2.35 → 16.3.0, vá 5 CVE HIGH severity
- [x] **[PROMPT-16]** Rà soát cuối cùng trước khi coi Vercel deploy là production chính thức
- [x] **[PROMPT-16b]** Thiết lập backup database tự động qua GitHub Actions (cần bạn tự thêm secret `SUPABASE_DB_URL` 1 lần)
- [ ] **[PROMPT-17]** Hướng dẫn sử dụng cho team + Onboard 7-9 đồng nghiệp dùng thử (dữ liệu giả)
- [ ] Audit Log (PROMPT riêng, sau khi có góp ý từ đợt dùng thử — xem "📌 Ý TƯỞNG BACKLOG")
- [ ] Dọn dữ liệu giả, chuyển sang dữ liệu khách hàng thật chính thức

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
- **[PROMPT-15] Migration 0010 đã CHẠY XONG trên DB thật** — sửa lỗ hổng phát hiện ở Phần C: policy INSERT của bucket Storage `inspection-files` (tạo ở migration 0009) trước đó chỉ check `authenticated` thay vì đúng `admin`/`inspector`. Xác nhận qua đối chiếu trực tiếp `SELECT * FROM pg_policies` trên DB thật (không còn dựa vào lịch sử migration) do bạn tự chạy và dán kết quả — policy tên `inspection_files_insert_admin_inspector` đã có mặt, đúng điều kiện.
- **[PROMPT-15] Đối chiếu `pg_policies` DB thật phát hiện thêm 1 điểm lệch lịch sử (không phải lỗ hổng)**: policy SELECT của bảng `profiles` trên DB thật tên `profiles_select_all_authenticated` (`using (true)`, `to authenticated`) — KHÁC với migration `0004_profiles_select_authenticated.sql` đã commit (`using (auth.role() = 'authenticated')`, không có mệnh đề `to`). Ai đó đã sửa tay qua Supabase Dashboard ngoài luồng migration, không rõ khi nào. Đã verify thực nghiệm bằng anon key (chưa đăng nhập): cả SELECT lẫn UPDATE đều bị chặn đúng (0 dòng) — hành vi vẫn an toàn, chỉ là repo không phản ánh đúng thực tế DB. **Migration `0011_reconcile_profiles_select_policy.sql`** đã viết để đồng bộ lại lịch sử (no-op về hành vi, chỉ ghi lại đúng policy đang chạy thật) — **cần chạy tay** trên Supabase SQL Editor như migration 0010, dù là no-op vẫn nên chạy để đánh dấu đã áp dụng, tránh nhầm lẫn khi xem lại lịch sử sau này.
- **[PROMPT-15] Next.js 14.2.35 có 5 lỗ hổng HIGH severity** (`npm audit`: DoS, SSRF, cache poisoning...) — đã hoãn sang PROMPT-15b, **xem PROMPT-15b bên dưới: đã nâng cấp xong, 5 CVE đã vá**.
- **[PROMPT-15b] Nâng cấp Next.js 14.2.35 → 16.3.0, React 18 → 19.2.8**: dùng codemod chính thức (`@next/codemod upgrade latest`, `next-async-request-api`, `middleware-to-proxy`, `next-lint-to-eslint-cli`) thay vì sửa tay — 7 file cần async `params`/`searchParams` (customers/equipment detail+edit+list pages, route Zalo message), `src/middleware.ts` → `src/proxy.ts` (hàm `middleware()` → `proxy()`, bắt buộc ở Next 16), `.eslintrc.json` → `eslint.config.mjs` (flat config, `next lint` đã bị xóa). Mọi dependency liên quan (Radix UI, lucide-react, react-hook-form, @supabase/ssr) đã xác nhận tương thích React 19 trước khi nâng (kiểm qua `npm view <pkg> peerDependencies`). Build sạch ngay từ lần đầu (Turbopack, mặc định từ Next 16), CSP verify lại y hệt trên production build (`script-src 'unsafe-inline'` vẫn hoạt động đúng, không có violation mới), **43/43 Playwright test pass**, `npm audit` **0 lỗ hổng** (trước đó 5 HIGH), đã tự tay smoke-test qua browser (đăng nhập, xem/sửa khách hàng, xem/sửa thiết bị, tìm kiếm, dashboard, dialog Zalo) — không chỉ tin Playwright. Không phát sinh vấn đề cần quyết định thêm; đã merge master.
- **[PROMPT-15] Rà soát bảo mật OWASP (21 rule Phần 1)**: CSP + security headers (`next.config.mjs` + `src/lib/errors.ts` chuẩn hoá message lỗi không lộ chi tiết Postgres/OpenAI), rate limit nhẹ in-memory cho `/api/search` (60/phút) và `/api/customers/[id]/draft-zalo-message` (10/5 phút — route gọi OpenAI có phí thật, xem `src/lib/rate-limit.ts`), xóa hẳn trang debug `/test-connection`. CSP `script-src` dùng `'unsafe-inline'` (không phải nonce-based) — đã thử nonce nhưng xung đột với static-cache của Next.js cho các trang tĩnh (`/login`, `/`...), xem chú thích chi tiết trong `next.config.mjs`. Dev mode (`next dev`) cần thêm `'unsafe-eval'` riêng cho Fast Refresh/HMR, production thì không.
- **[PROMPT-15] Bộ test phân quyền hợp nhất**: `e2e/permissions.spec.ts` (14 test, thay vì rải rác theo từng tính năng) — test cả tầng UI lẫn gọi thẳng Supabase bằng JWT thật của từng role (`getRoleClient()` trong `e2e/helpers/auth.ts`) để xác nhận RLS chặn thật ở Postgres, không chỉ UI ẩn nút. Bao gồm 1 role `accountant` tạo tạm thời để xác nhận role chưa có tính năng vẫn an toàn mặc định (không có quyền ghi ở đâu).
- **[PROMPT-15] RULE-04 và RULE-11 (đọc lại trực tiếp từ file gốc, đối chiếu codebase)**: RULE-11 (không dùng CSS ẩn dữ liệu nhạy cảm) — ✅ Đạt, rà toàn bộ 6 chỗ dùng `<RoleGate>` chỉ bọc nút hành động (không bọc dữ liệu), mọi gating đều chặn ở server (`requireRole()`) trước khi fetch hoặc dùng conditional JSX (không tạo DOM node) thay vì CSS `display:none`. RULE-04 (không gọi database trực tiếp từ frontend) — ⚠️ Chưa đạt theo đúng chữ nghĩa: `customer-form.tsx` và tương tự (Client Component) gọi thẳng `supabase.from(...).insert()` từ browser bằng anon key. Đây là kiến trúc Supabase khuyến nghị chính thức (client gọi thẳng PostgREST, RLS làm lớp chốt chặn thay vì giấu sau custom API route) — an toàn nhờ RLS (RULE-05/06/17 đã Đạt), không phải sơ suất, và là kiến trúc xuyên suốt từ PROMPT-01. Sửa đúng chữ nghĩa 100% nghĩa là viết lại toàn bộ CRUD thành custom API route — thay đổi kiến trúc nền tảng, không tự làm, chỉ ghi nhận minh bạch.
- **[PROMPT-16] Biến môi trường Vercel — ĐÃ XÁC NHẬN XONG**: đã tự kiểm tra qua Vercel Dashboard, cả 4 biến bắt buộc (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`) đều có mặt ở **Production environment**; xác nhận `E2E_TEST_LOGIN_SECRET` **KHÔNG có** trên Vercel (chỉ tồn tại `.env.local`, đã note từ PROMPT-10) — `/api/test-login` an toàn, không bị khai thác được trên production.
- **⚠️ [PROMPT-16] Supabase free tier KHÔNG có automatic backup** (xác nhận qua docs chính thức Supabase, không phải suy đoán) — daily backup chỉ có từ gói Pro trở lên (Free tier chỉ có gợi ý tự `supabase db dump` định kỳ). **Đã xử lý ở PROMPT-16b** bằng GitHub Actions tự chạy `pg_dump` hàng ngày (xem ghi chú PROMPT-16b bên dưới) — không cần nâng Supabase lên Pro chỉ vì lý do backup nữa, vẫn có thể cân nhắc sau nếu cần thêm lý do khác.
- **[PROMPT-16] Supabase Auth "Site URL" — ĐÃ SỬA XONG**: trước đó trỏ về `http://localhost:3000` (phát hiện khi tạo thử magic link test, link tự động fallback về localhost thay vì `kiem-dinh-app.vercel.app`), đăng nhập thật email+mật khẩu không bị ảnh hưởng nhưng "Quên mật khẩu"/magic-link sẽ gửi link hỏng nếu không sửa. Đã tự vào Supabase Dashboard → Authentication → URL Configuration, đổi Site URL sang `https://kiem-dinh-app.vercel.app` và thêm redirect URL tương ứng.
- **[PROMPT-16] Đã verify (không cần bạn làm gì thêm)**: build production local sạch hoàn toàn (Turbopack, 0 lỗi/warning); RLS re-confirm thực nghiệm trên cả 4 bảng + bucket Storage (anon key luôn nhận 0 dòng); **0 dữ liệu test/rác** còn sót trong DB thật (rà theo "test", "PW TEST", "PW PERM" — sạch, kể cả các user test tạm thời từ `permissions.spec.ts` đã dọn đúng); SSL/HTTPS trên `kiem-dinh-app.vercel.app` hợp lệ (TLS handshake sạch, HSTS/CSP header khớp đúng cấu hình PROMPT-15); `/api/test-login` trả đúng 404 trên production; các route bảo vệ (`/dashboard`, `/customers`...) redirect đúng về `/login` khi chưa đăng nhập.
- **⚠️ [PROMPT-16] Chưa smoke-test được luồng ĐÃ ĐĂNG NHẬP trên production thật** — không có mật khẩu thật, và không tạo được session qua magic link vì (a) Site URL bug nêu trên, (b) trình duyệt sandbox chặn điều hướng sang domain Supabase chưa được duyệt trước. **Cần bạn tự làm** (dưới 1 phút): vào https://kiem-dinh-app.vercel.app, đăng nhập bằng tài khoản thật, xác nhận dashboard/xem KH/xem thiết bị/tìm kiếm/đăng xuất hoạt động bình thường.
- **[PROMPT-16] Dependabot — 8 PR đang mở**, không có PR nào trùng với nâng cấp đã làm ở PROMPT-15b (15b chỉ đụng next/react/react-dom/eslint*, các PR dưới đây là gói khác): an toàn/rủi ro thấp (patch/minor) — `postcss` #20, `react-hook-form` #12, `lucide-react` #11, `@supabase/supabase-js` #9; **cần xem xét kỹ trước khi merge** (major version, khả năng breaking change cao) — `tailwindcss` 3→4 #19 (viết lại cấu hình gần như hoàn toàn), `typescript` 5→7 #15, `zod` 3→4 #13 (API validation đổi, app đang dùng nhiều ở form), `@types/node` 20→26 #17. Không tự merge PR nào trong PROMPT này (ngoài phạm vi rà soát).
- **[PROMPT-16b] Backup database tự động qua GitHub Actions**: `.github/workflows/db-backup.yml` — chạy `pg_dump` hàng ngày lúc 19:00 UTC (~2:00 sáng giờ VN, `schedule` cron) + `workflow_dispatch` để chạy tay khi cần; dump nén gzip, upload bằng `actions/upload-artifact` (`retention-days: 90`). Dùng secret `SUPABASE_DB_URL` (connection string trực tiếp Postgres, không phải anon/service_role key của app) — không hardcode, không commit file dump vào git. **Cần bạn tự làm 1 lần**: thêm secret `SUPABASE_DB_URL` tại GitHub repo Settings → Secrets and variables → Actions (chi tiết + cách tải artifact về + lệnh `psql` restore ở README mục 16). Không viết test Playwright (không phải tính năng UI).

---

## 📌 Ý TƯỞNG BACKLOG (từ tài liệu tham khảo ngoài, 08/2026)

> Đã rà soát 1 tài liệu "Vibe Coding Guide" bên ngoài (khung tham khảo lớn hơn nhiều so với roadmap hiện tại, không áp dụng nguyên khung vì không phù hợp quy mô công ty ~10 người). Rút ra 3 ý đáng giữ lại:

1. **Audit Log — ƯU TIÊN CAO, cần làm TRƯỚC khi chuyển sang dữ liệu KH thật.** Khác RLS (RLS chặn quyền) — đây là bảng ghi lại lịch sử "ai đổi gì, lúc nào" cho các thay đổi quan trọng, ví dụ sửa hạn kiểm định, xóa thiết bị. Lý do ưu tiên: hệ thống kiểm định có giá trị pháp lý/đối soát, cần khả năng tra cứu lại lịch sử thay đổi. Thời điểm thực hiện: sau khi thu thập góp ý từ 7-9 đồng nghiệp dùng thử (dữ liệu giả), TRƯỚC khi dọn dữ liệu giả và chuyển sang dữ liệu thật chính thức — sẽ làm thành 1 PROMPT riêng.

2. **QR Code cho thiết bị — để dành Phase 2/3**, gắn với M4 (Điều phối thiết bị đo). Ý tưởng: mỗi thiết bị có mã QR riêng, quét tại hiện trường xem nhanh thông tin (tên, mã, KH, hạn kiểm định) mà không cần gõ tìm kiếm. Chi phí thực hiện thấp (không cần API trả phí).

3. **Tra cứu quy định bằng AI (RAG trên kho tài liệu quy chuẩn/quy định nội bộ) — để xa hơn, đánh giá riêng khi có thời gian**, không gắn vào Phase 2/3 hiện tại. Đây là dự án con phức tạp riêng (cần xây kho tài liệu đã duyệt + hệ thống tìm kiếm ngữ nghĩa/embeddings), có chi phí vận hành dài hạn (tốn API mỗi câu hỏi).

---

## 📋 PROMPT LIBRARY

| ID | Tên Prompt | Trạng thái | Ghi chú |
|----|-----------|------------|---------|
| PROMPT-01 | Setup project Next.js | ✅ Xong | Scaffold Next.js 14 App Router (TS/Tailwind/ESLint); shadcn/ui viết tay (button, input, table, card, dialog, form, select, badge, toast); Supabase client/server/middleware; /login + /test-connection (trang debug, đã xóa ở PROMPT-15); gộp luôn migration Phase 1 ban đầu (xem PROMPT-02) |
| PROMPT-02 | Supabase schema | ✅ Xong | Không phải commit riêng — schema 4 bảng (profiles/customers/equipment/inspection_history) + RLS tạm thời được tạo cùng lúc trong commit PROMPT-01 (migration 0001); RLS đầy đủ theo đúng ma trận phân quyền hoàn thiện sau ở PROMPT-03 (migration 0002) |
| PROMPT-03 | Auth + phân quyền | ✅ Xong | 2 role admin/inspector, RLS đầy đủ, đã merge master |
| PROMPT-04 | Danh sách khách hàng | ✅ Xong | Route /customers (không phải /dashboard/customers), mã KH tự sinh tăng dần, RoleGate ẩn nút Thêm theo role |
| PROMPT-05 | Form thêm/sửa khách hàng | ✅ Xong | /customers/new + /customers/[id]/edit, chỉ admin (`requireRole(["admin"])` → redirect /unauthorized); `<CustomerForm>` dùng chung (react-hook-form + zod), validate SĐT VN, MST/email optional; client gọi thẳng Supabase insert/update, RLS migration 0002 làm chốt chặn; đã merge master (PR #1) |
| PROMPT-06 | Trang chi tiết khách hàng (4 tab) | ✅ Xong | /customers/[id] thay placeholder PROMPT-04; 4 tab (Thông tin chung/Thiết bị/Lịch sử KĐ/Ghi chú), dùng `.maybeSingle()` để tránh lỗi 500 khi id không tồn tại; tách `getExpiryStatus()` riêng để PROMPT-10 dùng lại; migration 0004 nới policy SELECT `profiles` (join lịch sử KĐ → profiles bị RLS chặn ngầm tên KĐV); fix thêm ngay sau đó: Tailwind `content` glob thiếu `src/lib` khiến badge màu hạn KĐ/loại KH mất màu (lỗi có từ PROMPT-04, phát hiện ở đây); đã merge master (PR #2, #3) |
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
| PROMPT-15 | Rà soát bảo mật + phân quyền cuối trước deploy | ✅ Xong | **Phần A** (21 rule OWASP Phần 1): tự sửa CSP+security headers (`next.config.mjs`), chuẩn hoá lỗi không lộ chi tiết Postgres/OpenAI (`src/lib/errors.ts`, áp dụng ở customer/equipment form, list page, API route Zalo), rate limit in-memory (`src/lib/rate-limit.ts`) cho `/api/search` + route Zalo (gọi OpenAI, có phí thật), thêm `.gitignore`/`dependabot.yml`; 3 quyết định đã hỏi và được xác nhận: xóa hẳn `/test-connection` (trang debug lộ thông tin), thêm rate limit nhẹ ngay (không dùng Redis), hoãn nâng cấp Next.js 14→16 (5 CVE HIGH severity, breaking change) sang 1 PROMPT riêng (xem PROMPT-15b). **Phần B**: đối chiếu policy RLS thật (dựng lại từ lịch sử migration 0001-0009 vì sandbox không truy vấn SQL trực tiếp được) với ma trận đã chốt — khớp 100%; sau đó bạn tự chạy `SELECT * FROM pg_policies` trên DB thật xác nhận thêm, phát hiện 1 điểm lệch lịch sử ở policy `profiles` (migration 0011 đồng bộ lại). **Phần C**: phát hiện + sửa 1 lỗ hổng thật — policy INSERT bucket Storage `inspection-files` chỉ check `authenticated` thay vì đúng `admin`/`inspector`, migration `0010_storage_insert_admin_inspector.sql` (đã chạy trên DB thật, xác nhận qua đối chiếu `pg_policies`); mọi RLS khác đã an toàn mặc định cho role accountant/office (whitelist rõ ràng, không có chỗ nào check kiểu "not admin"). **Phần D**: `e2e/permissions.spec.ts` (14 test hợp nhất, khác với test rải rác theo tính năng trước đó) — test cả UI lẫn gọi thẳng Supabase bằng JWT thật từng role (`getRoleClient()` mới trong `e2e/helpers/auth.ts`) để xác nhận RLS chặn thật ở Postgres; phát hiện + sửa 1 bug thật trong lúc làm: CSP thiếu `'unsafe-eval'` ở dev mode làm hỏng mọi tương tác client-side khi chạy `next dev` (Fast Refresh dùng eval, production không bị ảnh hưởng); tổng 43/43 test pass (29 cũ + 14 mới); đã merge master. Sau đó còn xác nhận thêm RULE-04/RULE-11 (đọc lại file gốc, đối chiếu codebase — xem GHI CHÚ QUAN TRỌNG). |
| PROMPT-15b | Nâng cấp Next.js 14.2.35 → 16.3.0 (vá 5 CVE HIGH) | ✅ Xong | Quy trình cẩn thận trên nhánh riêng `claude/prompt-15b-nextjs-upgrade`: đọc upgrade guide chính thức 14→15 + 15→16, kiểm tra tương thích React 19 cho mọi dependency UI trước khi nâng, dùng codemod chính thức (`@next/codemod upgrade latest`, `next-async-request-api`, `middleware-to-proxy`, `next-lint-to-eslint-cli`) thay vì sửa tay từng file. 7 file cần async `params`/`searchParams`; `middleware.ts` → `proxy.ts`; ESLint sang flat config. Build sạch ngay lần đầu (Turbopack mặc định từ Next 16), CSP verify lại đúng như PROMPT-15 (không đổi hành vi), 43/43 Playwright pass, `npm audit` 0 lỗ hổng (trước 5 HIGH), tự tay smoke-test qua browser đủ luồng chính. Không phát sinh vấn đề cần quyết định thêm; đã merge master. |
| PROMPT-16 | Rà soát cuối trước khi coi Vercel deploy là production chính thức | ✅ Xong (còn vài mục cần bạn tự xác nhận) | Build production local sạch (Turbopack, 0 lỗi); RLS re-verify thực nghiệm trên cả 4 bảng + Storage bucket; quét sạch dữ liệu test/rác trong DB thật; SSL/HTTPS + security header trên `kiem-dinh-app.vercel.app` xác nhận đúng qua `curl`; `/api/test-login` trả 404 đúng thiết kế trên production; route bảo vệ redirect đúng khi chưa đăng nhập. Phát hiện 2 việc cần bạn xử lý: Supabase free tier không có auto-backup (khác giả định ban đầu, xác nhận qua docs chính thức — **đã xử lý ở PROMPT-16b**), Supabase Auth Site URL còn trỏ localhost (ảnh hưởng tính năng quên mật khẩu sau này, chưa ảnh hưởng đăng nhập hiện tại). Không tự đăng nhập được vào production thật (không có mật khẩu, và sandbox trình duyệt chặn điều hướng sang domain Supabase chưa duyệt) — cần bạn tự smoke-test phần đã đăng nhập. Rà 8 PR Dependabot đang mở, phân loại rủi ro thấp/cần xem xét kỹ, không tự merge. Không code gì mới, chỉ rà soát/xác nhận. |
| PROMPT-16b | Backup database tự động qua GitHub Actions | ✅ Xong hoàn toàn | `.github/workflows/db-backup.yml`: `pg_dump` hàng ngày 19:00 UTC (~2h sáng giờ VN) qua `schedule` cron + `workflow_dispatch` chạy tay; nén gzip, upload `actions/upload-artifact` (`retention-days: 90`); dùng secret `SUPABASE_DB_URL`, không hardcode/không commit file dump. Sửa lỗi version mismatch (pg_dump 16 vs Postgres 17 của Supabase) bằng cách chạy job trong container `postgres:17` chính thức. Secret `SUPABASE_DB_URL` đã thêm, đã chạy thử thành công qua `workflow_dispatch`, tải artifact về xác nhận có dữ liệu thật (226KB). README mục 16: cách tải artifact + lệnh `psql` restore. Không có test Playwright (không phải UI). |
| ... | ... | ... | |

---
*Template cập nhật: Sau mỗi buổi làm việc, sửa phần "Đang làm" và tick [x] những việc xong*
