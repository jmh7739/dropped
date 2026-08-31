-- 할인율 필드 확장 (numeric(5,2) → numeric(8,2))
-- DB 오류 방지를 위해 999.99% 제한을 999999.99%로 확장

-- 1. 의존 뷰 드랍
DROP VIEW IF EXISTS v_active_deals;

-- 2. 컬럼 타입 변경
ALTER TABLE hot_deals 
  ALTER COLUMN discount_vs_list TYPE numeric(8,2),
  ALTER COLUMN discount_vs_avg TYPE numeric(8,2);

-- 3. 뷰 재생성
create or replace view v_active_deals as
select
  d.id            as deal_id,
  d.current_price,
  d.list_price,
  d.baseline_price,
  d.discount_vs_list,
  d.discount_vs_avg,
  d.is_lowest_ever,
  d.is_price_error,
  d.status,
  d.detected_at,
  d.ended_at,
  p.id            as product_id,
  p.platform,
  p.mall_name,
  p.shipping_fee,
  p.unit_price,
  p.title,
  p.image_url,
  p.affiliate_url,
  p.product_url,
  p.category_slug,
  p.category_name,
  coalesce(d.like_count, 0)        as like_count,
  coalesce(d.click_count, 0)       as click_count
from hot_deals d
join products p on d.product_id = p.id;

-- 4. 뷰 권한 설정
alter view v_active_deals set (security_invoker = on);
grant select on v_active_deals to anon, authenticated;