-- ============================================================
--  골드박스 (쿠팡 데일리 특가) — 별도 섹션
--  "평소보다 싼 것"(detect 판정) 아니라 쿠팡 지정 특가라 분리.
--  매일 통째 교체 방식이라 종료 추적 불필요.
--  SQL Editor에서 실행 (⚠️ 실행 전 브라우저 번역 끄기 = 원본 보기)
-- ============================================================

create table if not exists goldbox_deals (
  id            bigint generated always as identity primary key,
  title         text not null,
  image_url     text,
  affiliate_url text not null,          -- 쿠팡 제휴링크
  list_price    bigint,                 -- 정가(할인 전)
  current_price bigint not null,        -- 할인가
  discount_rate int,                    -- 정가 대비 % (계산 저장)
  unit_price    text,                   -- 100g당 등
  shipping_fee  bigint,                 -- 0=무료
  category      text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_goldbox_sort on goldbox_deals(sort_order, id);

alter table goldbox_deals enable row level security;
drop policy if exists "public read goldbox" on goldbox_deals;
create policy "public read goldbox" on goldbox_deals
  for select to anon, authenticated using (true);
