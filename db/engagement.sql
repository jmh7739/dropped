-- ============================================================
--  방문자 반응(좋아요/클릭) — 회원제 없음, 브라우저별 중복만 방지
--  schema.sql 실행 후 이 파일을 실행하세요.
--
--  방식:
--  - deal_stats: 상품별 누적 좋아요/클릭 수 (공개 읽기)
--  - deal_likes: (상품, 방문자해시) 유니크로 중복 좋아요 차단
--  - like_deal / click_deal: SECURITY DEFINER 함수로 RLS를 안전하게 우회.
--    브라우저는 anon 키로 rpc만 호출 → 테이블 직접 쓰기는 여전히 불가.
-- ============================================================

create table if not exists deal_stats (
  product_id  bigint primary key references products(id) on delete cascade,
  like_count  int not null default 0,
  click_count int not null default 0,
  updated_at  timestamptz not null default now()
);

create table if not exists deal_likes (
  product_id   bigint not null references products(id) on delete cascade,
  visitor_hash text not null,           -- 브라우저 localStorage의 익명 id
  created_at   timestamptz not null default now(),
  primary key (product_id, visitor_hash)
);

-- 읽기: 통계는 공개. 쓰기 정책 없음 → 직접 INSERT/UPDATE 불가.
alter table deal_stats enable row level security;
alter table deal_likes enable row level security;
drop policy if exists "public read stats" on deal_stats;
create policy "public read stats" on deal_stats
  for select to anon, authenticated using (true);

-- ── 좋아요 (중복이면 증가 안 함) ──────────────────────────────
create or replace function like_deal(p_product_id bigint, p_visitor text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into deal_likes (product_id, visitor_hash)
  values (p_product_id, p_visitor)
  on conflict (product_id, visitor_hash) do nothing;

  if found then
    insert into deal_stats (product_id, like_count)
    values (p_product_id, 1)
    on conflict (product_id)
    do update set like_count = deal_stats.like_count + 1,
                  updated_at = now();
  end if;

  select like_count into v_count from deal_stats where product_id = p_product_id;
  return coalesce(v_count, 0);
end;
$$;

-- ── 클릭 집계 (중복 허용) ─────────────────────────────────────
create or replace function click_deal(p_product_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into deal_stats (product_id, click_count)
  values (p_product_id, 1)
  on conflict (product_id)
  do update set click_count = deal_stats.click_count + 1,
                updated_at = now();
end;
$$;

grant execute on function like_deal(bigint, text)  to anon, authenticated;
grant execute on function click_deal(bigint)       to anon, authenticated;

-- ── 뷰에 좋아요/클릭 수 포함 (기존 뷰 교체) ───────────────────
create or replace view v_active_deals as
select
  d.id            as deal_id,
  d.current_price, d.list_price, d.baseline_price,
  d.discount_vs_list, d.discount_vs_avg,
  d.is_lowest_ever, d.is_price_error,
  d.status, d.detected_at, d.ended_at,
  p.id            as product_id,
  p.platform, p.mall_name, p.shipping_fee, p.title, p.image_url, p.affiliate_url, p.product_url,
  c.slug          as category_slug,
  c.name          as category_name,
  c.deal_type,
  coalesce(s.like_count, 0)  as like_count,
  coalesce(s.click_count, 0) as click_count
from hot_deals d
join products p    on p.id = d.product_id
left join categories c on c.id = p.category_id
left join deal_stats s on s.product_id = p.id
where d.status = 'active'
   or (d.status = 'ended' and d.ended_at > now() - interval '24 hours');

alter view v_active_deals set (security_invoker = on);
grant select on v_active_deals to anon, authenticated;
