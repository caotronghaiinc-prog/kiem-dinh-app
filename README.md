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

1. **Inspector không được xóa customer**: đăng nhập bằng user `inspector` → gọi `supabase.from('customers').delete()...` (hoặc thử qua Table Editor với vai trò tương ứng) → phải bị chặn bởi RLS (không có policy DELETE cho inspector trên `customers`). (Lưu ý: quyền INSERT trên `customers` đã đổi ở mục 11 — inspector giờ tạo mới được, chỉ Sửa/Xóa vẫn bị chặn.)
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

## 9. Form thêm/sửa khách hàng (PROMPT-05)

- `/customers/new` — form thêm mới. `/customers/[id]/edit` — form sửa, tự load dữ liệu có sẵn.
- Cả 2 route được bảo vệ ở **Server Component** bằng `requireRole(["admin"])` (`src/lib/auth/require-role.ts`): nếu đăng nhập nhưng không phải `admin` → `redirect("/unauthorized")` ngay trên server, không lộ nội dung form ra dù chỉ trong chớp mắt. Middleware (`src/middleware.ts`) lo phần "chưa đăng nhập → `/login`" như cũ; `requireRole` lo phần "đăng nhập rồi nhưng sai role".
- `<RoleGate>` (client, ẩn/hiện theo role) vẫn dùng cho các nút bấm inline như "+ Thêm khách hàng", nút "Sửa" trên danh sách — nhưng nút "Sửa" ở mỗi dòng/card thì dùng prop `isAdmin` tính 1 lần ở Server Component (`getCurrentUserProfile()`) rồi truyền xuống, thay vì mỗi dòng tự gọi `<RoleGate>` (mỗi `<RoleGate>` là 1 lần gọi Supabase phía client — 20 dòng/trang thì thành 20 lần gọi thừa).
- Validation: `react-hook-form` + `zod` (`src/lib/customers/form-schema.ts`) — SĐT VN (`0xxxxxxxxx` hoặc `+84xxxxxxxxx`), email đúng định dạng nếu có nhập, mã số thuế 10 hoặc 13 chữ số nếu có nhập.
- `type` (Doanh nghiệp/Cá nhân) và `source` (Giới thiệu/Website/...) là cột `text` tự do trong DB (không có `check constraint`) — lưu trực tiếp chuỗi tiếng Việt hiển thị (`"doanh nghiệp"`, `"Giới thiệu"`, ...) thay vì mã hoá thành slug, để xem trực tiếp trong Table Editor cũng dễ đọc.
- Ghi/sửa gọi thẳng `supabase.from('customers').insert/update(...)` từ Client Component (giống pattern `/login` đã dùng ở PROMPT-03) — không dùng Server Action/API route riêng, để đơn giản. RLS (`customers_insert_admin`, `customers_update_admin` từ migration 0002) là lớp chặn cuối cùng nếu ai đó bypass UI.
- Nút "Hủy" dùng `router.push('/customers')` (không dùng `router.back()`) để luôn có đích đến rõ ràng kể cả khi user vào form bằng cách gõ thẳng URL.
- Lưu thành công → toast + redirect `/customers` (chưa có trang chi tiết thật nên không redirect vào `/customers/[id]`). Lưu lỗi → toast đỏ, giữ nguyên dữ liệu đã nhập (không reset form).

### Test luồng thêm/sửa khách hàng

1. Đăng nhập `admin` → `/customers` → bấm "+ Thêm khách hàng" → điền form, để trống các trường không bắt buộc → Lưu → phải thấy toast "Đã thêm khách hàng", quay về `/customers`, khách hàng mới nằm đầu danh sách với mã `KH-2026-NNN` đúng thứ tự tăng dần tiếp theo.
2. Bấm "Sửa" trên khách hàng vừa tạo → xác nhận mã KH hiển thị dạng disabled, đúng giá trị → sửa vài trường → Lưu → quay lại `/customers`, dữ liệu cập nhật đúng, mã KH không đổi.
3. Thử nhập SĐT sai định dạng (vd `123`), email sai định dạng, mã số thuế 5 chữ số → phải thấy lỗi tiếng Việt ngay dưới field, không cho submit.
4. Đăng nhập `inspector` → gõ thẳng URL `/customers/new` hoặc `/customers/<id>/edit` → phải bị redirect sang `/unauthorized` (không phải chỉ ẩn nút — chặn cả truy cập trực tiếp bằng URL).
5. Trên `/customers`, xác nhận `inspector` không thấy nút "Sửa" ở bất kỳ dòng/card nào; `admin` thấy đầy đủ.

