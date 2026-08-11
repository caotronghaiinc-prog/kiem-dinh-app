# INCERT AI OS — PROJECT CONTEXT
> Paste file này vào ĐẦU mỗi chat mới để Claude hiểu ngay toàn bộ dự án.
> Cập nhật file này mỗi khi có quyết định quan trọng thay đổi.

---

## 1. TỔNG QUAN DỰ ÁN

**Tên hệ thống:** INCERT AI OS  
**Mô tả:** Hệ điều hành số cho Công ty Cổ phần Kiểm định Kỹ thuật An toàn INCERT  
**Giai đoạn công ty:** Mới thành lập, đang xin giấy phép/chỉ định  
**Quy mô người dùng:** ~10 người (Giám đốc · Kiểm định viên · Kế toán · Văn phòng)

### Dịch vụ công ty INCERT
- **KTAT (Bộ Nội vụ):** Nồi hơi · Bình áp lực · Hệ thống ống áp lực · Thiết bị nâng (cần trục, cầu trục, palăng, tời, xe nâng) · Thang máy/thang cuốn · Thiết bị vui chơi/cáp treo · Thiết bị ATLĐ
- **Thiết bị XD (Bộ Xây dựng):** Cốp pha trượt/leo · Giàn thép ván khuôn · Máy khoan/ép cọc · Máy bơm bê tông · Máy thi công hầm ngầm · Giàn giáo thép · Thiết bị vận tải/biển
- **NDT (Kiểm tra không phá hủy):** Siêu âm UT · Từ tính MT · Thẩm thấu PT · Mối hàn theo TCVN

---

## 2. KIẾN TRÚC HỆ THỐNG — ĐÃ CHỐT

### 6 Module nghiệp vụ

| Module | Tên | Mô tả | Phase |
|--------|-----|-------|-------|
| M1 | CRM & Thiết bị | Khách hàng · Thiết bị KĐ · Hạn tái kỳ · Cảnh báo | Phase 1 |
| M2 | Hợp đồng & Tài chính | Báo giá · Hợp đồng · Công nợ · Xuất hóa đơn điện tử · DNTT | Phase 3 |
| M3 | Kiểm định & Biên bản ⭐ | Template Engine · Nhập thông số · AI soạn biên bản · Xuất PDF/Word | Phase 2 |
| M4 | Điều phối TB Đo 🔧 | DS thiết bị đo nội bộ · Trạng thái rảnh/đi · Đăng ký mượn · Lịch hiệu chuẩn · Vật tư tiêu hao | Phase 2 |
| M5 | Lịch & Nhân sự | Lịch công tác · Phân công KĐV · Chứng chỉ · Hạn chứng chỉ | Phase 3 |
| M6 | Báo cáo & Dashboard | Doanh thu · Thống kê KĐ · Xuất Excel · KPI tháng | Phase 3 |

### Nguyên tắc AI QUAN TRỌNG
> **AI chỉ hỗ trợ soạn thảo văn bản — Kiểm định viên luôn là người ra quyết định chuyên môn cuối cùng. AI KHÔNG quyết định kết quả kiểm định.**

### Tech Stack — ĐÃ CHỐT
```
Frontend:     Next.js 14 (App Router) + TypeScript
UI:           shadcn/ui + Tailwind CSS
Database:     Supabase (PostgreSQL)
Auth:         Supabase Auth (phân quyền 4 vai trò)
File Storage: Supabase Storage (PDF · Word · Ảnh)
Hosting:      Vercel
AI:           Claude API (Anthropic) — claude-sonnet-4-6
```

### Phân quyền 4 vai trò
| Vai trò | Quyền |
|---------|-------|
| Admin (Giám đốc) | Toàn quyền |
| Kiểm định viên | Xem lịch · Cập nhật trạng thái KĐ · Đăng ký TB đo |
| Kế toán | Xem/cập nhật công nợ · Xuất hóa đơn |
| Văn phòng | Thêm/sửa KH · Thiết bị · Hợp đồng |

### Tích hợp tương lai (CHƯA làm)
- MISA (kế toán)
- Cổng Dịch vụ công Bộ Nội vụ
- Hóa đơn điện tử VNPT/Viettel

---

## 3. LỘ TRÌNH 3 PHASE

### Phase 1 — Tháng 1-2: Nền móng & CRM
**Mục tiêu:** Hệ thống chạy được, 10 người dùng quản lý KH và thiết bị

Tính năng:
- Setup project Next.js + Supabase + Vercel + Auth
- M1: CRUD Khách hàng (mã KH tự sinh: KH-2026-001)
- M1: CRUD Thiết bị gắn với KH (mã TB tự sinh: TB-KH001-001)
- Dashboard 4 widget: cảnh báo hạn KĐ · công nợ · lịch hôm nay · thống kê
- Cảnh báo hạn kiểm định: đỏ (≤30 ngày) · vàng (31-60 ngày)
- Tìm kiếm & lọc danh sách
- Phân quyền 4 vai trò
- Nút soạn tin nhắn Zalo qua Claude AI
- Deploy Vercel

