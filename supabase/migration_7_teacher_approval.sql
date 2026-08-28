-- ============================================================
-- Migration 7：老師註冊改為「管理人核准」制（方案 B）
-- ============================================================
-- 任何人都能自助註冊，但新帳號預設沒有老師權限（is_teacher = false），
-- 必須由管理人在後台核准後，才能進入老師專區、建立時段。
-- 這裡同時在「資料庫層」把關，避免有人繞過前端 API 自我提權。
--
-- 在 Supabase SQL Editor 貼上整段執行一次即可。

-- 1) 新增欄位：是否為「已核准的老師」
alter table profiles add column if not exists is_teacher boolean not null default false;

-- 2) 既有帳號一律視為已核准，避免現有老師被鎖在外
update profiles set is_teacher = true;

-- 3) 判斷目前登入者身分的輔助函式
--    用 security definer 避免「在 profiles 的政策裡查 profiles」造成無限遞迴
create or replace function public.current_is_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_admin);
$$;

create or replace function public.current_is_teacher()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and (is_teacher or is_admin)
  );
$$;

-- 4) 管理人可更新任何 profile（核准／取消核准老師時需要）
drop policy if exists "admin can update any profile" on profiles;
create policy "admin can update any profile"
  on profiles for update
  using (public.current_is_admin());

-- 5) 防止一般使用者自行竄改 is_teacher / is_admin（自我提權）
create or replace function protect_privileged_profile_columns()
returns trigger as $$
begin
  if (new.is_teacher is distinct from old.is_teacher
      or new.is_admin is distinct from old.is_admin) then
    if not public.current_is_admin() then
      raise exception '沒有權限修改帳號權限欄位';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists protect_profile_privileges on profiles;
create trigger protect_profile_privileges
  before update on profiles
  for each row execute function protect_privileged_profile_columns();

-- 6) 資料庫層再加一道：只有「已核准老師」能新增時段
drop policy if exists "teacher can insert own slots" on slots;
create policy "teacher can insert own slots"
  on slots for insert
  with check (auth.uid() = teacher_id and public.current_is_teacher());
