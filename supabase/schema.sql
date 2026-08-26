-- ============================================================
-- hi-kidsroom 資料庫結構
-- 在 Supabase → SQL Editor 貼上整段執行一次即可
-- ============================================================

-- 1) 老師個人資料（每個登入的老師一筆，連動 auth.users）
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  bio text,
  created_at timestamptz default now()
);

-- 2) 可預約時段（老師登記）
create table if not exists slots (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  activity_name text,                   -- 活動名稱（同一活動下可有多個時段）
  start_time timestamptz not null,
  end_time timestamptz not null,
  capacity int not null default 1,      -- 此時段可容納的小孩人數上限
  booked_count int not null default 0,  -- 目前已預約的小孩人數
  created_at timestamptz default now()
);

-- 3) 預約紀錄（客人填表，免登入）
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references slots(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  customer_name text not null,
  customer_phone text,
  adults_count int not null default 0, -- 入店大人人數
  kids_count int not null default 1,   -- 參加課程小孩人數（計入名額）
  party_size int not null default 1,   -- 舊欄位（保留相容）
  customer_age text,                   -- 年齡（可填「5歲」「3-5歲」等）
  customer_email text,
  note text,                           -- 備註
  status text not null default 'confirmed',
  created_at timestamptz default now()
);

-- ============================================================
-- 新增老師時，自動建立 profile
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  );
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
declare
  cap int;
  booked int;
begin
  -- 鎖住該時段這一列，避免多人同時預約造成超額
  select capacity, booked_count into cap, booked
  from slots where id = new.slot_id for update;

  if booked + new.kids_count > cap then
    raise exception '此時段名額不足，已約滿';
  end if;

  update slots set booked_count = booked_count + new.kids_count
  where id = new.slot_id;
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