## 10. Trang chi tiết khách hàng (PROMPT-06)

- `/customers/[id]` — mọi role đã đăng nhập xem được (theo RLS SELECT hiện có, không chặn thêm). Id không tồn tại (hoặc không phải UUID hợp lệ) → dùng `.maybeSingle()` thay vì `.single()` nên không throw lỗi, hiện thẳng màn "Không tìm thấy khách hàng" + nút quay lại danh sách, không có trang nào crash 500.
- Nút "Sửa" ở header và tab "Ghi chú" tính `isAdmin` một lần ở Server Component (giống pattern PROMPT-05), không dùng `<RoleGate>` lặp lại.
- 4 tab dùng `Tabs` viết tay (`src/components/ui/tabs.tsx`, cần cài `@radix-ui/react-tabs`) — trên mobile `TabsList` cuộn ngang (`overflow-x-auto`) thay vì vỡ layout.
- Tab "Thiết bị": màu cảnh báo hạn dùng chung hàm `getExpiryStatus()` tại `src/lib/utils/expiry-status.ts` — file này **cố tình tách riêng** để Dashboard (PROMPT-10/11, widget cảnh báo hạn KĐ đỏ/vàng/xanh) import lại y hệt logic, không tính lại.
- Tab "Lịch sử kiểm định": join `inspection_history -> equipment (lọc theo customer_id, dùng `equipment!inner(...)` để filter chuẩn qua PostgREST) -> profiles (tên KĐV)`.

### ⚠️ Đã sửa 1 lỗi RLS phát sinh khi làm tab Lịch sử kiểm định

Policy `profiles_select_own_or_admin` (từ PROMPT-03) chỉ cho user xem profile của **chính mình** hoặc admin xem tất cả. Khi inspector A xem lịch sử kiểm định do inspector B thực hiện, cột `profiles.full_name` của B bị RLS chặn ngay trong join → tên KĐV hiện trống dù dữ liệu vẫn đúng. Migration `supabase/migrations/0004_profiles_select_authenticated.sql` mở SELECT trên `profiles` cho mọi user đã đăng nhập (đồng bộ với quy tắc SELECT đã áp dụng cho `customers`/`equipment`/`inspection_history` từ trước) — **UPDATE không đổi**, vẫn chỉ tự sửa row của mình hoặc admin, và trigger chặn tự đổi `role`/`active` vẫn còn nguyên. Nhớ chạy migration này (sau `0001`-`0003`) trước khi test tab Lịch sử.

### Test trang chi tiết khách hàng

1. Từ `/customers`, click 1 khách hàng → vào đúng `/customers/[id]`, đủ 4 tab, số lượng trên tab "Thiết bị (N)"/"Lịch sử (N)" đúng.
2. Khách hàng chưa có thiết bị/lịch sử → empty state hiện đúng (icon + text), không lỗi.
3. Tạo/sửa vài dòng `equipment` qua SQL Editor với `expiry_date` khác nhau (quá hạn, còn ≤30 ngày, 31-60 ngày, >60 ngày, `null`) để xác nhận đúng 3 màu + chữ "Quá hạn X ngày"/"Còn X ngày".
4. Thêm vài dòng `inspection_history` (khác `inspector_id`) qua SQL Editor để test tên KĐV hiện đúng kể cả khi người xem không phải người tạo bản ghi đó.
5. Đăng nhập `inspector` → không thấy nút "Sửa" ở header lẫn tab Ghi chú; đăng nhập `admin` → thấy đầy đủ.
6. Gõ thẳng URL với 1 UUID không tồn tại (hoặc chuỗi bất kỳ như `/customers/khong-ton-tai`) → hiện "Không tìm thấy khách hàng", không crash.

## 11. Phân quyền customers — inspector được Tạo mới (không phải PROMPT riêng, thay đổi quy tắc)

