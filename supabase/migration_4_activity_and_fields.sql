-- ============================================================
-- 異動 4：活動名稱、老師電話、客戶大人/小孩人數與備註
-- 在 Supabase → SQL Editor 貼上整段執行一次
-- ============================================================

-- 1) 老師資料加電話
alter table profiles add column if not exists phone text;

-- 2) 時段加「活動名稱」
alter table slots add column if not exists activity_name text;

-- 3) 預約加「入店大人人數」「參加課程小孩人數」（備註 note、年齡 customer_age 已存在）
alter table bookings add column if not exists adults_count int not null default 0;
alter table bookings add column if not exists kids_count int not null default 1;

-- 4) 更新註冊觸發器：把電話一起寫入 profiles
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

-- 5) 更新預約觸發器：名額改以「小孩人數」計算
create or replace function handle_new_booking()
returns trigger as $$
declare
  cap int;
  booked int;
begin
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
