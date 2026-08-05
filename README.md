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

## Ghi chú

- App nội bộ ~10 người dùng, ưu tiên đơn giản/dễ bảo trì hơn là tối ưu quy mô lớn.
- RLS đã bật cho cả 4 bảng nhưng policy hiện tại chỉ là tạm thời (cho phép mọi user đã đăng nhập đọc/ghi) — sẽ siết lại theo `role` ở PROMPT-03.
- CRUD thật cho khách hàng/thiết bị sẽ làm ở PROMPT-04.
