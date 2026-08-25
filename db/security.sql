-- ============================================================
--  RLS(Row Level Security) — 공개 사이트 필수 보안 설정
--  schema.sql 실행 후 이 파일을 Supabase SQL Editor에서 실행하세요.
--
--  배경:
--  - 프론트는 브라우저에 노출되는 anon 키로 Supabase에 접근한다.
--  - RLS가 없으면 anon 키로 누구나 테이블을 INSERT/UPDATE/DELETE 할 수 있다.
--  - 아래 정책은 anon 에게 "읽기(SELECT)만" 허용하고 쓰기는 전부 막는다.
--  - 크롤러는 service_role 키를 쓰며, service_role은 RLS를 우회하므로
--    수집/쓰기는 정상 동작한다.
-- ============================================================

-- 1) 모든 테이블에 RLS 활성화 (활성화만 하면 기본은 '전부 거부')
alter table categories    enable row level security;
alter table products      enable row level security;
alter table price_history enable row level security;
alter table hot_deals     enable row level security;

-- 2) anon/authenticated 에게 SELECT만 허용하는 정책
--    (INSERT/UPDATE/DELETE 정책을 만들지 않으므로 쓰기는 자동 거부)
drop policy if exists "public read categories" on categories;
create policy "public read categories" on categories
  for select to anon, authenticated using (true);

drop policy if exists "public read products" on products;
create policy "public read products" on products
  for select to anon, authenticated using (true);

drop policy if exists "public read price_history" on price_history;
create policy "public read price_history" on price_history
  for select to anon, authenticated using (true);

-- hot_deals: 진행중 + 최근 24시간 내 종료 딜까지 공개 (그 외는 숨김)
drop policy if exists "public read active hot_deals" on hot_deals;
create policy "public read active hot_deals" on hot_deals
  for select to anon, authenticated
  using (status = 'active'
         or (status = 'ended' and ended_at > now() - interval '24 hours'));

-- 3) 뷰 접근 권한 부여
grant select on v_active_deals to anon, authenticated;

-- 참고: 뷰는 security_invoker로 만들어 underlying 테이블의 RLS를 그대로
-- 따르게 하는 것이 안전하다 (PostgreSQL 15+, Supabase 지원).
alter view v_active_deals set (security_invoker = on);
