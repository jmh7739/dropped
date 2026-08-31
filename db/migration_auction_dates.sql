-- 경매: 입찰 시작일시 + 종료일시 컬럼 추가 ('언제부터 언제까지' 표시용)
--   값은 'YYYY-MM-DD HH:MM' 문자열 그대로 저장(타임존 이슈 회피) → text.
--   Supabase SQL Editor에서 1회 실행.
alter table auction_deals
  add column if not exists bid_start_date text,
  add column if not exists bid_end_date   text;
