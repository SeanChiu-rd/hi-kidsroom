-- ============================================================
-- Migration 6：活動圖片上傳用的 Storage bucket
-- 讓管理人可以直接上傳圖片（手機／電腦），不用自己找圖片網址
-- ============================================================
--
-- 在 Supabase SQL Editor 執行一次即可。
-- 建立一個公開（public）的 bucket 叫 activity-images，
-- 客人端可直接讀取圖片，只有 admin 帳號能上傳／覆蓋／刪除。

-- 1) 建立 bucket（公開讀取）
insert into storage.buckets (id, name, public)
values ('activity-images', 'activity-images', true)
on conflict (id) do nothing;

-- 2) 任何人都能「讀取」這個 bucket 裡的圖片（客人要看得到）
drop policy if exists "activity images public read" on storage.objects;
create policy "activity images public read"
on storage.objects for select
using (bucket_id = 'activity-images');

-- 3) 只有 admin 可以「上傳」圖片
drop policy if exists "activity images admin insert" on storage.objects;
create policy "activity images admin insert"
on storage.objects for insert
with check (
  bucket_id = 'activity-images'
  and exists (
    select 1 from profiles
    where profiles.id = auth.uid() and profiles.is_admin = true
  )
);

-- 4) 只有 admin 可以「覆蓋（更新）」圖片
drop policy if exists "activity images admin update" on storage.objects;
create policy "activity images admin update"
on storage.objects for update
using (
  bucket_id = 'activity-images'
  and exists (
    select 1 from profiles
    where profiles.id = auth.uid() and profiles.is_admin = true
  )
);

-- 5) 只有 admin 可以「刪除」圖片
drop policy if exists "activity images admin delete" on storage.objects;
create policy "activity images admin delete"
on storage.objects for delete
using (
  bucket_id = 'activity-images'
  and exists (
    select 1 from profiles
    where profiles.id = auth.uid() and profiles.is_admin = true
  )
);
