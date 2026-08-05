# INCERT AI OS

Hệ thống quản lý nội bộ cho công ty kiểm định kỹ thuật an toàn (KTAT + Thiết bị XD + NDT).

Stack: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Supabase.

## Cấu trúc thư mục

```
src/
├── app/
│   ├── (auth)/login/          # Trang đăng nhập (Supabase Auth)
│   ├── (dashboard)/test-connection/  # Trang xác nhận kết nối Supabase
│   ├── layout.tsx
│   └── globals.css
├── components/ui/             # shadcn/ui components
├── hooks/use-toast.ts
└── lib/supabase/
    ├── client.ts               # Supabase client (Client Components)
    ├── server.ts                # Supabase client (Server Components)
    └── middleware.ts            # Session refresh helper
middleware.ts                    # Root middleware, gọi updateSession()
supabase/migrations/0001_init_schema.sql
reference/mockup-v1.html          # Bản mockup UI tĩnh ban đầu (tham khảo)
```

## 1. Chạy project local

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Nếu chưa cấu hình `.env.local`, trang `/test-connection` sẽ hiển thị trạng thái lỗi rõ ràng (không crash).

## 2. Tạo project trên Supabase

1. Vào [supabase.com](https://supabase.com) → **New project**.
2. Đặt tên project (ví dụ `incert-ai-os`), chọn region gần nhất (Singapore), đặt mật khẩu database, bấm **Create new project**. Đợi ~2 phút để khởi tạo.
3. Vào **Project Settings → Data API** (hoặc mục **API**) để lấy:
   - `Project URL` → dán vào `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → dán vào `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (mục **Project Settings → API keys**, bấm "Reveal") → dán vào `SUPABASE_SERVICE_ROLE_KEY` (⚠️ key này có toàn quyền, tuyệt đối không lộ ra client/browser hay commit lên git).

## 3. Chạy migration SQL

Cách nhanh nhất (không cần cài Supabase CLI):

1. Vào Supabase Dashboard → **SQL Editor** → **New query**.
2. Mở file `supabase/migrations/0001_init_schema.sql`, copy toàn bộ nội dung, dán vào SQL Editor.
3. Bấm **Run**. Nếu thành công sẽ thấy 4 bảng `profiles`, `customers`, `equipment`, `inspection_history` xuất hiện trong **Table Editor**.

(Nếu muốn dùng Supabase CLI để quản lý migration lâu dài: `npx supabase login`, `npx supabase link --project-ref <project-ref>`, `npx supabase db push`.)

## 4. Điền API keys vào `.env.local`

File `.env.local` đã có sẵn ở gốc project (không bị commit lên git). Điền 3 giá trị lấy ở bước 2:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Sau đó chạy lại `npm run dev` và mở `/test-connection` — nếu thấy badge **"Thành công"** và số bản ghi `customers = 0` là pipeline đã chạy đúng.

## 5. Tạo tài khoản đăng nhập thử

Trang `/login` dùng `supabase.auth.signInWithPassword`. Để test, vào Supabase Dashboard → **Authentication → Users → Add user**, tạo 1 user email/password. Phân quyền chi tiết theo `role` trong bảng `profiles` sẽ làm ở PROMPT-03 — hiện tại bảng `profiles` chưa có policy insert nên bạn có thể tự thêm dòng tương ứng qua **Table Editor** (nhớ set `role` là 1 trong `admin/inspector/accountant/office`).

## 6. Deploy lên Vercel

1. Push code lên GitHub (repo này).
2. Vào [vercel.com](https://vercel.com) → **Add New → Project** → chọn import GitHub repo `kiem-dinh-app`.
3. Ở bước cấu hình, thêm **Environment Variables** (giống hệt `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Bấm **Deploy**. Sau khi build xong, mở `https://<project>.vercel.app/test-connection` để xác nhận kết nối hoạt động trên production.
5. Từ lần sau, mỗi lần push lên nhánh chính, Vercel sẽ tự động deploy lại (CI/CD pipeline).

## 7. Auth + phân quyền (PROMPT-03)

Migration `supabase/migrations/0002_auth_rls.sql` thiết lập:

- Cột `is_locked` trên `inspection_history` (chỗ móc cho Phase 2 — xuất phiếu tự động khóa).
- Function `get_user_role()` (SECURITY DEFINER) — đọc role của `auth.uid()`, dùng trong mọi policy để tránh recursive RLS.
- Trigger `on_auth_user_created` — tự tạo `profiles` row khi có user mới trong `auth.users`, lấy `role` từ `raw_user_meta_data->>'role'` (mặc định `inspector` nếu thiếu/không hợp lệ).
- Trigger `before_profiles_update_guard` — chặn user tự đổi cột `role`/`active` của chính mình (RLS không kiểm soát được ở mức cột nên phải dùng trigger).
- RLS siết lại theo role cho cả 4 bảng (xem chi tiết trong file migration).

### Chạy migration 0002 trên Supabase

Vào **SQL Editor** trên Supabase Dashboard, copy nội dung `supabase/migrations/0002_auth_rls.sql`, dán và **Run** (chạy sau khi đã chạy `0001_init_schema.sql`).

### Tạo user thủ công (không cho tự đăng ký công khai)

1. Vào **Authentication → Users → Add user**.
2. Nhập email + password, **KHÔNG** cần tick "Auto confirm" nếu bạn muốn user tự xác nhận qua email — nếu test nhanh thì tick auto-confirm.
3. Ở phần **User Metadata**, thêm JSON:
   ```json
   { "role": "admin" }
   ```
   hoặc
   ```json
   { "role": "inspector" }
   ```
4. Bấm **Create user**. Trigger `on_auth_user_created` sẽ tự tạo dòng tương ứng trong `profiles` với đúng role.
5. Tạo ít nhất 2 user để test: 1 `admin`, 1 `inspector`.

### Kịch bản test RLS cần kiểm tra

1. **Inspector không được xóa customer**: đăng nhập bằng user `inspector` → gọi `supabase.from('customers').delete()...` (hoặc thử qua Table Editor với vai trò tương ứng) → phải bị chặn bởi RLS (không có policy DELETE cho inspector trên `customers`).
2. **Bản ghi khóa (`is_locked = true`) chỉ admin sửa được**: vào Table Editor, set `is_locked = true` cho 1 dòng `inspection_history` → đăng nhập `inspector`, thử UPDATE dòng đó → bị chặn; đăng nhập `admin`, thử UPDATE → thành công.

### Route protection (middleware)

`src/middleware.ts` (⚠️ phải nằm trong `src/` chứ không phải root — dự án dùng `--src-dir` nên Next.js chỉ nhận middleware ở đây) gọi `updateSession()` trong `src/lib/supabase/middleware.ts`: chưa đăng nhập → redirect `/login?redirectTo=<path>`; route `/login` là route công khai duy nhất.

### Lấy role người dùng hiện tại trong code

- Server Component: `getCurrentUserProfile()` (`src/lib/auth/get-current-user-profile.ts`).
- Client Component: hook `useCurrentUserProfile()` (`src/hooks/use-current-user-profile.ts`) — không thể dùng chung 1 hàm cho cả 2 vì `cookies()` chỉ chạy được ở server.
- Ẩn/hiện UI theo role: `<RoleGate allowedRoles={['admin']}>...</RoleGate>` (`src/components/auth/role-gate.tsx`).

## 8. Danh sách khách hàng (PROMPT-04)

Route thực tế là **`/customers`**, không phải `/dashboard/customers` — dự án dùng route group `(dashboard)` nên các trang bên trong (`/dashboard`, `/test-connection`, `/customers`) đều nằm ở URL gốc, theo đúng tiền lệ đã có từ PROMPT-01/03 (vd `/test-connection` chứ không phải `/dashboard/test-connection`).

Migration `supabase/migrations/0003_customer_code_sequence.sql` thiết lập:

- `sequence customer_code_seq` — sinh số thứ tự atomic, tăng liên tục, không reset theo năm.
- `generate_customer_code()` — trả về `KH-<năm hiện tại>-<số thứ tự 3 chữ số>`.
- Trigger `before_customers_insert_set_code` — tự gán `code` khi INSERT nếu chưa điền.
- Nếu bảng `customers` đã có sẵn dữ liệu với mã dạng `KH-YYYY-NNN`, migration tự đưa sequence tiếp tục từ số lớn nhất đang có (không trùng/lùi số).

### Chạy migration 0003 trên Supabase

Vào **SQL Editor**, copy nội dung `supabase/migrations/0003_customer_code_sequence.sql`, dán và **Run** (chạy sau `0001` và `0002`).

### Tạo khách hàng mẫu để test giao diện (form Thêm khách hàng chưa có UI)

Vào **SQL Editor**, chạy:

```sql
insert into customers (company_name, contact_name, phone, email, type, status)
values
  ('Công ty TNHH Cơ khí An Toàn', 'Nguyễn Văn A', '0901234567', 'a@congtyat.vn', 'doanh nghiệp', 'active'),
  ('Công ty CP Xây dựng Miền Trung', 'Trần Thị B', '0912345678', 'b@xdmt.vn', 'doanh nghiệp', 'potential'),
  ('Xưởng cơ khí Hòa Phát', 'Lê Văn C', '0987654321', null, 'cá nhân', 'inactive'),
  ('Công ty TNHH Nồi hơi Đà Nẵng', 'Phạm Thị D', '0977111222', 'd@noihoidn.vn', 'doanh nghiệp', 'active');

-- Kiểm tra mã tự sinh (phải tăng dần liên tục: 001, 002, 003, 004...)
select code, company_name, status, created_at from customers order by created_at;
```

Chạy thêm 1 lần `insert` nữa với vài dòng để xác nhận số thứ tự **tiếp tục tăng** (không reset), ví dụ nếu đang ở `KH-2026-004` thì dòng tiếp theo phải là `KH-2026-005`.

Để test đếm "Số thiết bị" hiển thị đúng, gắn thử vài thiết bị vào 1 khách hàng (thay `<customer_id>` bằng `id` lấy từ câu SELECT trên):

```sql
insert into equipment (customer_id, code, name, type, status)
values
  ('<customer_id>', 'TB-TEST-001', 'Nồi hơi 500kg', 'nồi hơi', 'valid'),
  ('<customer_id>', 'TB-TEST-002', 'Cần trục tháp', 'cần trục', 'valid');
```

### Test tìm kiếm / lọc / phân trang

- Gõ vào ô tìm kiếm 1 phần tên công ty, mã KH, hoặc SĐT — sau ~300ms URL phải đổi thành `/customers?q=...` và bảng lọc đúng.
- Đổi dropdown Trạng thái — URL đổi thành `/customers?status=active` (hoặc `potential`/`inactive`).
- Nếu có >20 khách hàng, kiểm tra nút Trước/Sau và `?page=2` hoạt động đúng, dòng "Trang X / Y" chính xác.
- Đăng nhập bằng `inspector` → xác nhận nút "+ Thêm khách hàng" **không hiển thị**; đăng nhập `admin` → nút hiển thị và trỏ tới `/customers/new` (trang placeholder, form thật sẽ làm ở PROMPT-05).
- Click vào 1 dòng/card → điều hướng sang `/customers/[id]` (trang placeholder, trang thật sẽ làm ở PROMPT-06).
- Thu nhỏ trình duyệt xuống độ rộng mobile — bảng phải chuyển thành danh sách card, không tràn ngang.

## Ghi chú

- App nội bộ ~10 người dùng, ưu tiên đơn giản/dễ bảo trì hơn là tối ưu quy mô lớn.
- Role `accountant`/`office` đã khai báo trong `check constraint` của `profiles` nhưng CHƯA có policy RLS riêng — sẽ bổ sung khi có người dùng thật thuộc 2 role này.
- Form thêm/sửa khách hàng và trang chi tiết khách hàng sẽ làm ở PROMPT-05/06 (hiện là trang placeholder).
- Đếm "Số thiết bị" dùng Supabase nested-aggregate (`equipment(count)`) — đúng theo tài liệu Supabase, nhưng sandbox Claude Code không gọi được `supabase.co` nên chưa tự chạy thử được với dữ liệu thật; cần bạn xác nhận qua Preview URL.
