-- ============================================================
--  마이그레이션: 단위가격(100g당/100ml당) 컬럼 추가
--  기존 DB에 이미 스키마가 있는 경우, 이 파일만 SQL Editor에서 실행.
--  ⚠️ 실행 전 브라우저 자동번역을 끄세요(원문 보기) — 안 그러면 SQL이
--     한글로 번역돼서 오류납니다.
-- ============================================================

alter table products add column if not exists unit_price text;

-- 뷰 재생성 (unit_price 포함)
create or replace view v_active_deals as
select
  d.id            as deal_id,
  d.current_price, d.list_price, d.baseline_price,
  d.discount_vs_list, d.discount_vs_avg,
  d.is_lowest_ever, d.is_price_error,
  d.status, d.detected_at, d.ended_at,
  p.id            as product_id,
  p.platform, p.mall_name, p.shipping_fee,
  p.title, p.image_url, p.affiliate_url, p.product_url,
  c.slug          as category_slug,
  c.name          as category_name,
  c.deal_type,
  coalesce(s.like_count, 0)  as like_count,
  coalesce(s.click_count, 0) as click_count,
  p.unit_price
from hot_deals d
join products p    on p.id = d.product_id
left join categories c on c.id = p.category_id
left join deal_stats s on s.product_id = p.id
where d.status = 'active'
   or (d.status = 'ended' and d.ended_at > now() - interval '24 hours');

alter view v_active_deals set (security_invoker = on);
grant select on v_active_deals to anon, authenticated;

-- 이미 넣은 수동 상품 2개의 실제 단위가격 (쿠팡 표시값)
update products set unit_price = '100g당 1,094원'
  where platform = 'coupang' and external_product_id = '9137460628';
update products set unit_price = '100ml당 219원'
  where platform = 'coupang' and external_product_id = '9371774';
