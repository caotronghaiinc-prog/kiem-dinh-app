-- Bảng profiles (mở rộng từ Supabase Auth)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null check (role in ('admin','inspector','accountant','office')),
  phone text,
  active boolean default true,
  created_at timestamptz default now()
);

-- Bảng khách hàng
create table customers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null, -- KH-2026-001, tự sinh
  company_name text not null,
  address text,
  tax_code text,
  contact_name text,
  phone text,
  email text,
  type text, -- doanh nghiệp / cá nhân
  industry text,
  source text, -- nguồn khách hàng
  status text default 'potential' check (status in ('potential','active','inactive')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Bảng thiết bị của khách hàng
create table equipment (
  id uuid primary key default gen_random_uuid(),
  code text unique not null, -- TB-KH001-001, tự sinh
  customer_id uuid references customers(id) on delete cascade,
  name text not null,
  type text, -- nồi hơi / cần trục / thang máy / v.v.
  manufacturer text,
  manufacture_year int,
  serial_number text,
  specifications jsonb, -- thông số kỹ thuật linh hoạt
  location text,
  last_inspection_date date,
  expiry_date date,
  inspection_cycle int, -- số tháng giữa 2 lần KĐ
  status text default 'valid' check (status in ('valid','expiring_soon','expired','inactive')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Bảng lịch sử kiểm định
create table inspection_history (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid references equipment(id) on delete cascade,
  inspection_date date not null,
  inspector_id uuid references profiles(id),
  result text check (result in ('pass','fail','pending')),
  report_number text,
  new_expiry_date date,
  contract_id uuid, -- sẽ FK vào bảng contracts ở Phase 3
  notes text,
  created_at timestamptz default now()
);

-- Enable Row Level Security cho tất cả bảng (sẽ cấu hình policy chi tiết ở PROMPT-03)
alter table profiles enable row level security;
alter table customers enable row level security;
alter table equipment enable row level security;
alter table inspection_history enable row level security;

-- Policy tạm thời: cho phép user đã đăng nhập đọc/ghi (sẽ siết lại ở PROMPT-03)
create policy "Authenticated users full access" on customers for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on equipment for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on inspection_history for all using (auth.role() = 'authenticated');
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
