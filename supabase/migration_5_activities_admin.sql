-- ============================================================
-- 異動 5：活動（含價格）＋ 管理人（admin）角色
-- 在 Supabase → SQL Editor 貼上整段執行一次
-- ============================================================

-- 1) profiles 加「是否為管理人」
alter table profiles add column if not exists is_admin boolean not null default false;

-- 2) 活動資料表（由管理人維護）
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  name text not null,                         -- 活動名稱
  price int not null default 0,               -- 小孩單價（每位）
  adult_min_charge int not null default 150,  -- 大人低消
  description text,                           -- 活動簡介
  image_url text,                             -- 活動圖片
  is_active boolean not null default true,    -- 是否上架
  sort_order int not null default 0,          -- 排序（小的在前）
  created_at timestamptz default now()
);

-- 3) 時段連到活動（保留舊的 activity_name 以相容，之後改用 activity_id）
alter table slots add column if not exists activity_id uuid references activities(id) on delete set null;

-- 4) 訂單金額欄位（金流前先鋪好）
alter table bookings add column if not exists amount int not null default 0;
alter table bookings add column if not exists status text not null default 'confirmed';

-- ============================================================
-- Row Level Security：活動
-- ============================================================
alter table activities enable row level security;

-- 所有人可瀏覽活動（客人要看）
drop policy if exists "activities viewable by everyone" on activities;
create policy "activities viewable by everyone"
  on activities for select using (true);

-- 只有管理人可新增/修改/刪除活動
drop policy if exists "admin manage activities" on activities;
create policy "admin manage activities"
  on activities for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- ============================================================
-- 5) 把指定帳號設為管理人（帳號需已存在於系統中）
--    若此 email 尚未註冊，先到網站註冊一次再執行這行
-- ============================================================
update profiles set is_admin = true where email = 'mr.seanchiu@gmail.com';

-- ============================================================
-- 6) 範例活動（先放幾張示意圖，之後可換成真實照片）
-- ============================================================
insert into activities (name, price, adult_min_charge, description, image_url, sort_order)
values
  ('黏土手作課', 500, 150, '用天然黏土捏出可愛小動物，訓練小手肌肉與創造力。', 'https://picsum.photos/seed/clay/800/500', 1),
  ('積木創意課', 450, 150, '大型軟積木自由堆疊，激發空間想像與團隊合作。', 'https://picsum.photos/seed/blocks/800/500', 2),
  ('繪本說故事', 350, 150, '老師帶讀互動繪本，搭配律動與角色扮演。', 'https://picsum.photos/seed/story/800/500', 3)
on conflict do nothing;