Quy tắc phân quyền hiện tại trên bảng `customers`:

| Hành động | Admin | Inspector | Accountant/Office |
|---|---|---|---|
| Xem (SELECT) | ✅ | ✅ | Chưa triển khai |
| Tạo mới (INSERT) | ✅ | ✅ | Chưa triển khai |
| Sửa (UPDATE) | ✅ | ❌ (kể cả bản ghi tự tạo) | Chưa triển khai |
| Xóa (DELETE) | ✅ | ❌ | Chưa triển khai |

`equipment`/`inspection_history` không đổi (vẫn theo ma trận đã ghi ở mục 7).

### Chạy migration 0005 trên Supabase (bắt buộc, phải chạy tay)

Sandbox Claude Code không gọi được `supabase.co` nên không tự chạy migration được. Vào **SQL Editor**, chạy đúng theo thứ tự sau:

**Bước 1 — kiểm tra policy hiện có (không bắt buộc nhưng nên chạy để đối chiếu):**

```sql
select policyname, cmd, qual from pg_policies where tablename = 'customers';
```

Sẽ thấy policy INSERT tên là `customers_insert_admin`, điều kiện chỉ cho `role = 'admin'`.

**Bước 2 — chạy migration** (nội dung `supabase/migrations/0005_customers_insert_inspector.sql`):

```sql
drop policy if exists "customers_insert_admin" on customers;

create policy "customers_insert_admin_or_inspector" on customers
  for insert
  with check (public.get_user_role() in ('admin', 'inspector'));
```

Policy UPDATE (`customers_update_admin`) và DELETE (`customers_delete_admin`) không đổi — không cần chạy gì thêm cho 2 policy này.

### Test sau khi đổi quyền

1. Đăng nhập `inspector` → `/customers` → nút "+ Thêm khách hàng" phải **hiện** (trước đây bị ẩn).
2. `inspector` bấm "+ Thêm khách hàng" → điền form → Lưu → phải thành công (trước đây bị RLS chặn).
3. Trên danh sách và trang chi tiết, `inspector` vẫn **không** thấy nút "Sửa" ở bất kỳ đâu — kể cả với khách hàng do chính `inspector` đó vừa tạo.
4. Gõ thẳng URL `/customers/<id>/edit` khi đăng nhập `inspector` (kể cả với khách hàng tự tạo) → vẫn bị redirect `/unauthorized` (route edit không đổi quyền).
5. `admin` vẫn Thêm/Sửa/Xóa được như cũ, không đổi gì.

## Ghi chú

- App nội bộ ~10 người dùng, ưu tiên đơn giản/dễ bảo trì hơn là tối ưu quy mô lớn.
- Role `accountant`/`office` đã khai báo trong `check constraint` của `profiles` nhưng CHƯA có policy RLS riêng — sẽ bổ sung khi có người dùng thật thuộc 2 role này.
- Đếm "Số thiết bị" dùng Supabase nested-aggregate (`equipment(count)`) — đúng theo tài liệu Supabase, nhưng sandbox Claude Code không gọi được `supabase.co` nên chưa tự chạy thử được với dữ liệu thật; cần bạn xác nhận qua Preview URL.
- Toàn bộ luồng thêm/sửa khách hàng (PROMPT-05), trang chi tiết (PROMPT-06) và đổi quyền inspector (mục 11) cũng chưa tự test được bằng dữ liệu thật vì lý do trên — cần xác nhận qua Preview URL theo các checklist tương ứng.
- **Màu badge trạng thái khách hàng**: PROMPT-06 yêu cầu Tiềm năng=xám/Ngừng hoạt động=đỏ nhạt, nhưng PROMPT-04 (đã merge master) đã chốt Tiềm năng=vàng/Ngừng hoạt động=xám. Đã giữ nguyên bảng màu cũ (`src/lib/customers/status.ts`) để nhất quán giữa trang danh sách và trang chi tiết thay vì làm 2 màu khác nhau cho cùng 1 trạng thái — nếu bạn muốn đổi theo màu mới, nói mình sửa 1 chỗ trong `status.ts` là áp dụng cho cả 2 trang.
