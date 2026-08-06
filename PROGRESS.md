# INCERT AI OS — PROGRESS TRACKER
> Cập nhật file này sau mỗi buổi làm việc.
> Paste cùng với PROJECT_CONTEXT.md khi mở chat mới.

---

## TRẠNG THÁI TỔNG QUAN
**Phase hiện tại:** Phase 1 — CRM & Nền móng  
**Tuần hiện tại:** Tuần 2 — CRUD Khách hàng  
**Cập nhật lần cuối:** 06/08/2026

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

- [ ] **[PROMPT-05]** Form thêm/sửa khách hàng (validation đầy đủ)

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
- [ ] **[PROMPT-05]** Form thêm/sửa khách hàng (validation đầy đủ)
- [ ] **[PROMPT-06]** Trang chi tiết khách hàng (4 tab)

### Tuần 3: CRUD Thiết bị
- [ ] **[PROMPT-07]** Màn hình danh sách thiết bị (lọc theo loại, trạng thái hạn)
- [ ] **[PROMPT-08]** Form thêm/sửa thiết bị (gắn với KH, màu trạng thái hạn)
- [ ] **[PROMPT-09]** Trang chi tiết thiết bị + lịch sử KĐ

### Tuần 4: Dashboard
- [ ] **[PROMPT-10]** Dashboard 4 widget chính
- [ ] **[PROMPT-11]** Widget cảnh báo hạn KĐ (đỏ/vàng/xanh)
- [ ] **[PROMPT-12]** Nút soạn tin nhắn Zalo qua Claude AI

### Tuần 5-6: Hoàn thiện
- [ ] **[PROMPT-13]** Tìm kiếm toàn hệ thống
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

---

## 📋 PROMPT LIBRARY

| ID | Tên Prompt | Trạng thái | Ghi chú |
|----|-----------|------------|---------|
| PROMPT-01 | Setup project Next.js | ✅ Xong | |
| PROMPT-02 | Supabase schema | ✅ Xong | |
| PROMPT-03 | Auth + phân quyền | ✅ Xong | 2 role admin/inspector, RLS đầy đủ, đã merge master |
| PROMPT-04 | Danh sách khách hàng | ✅ Xong | Route /customers (không phải /dashboard/customers), mã KH tự sinh tăng dần, RoleGate ẩn nút Thêm theo role |
| ... | ... | ... | |

---
*Template cập nhật: Sau mỗi buổi làm việc, sửa phần "Đang làm" và tick [x] những việc xong*
