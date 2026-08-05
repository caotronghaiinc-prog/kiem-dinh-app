-- =========================================================================
-- PROMPT-03: Supabase Auth + phân quyền (RBAC qua RLS)
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Cột is_locked cho inspection_history (chỗ móc cho Phase 2)
-- -------------------------------------------------------------------------
alter table inspection_history
  add column is_locked boolean not null default false;

-- -------------------------------------------------------------------------
-- 2. Helper function: đọc role của user hiện tại
--    SECURITY DEFINER để tránh recursive RLS khi policy trên chính bảng
--    profiles cũng cần gọi hàm này.
-- -------------------------------------------------------------------------
create or replace function public.get_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- -------------------------------------------------------------------------
-- 3. Trigger: tự tạo profile khi có user mới trong auth.users
--    role lấy từ raw_user_meta_data->>'role' (Admin set khi tạo user thủ
--    công trên Supabase Dashboard), mặc định 'inspector' nếu thiếu/không
--    hợp lệ.
-- -------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (id, email, full_name, role, active)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    case
      when meta_role in ('admin', 'inspector', 'accountant', 'office') then meta_role
      else 'inspector'
    end,
    true
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------------------
-- 4. Trigger: chặn user tự đổi role/active của chính mình qua UPDATE
--    (bổ sung cho RLS vì RLS không kiểm soát được ở mức cột).
-- -------------------------------------------------------------------------
create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
as $$
begin
  if public.get_user_role() <> 'admin' then
    if new.role is distinct from old.role or new.active is distinct from old.active then
      raise exception 'Không có quyền tự thay đổi role/active của chính bạn';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists before_profiles_update_guard on profiles;
create trigger before_profiles_update_guard
  before update on profiles
  for each row execute function public.prevent_self_role_change();

-- -------------------------------------------------------------------------
-- 5. Dọn policy tạm thời của PROMPT-01
-- -------------------------------------------------------------------------
drop policy if exists "Authenticated users full access" on customers;
drop policy if exists "Authenticated users full access" on equipment;
drop policy if exists "Authenticated users full access" on inspection_history;
drop policy if exists "Users can view own profile" on profiles;

-- -------------------------------------------------------------------------
-- 6. Policies: customers
--    SELECT: mọi user đã đăng nhập | INSERT/UPDATE/DELETE: chỉ admin
-- -------------------------------------------------------------------------
create policy "customers_select_authenticated" on customers
  for select using (auth.role() = 'authenticated');

create policy "customers_insert_admin" on customers
  for insert with check (public.get_user_role() = 'admin');

create policy "customers_update_admin" on customers
  for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "customers_delete_admin" on customers
  for delete using (public.get_user_role() = 'admin');

-- -------------------------------------------------------------------------
-- 7. Policies: equipment
--    SELECT: mọi user đã đăng nhập
--    INSERT/DELETE: chỉ admin
--    UPDATE: admin hoặc inspector (cập nhật trạng thái KĐ)
-- -------------------------------------------------------------------------
create policy "equipment_select_authenticated" on equipment
  for select using (auth.role() = 'authenticated');

create policy "equipment_insert_admin" on equipment
  for insert with check (public.get_user_role() = 'admin');

create policy "equipment_update_admin_inspector" on equipment
  for update
  using (public.get_user_role() in ('admin', 'inspector'))
  with check (public.get_user_role() in ('admin', 'inspector'));

create policy "equipment_delete_admin" on equipment
  for delete using (public.get_user_role() = 'admin');

-- -------------------------------------------------------------------------
-- 8. Policies: inspection_history
--    SELECT: mọi user đã đăng nhập
--    INSERT: admin hoặc inspector
--    UPDATE: admin luôn sửa được (kể cả is_locked=true);
--            inspector chỉ sửa được khi is_locked=false
--    DELETE: chỉ admin
-- -------------------------------------------------------------------------
create policy "inspection_history_select_authenticated" on inspection_history
  for select using (auth.role() = 'authenticated');

create policy "inspection_history_insert_admin_inspector" on inspection_history
  for insert with check (public.get_user_role() in ('admin', 'inspector'));

create policy "inspection_history_update_admin_or_unlocked_inspector" on inspection_history
  for update
  using (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'inspector' and is_locked = false)
  )
  with check (
    public.get_user_role() = 'admin'
    or (public.get_user_role() = 'inspector' and is_locked = false)
  );

create policy "inspection_history_delete_admin" on inspection_history
  for delete using (public.get_user_role() = 'admin');

-- -------------------------------------------------------------------------
-- 9. Policies: profiles
--    SELECT: tự xem row của mình hoặc admin xem tất cả
--    UPDATE: tự sửa row của mình (role/active bị chặn ở trigger #4) hoặc
--            admin sửa được tất cả
--    INSERT/DELETE: không cấp cho client (chỉ qua trigger #3 hoặc
--                   Supabase Dashboard bằng service_role)
-- -------------------------------------------------------------------------
create policy "profiles_select_own_or_admin" on profiles
  for select using (id = auth.uid() or public.get_user_role() = 'admin');

create policy "profiles_update_own_or_admin" on profiles
  for update
  using (id = auth.uid() or public.get_user_role() = 'admin')
  with check (id = auth.uid() or public.get_user_role() = 'admin');
