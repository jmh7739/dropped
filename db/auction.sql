-- ============================================================
--  경매 특가 — 부동산/자동차 법원경매 (공공데이터)
--  제휴 링크 없음 → 광고/구독으로 수익화. 구조가 달라 별도 테이블.
--  데이터 출처: 공공데이터포털(data.go.kr) 법원경매/부동산경매 API 등.
-- ============================================================

create table if not exists auction_deals (
  id               bigint generated always as identity primary key,
  source           text not null,            -- '법원경매' 등
  external_id      text not null,            -- 사건번호+물건번호
  case_no          text,                     -- 사건번호 (예: 2025타경12345)
  asset_type       text not null default '부동산'
                   check (asset_type in ('부동산', '자동차')),
  title            text not null,            -- 물건 요약(소재지/차종 등)
  location         text,                     -- 소재지
  appraisal_price  bigint,                   -- 감정가
  min_bid_price    bigint,                   -- 최저입찰가
  fail_count       int default 0,            -- 유찰 횟수
  bid_start_date   timestamptz,              -- 경매 시작일시
  bid_end_date     timestamptz,              -- 경매 종료일시
  detail_url       text,                     -- 상세(법원경매정보) 링크
  posted_at        timestamptz,
  collected_at     timestamptz not null default now(),
  unique (source, external_id)
);

create index if not exists idx_auction_type on auction_deals(asset_type);
create index if not exists idx_auction_biddate on auction_deals(bid_date);

-- RLS: 읽기만
alter table auction_deals enable row level security;
drop policy if exists "public read auction" on auction_deals;
create policy "public read auction" on auction_deals
  for select to anon, authenticated using (true);

-- 입찰기일 지난 물건 정리
create or replace function prune_old_auction_deals()
returns void language sql as $$
  delete from auction_deals where bid_date < now() - interval '1 day';
$$;