### Phase 2 — Tháng 3-4: Kiểm định & Biên bản (CORE)
**Mục tiêu:** Kiểm định viên nhập thông số → AI soạn biên bản → xuất PDF đúng mẫu nhà nước

Tính năng:
- M3: Template Engine (upload mẫu Word có placeholder → tự sinh form nhập liệu)
- M3: Form nhập thông số hiện trường trên mobile
- M3: AI soạn biên bản KTAT / Thiết bị XD / NDT
- M3: Xuất PDF/Word đúng mẫu nhà nước
- M3: Lịch sử kiểm định gắn với thiết bị
- M4: Danh mục thiết bị đo nội bộ
- M4: Đăng ký mượn thiết bị · theo dõi trạng thái rảnh/đi
- M4: Lịch hiệu chuẩn thiết bị đo

### Phase 3 — Tháng 5-6: Tài chính & Vận hành
**Mục tiêu:** Tự động hóa toàn bộ vận hành

Tính năng:
- M2: Báo giá · Hợp đồng · DNTT
- M2: Theo dõi công nợ · nhắc thanh toán
- M2: Xuất hóa đơn điện tử
- M5: Lịch công tác · phân công KĐV
- M5: Quản lý chứng chỉ KĐV + cảnh báo hạn
- M6: Dashboard báo cáo · doanh thu · thống kê
- Automation: Make + Gmail tự động nhắc

---

## 4. DATABASE SCHEMA CỐT LÕI (Phase 1)

```sql
-- Khách hàng
customers: id · code(KH-2026-001) · company_name · address · tax_code
           contact_name · phone · email · type · industry · source
           status(potential/active/inactive) · notes · created_at

-- Thiết bị khách hàng
equipment: id · code(TB-KH001-001) · customer_id(FK) · name · type
           manufacturer · manufacture_year · serial_number · specifications
           location · last_inspection_date · expiry_date · inspection_cycle
           status(valid/expiring_soon/expired/inactive) · notes

-- Lịch sử kiểm định
inspection_history: id · equipment_id(FK) · inspection_date · inspector_id(FK)
                    result(pass/fail/pending) · report_number · new_expiry_date
                    contract_id · notes

-- Users & Roles (Supabase Auth)
profiles: id · email · full_name · role(admin/inspector/accountant/office) · phone · active
```

---

## 5. CẤU TRÚC THƯ MỤC DỰ ÁN

```
incert-ai-os/                    ← Thư mục gốc trên máy tính + GitHub
├── PROJECT_CONTEXT.md           ← File này (paste vào chat mới)
├── PROGRESS.md                  ← Tiến độ hiện tại (cập nhật sau mỗi buổi)
├── PROMPT_LIBRARY.md            ← Thư viện prompt đã dùng
├── docs/
│   ├── PRD_Phase1_CRM.docx      ← PRD đã có
│   └── Architecture.md
├── mau-bien-ban/                ← Mẫu Word nhà nước (upload dần)
│   ├── KTAT/
│   ├── ThietBiXD/
│   └── NDT/
└── src/                         ← Code do Claude Code tạo ra
    ├── app/
    ├── components/
    └── lib/
```

---

## 6. QUY TẮC LÀM VIỆC

### Vai trò
- **Anh (Product Owner):** Đọc · Duyệt · Test · Phản hồi
- **Claude (Mentor/Architect):** Thiết kế · Viết PRD · Viết Prompt cho Claude Code
- **Claude Code:** Viết code · Build app · Deploy

### Quy trình mỗi tính năng
```
Mentor viết Prompt → Anh duyệt → Paste vào Claude Code → Claude Code build
→ Anh test → Phản hồi lỗi/góp ý → Sửa → Deploy
```

### Cách dùng file này
1. Mở chat mới với Claude
2. Paste toàn bộ nội dung file PROJECT_CONTEXT.md
3. Paste nội dung PROGRESS.md
4. Nói: "Tiếp tục dự án INCERT. Hôm nay cần làm: [mô tả việc]"

---

## 7. TRẠNG THÁI HIỆN TẠI
> Xem file PROGRESS.md để biết tiến độ chi tiết nhất

- Kiến trúc: ✅ ĐÃ CHỐT
- PRD Phase 1 (CRM): ✅ ĐÃ CÓ FILE WORD
- Phase 1 build: ⏳ CHUẨN BỊ BẮT ĐẦU
- GitHub repo: ❌ CHƯA TẠO
- Supabase project: ❌ CHƯA TẠO
- Vercel project: ❌ CHƯA TẠO

---
*Cập nhật lần cuối: 08/2026 | Phiên bản: 1.0*
