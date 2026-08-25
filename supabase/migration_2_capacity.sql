-- ============================================================
-- 異動 2：時段人數上限 + 預約人數/年齡欄位
-- 在 Supabase → SQL Editor 貼上整段執行一次
-- ============================================================

-- 1) 時段加入「人數上限」與「已預約人數」
alter table slots add column if not exists capacity int not null default 1;
alter table slots add column if not exists booked_count int not null default 0;

-- 把舊的 is_booked 轉成 booked_count，再移除 is_booked
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'slots' and column_name = 'is_booked'
  ) then
    update slots set booked_count = case when is_booked then 1 else 0 end;
    alter table slots drop column is_booked;
  end if;
end $$;

-- 2) 預約加入「人數」「年齡」，並把 email 改成可不填
alter table bookings add column if not exists party_size int not null default 1;
alter table bookings add column if not exists customer_age text;
alter table bookings alter column customer_email drop not null;

-- 3) 更新觸發器：依人數檢查名額並累加（取代舊版）
create or replace function handle_new_booking()
returns trigger as $$
declare
  cap int;
  booked int;
begin
  select capacity, booked_count into cap, booked
  from slots where id = new.slot_id for update;

  if booked + new.party_size > cap then
    raise exception '此時段名額不足，已約滿';
  end if;

  update slots set booked_count = booked_count + new.party_size
  where id = new.slot_id;
  return new;
end;
$$ language plpgsql security definer;
