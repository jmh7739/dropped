-- ============================================================
--  항공권 "가격이 떨어졌다" — 노선·날짜별 가격 이력 + 평소가(중앙값)
--  상품처럼 이력을 쌓아 '평소 대비 하락'을 판정하기 위한 마이그레이션.
--  Supabase SQL Editor에 그대로 붙여넣고 실행하면 됨. (안전: if not exists)
-- ============================================================

-- 1) flight_deals에 평소가(중앙값) 컬럼 추가
alter table flight_deals add column if not exists baseline_price bigint;

-- 2) 노선·날짜별 가격 이력 (external_id = 출발-도착-가는날-오는날)
create table if not exists flight_price_history (
  id           bigint generated always as identity primary key,
  external_id  text not null,
  price        bigint not null,
  collected_at timestamptz not null default now()
);

create index if not exists idx_fph_ext_time
  on flight_price_history (external_id, collected_at desc);

-- 3) RLS: 이 원시 이력은 크롤러(service_role)만 접근. anon 정책 미부여 = 외부 차단.
--    (프론트는 flight_deals.baseline_price만 읽으므로 이 표를 직접 안 봄)
alter table flight_price_history enable row level security;
