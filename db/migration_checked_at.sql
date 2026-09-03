-- 카드에 '마지막 가격 확인 시각'을 표시하기 위한 뷰 갱신.
-- 기존 환경마다 뷰 컬럼 순서가 다를 수 있어 안전하게 재생성한다.
drop view if exists v_active_deals;
create view v_active_deals as
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
  coalesce(s.click_count, 0) as click_count,
  p.unit_price,
  d.updated_at     as checked_at,
  ph.avg30_price,
  ph.min90_price,
  ph.max90_price,
  ph.tracked_days,
  ph.history_points
from hot_deals d
join products p    on p.id = d.product_id
left join categories c on c.id = p.category_id
left join deal_stats s on s.product_id = p.id
left join lateral (
  select
    round(avg(price) filter (where collected_at >= now() - interval '30 days'))::bigint as avg30_price,
    min(price) filter (where collected_at >= now() - interval '90 days')::bigint as min90_price,
    max(price) filter (where collected_at >= now() - interval '90 days')::bigint as max90_price,
    case
      when count(*) = 0 then null
      else greatest(
        1,
        ceil(extract(epoch from (max(collected_at) - min(collected_at))) / 86400.0)::int
      )
    end as tracked_days,
    count(*)::int as history_points
  from price_history h
  where h.product_id = p.id
) ph on true
where d.status = 'active'
   or (d.status = 'ended' and d.ended_at > now() - interval '24 hours');

alter view v_active_deals set (security_invoker = on);
grant select on v_active_deals to anon, authenticated;

-- 종료된 deal URL(/deal/:id)은 검색/공유 자산이므로 hot_deals 행을 삭제하지 않는다.
create or replace function prune_ended_deals()
returns void language plpgsql as $$
begin
  return;
end;
$$;
