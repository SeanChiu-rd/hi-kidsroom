-- ============================================================
-- 異動 3：預約成功後，自動呼叫 Edge Function 寄 email 通知老師
-- 在 Supabase → SQL Editor 貼上整段執行一次
-- ============================================================

-- 啟用 pg_net（讓資料庫能對外發送 HTTP 請求）
create extension if not exists pg_net;

-- 觸發器函式：把新預約的資料 POST 給 Edge Function
create or replace function notify_booking_email()
returns trigger as $$
begin
  perform net.http_post(
    url := 'https://vkopxivjvfruejvluvok.supabase.co/functions/v1/notify-booking',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end;
$$ language plpgsql security definer;

-- 綁定到 bookings 的新增事件（在既有的名額檢查觸發器之後）
drop trigger if exists on_booking_created_notify on bookings;
create trigger on_booking_created_notify
  after insert on bookings
  for each row execute function notify_booking_email();
