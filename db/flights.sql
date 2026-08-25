-- ============================================================
--  항공권 특가 — 쇼핑 딜과 구조가 달라 별도 테이블
--  (노선·날짜·항공사). 국내선/국제선은 is_domestic로 구분.
--  MVP: 커뮤니티 항공권 게시판 큐레이션. 이후 트립닷컴/스카이스캐너
--       제휴 요금 피드로 확장.
-- ============================================================

create table if not exists flight_deals (
  id           bigint generated always as identity primary key,
  source       text not null,           -- '커뮤니티' / '트립닷컴' 등
  external_id  text not null,
  origin       text not null,           -- 출발지 (예: 김포, 인천)
  destination  text not null,           -- 도착지 (예: 제주, 후쿠오카)
  depart_date  date,
  return_date  date,                    -- null이면 편도
  airline      text,
  price        bigint,
  is_domestic  boolean not null default false,
  deal_url     text not null,           -- 예약/원문 링크
  image_url    text,
  posted_at    timestamptz,
  collected_at timestamptz not null default now(),
  unique (source, external_id)
);

create index if not exists idx_flight_posted
  on flight_deals(posted_at desc nulls last);
create index if not exists idx_flight_domestic
  on flight_deals(is_domestic);

-- RLS: 읽기만
alter table flight_deals enable row level security;
drop policy if exists "public read flights" on flight_deals;
create policy "public read flights" on flight_deals
  for select to anon, authenticated using (true);

-- 30일 지난 항공권 딜 정리
create or replace function prune_old_flight_deals()
returns void language sql as $$
  delete from flight_deals where collected_at < now() - interval '30 days';
$$;
