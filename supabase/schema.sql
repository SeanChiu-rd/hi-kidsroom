-- ============================================================
-- hi-kidsroom 資料庫結構
-- 在 Supabase → SQL Editor 貼上整段執行一次即可
-- ============================================================

-- 1) 老師個人資料（每個登入的老師一筆，連動 auth.users）
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  bio text,
  created_at timestamptz default now()
);

-- 2) 可預約時段（老師登記）
create table if not exists slots (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  is_booked boolean not null default false,
  created_at timestamptz default now()
);

-- 3) 預約紀錄（客人填表，免登入）
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references slots(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  note text,
  status text not null default 'confirmed',
  created_at timestamptz default now()
);

-- ============================================================
-- 新增老師時，自動建立 profile
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- 客人預約時：檢查是否已被預約，並把時段標記為已預約
-- ============================================================
create or replace function handle_new_booking()
returns trigger as $$
begin
  if exists (select 1 from slots where id = new.slot_id and is_booked = true) then
    raise exception '此時段已被預約';
  end if;
  update slots set is_booked = true where id = new.slot_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_booking_created on bookings;
create trigger on_booking_created
  before insert on bookings
  for each row execute function handle_new_booking();

-- ============================================================
-- Row Level Security（權限控制）
-- ============================================================
alter table profiles enable row level security;
alter table slots    enable row level security;
alter table bookings enable row level security;

-- profiles：所有人可看（客人要看老師名單）；老師只能改自己的
create policy "profiles are viewable by everyone"
  on profiles for select using (true);
create policy "teacher can update own profile"
  on profiles for update using (auth.uid() = id);

-- slots：所有人可看（客人瀏覽）；老師只能新增/修改/刪除自己的
create policy "slots are viewable by everyone"
  on slots for select using (true);
create policy "teacher can insert own slots"
  on slots for insert with check (auth.uid() = teacher_id);
create policy "teacher can update own slots"
  on slots for update using (auth.uid() = teacher_id);
create policy "teacher can delete own slots"
  on slots for delete using (auth.uid() = teacher_id);

-- bookings：任何人可新增（客人預約）；老師只能看自己的預約
create policy "anyone can create a booking"
  on bookings for insert with check (true);
create policy "teacher can view own bookings"
  on bookings for select using (auth.uid() = teacher_id);
