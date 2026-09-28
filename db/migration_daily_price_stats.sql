-- One calendar day must have one vote in price averages. Repeated crawler runs
-- must not make a frequently-polled day outweigh the rest of the month.
drop view if exists v_active_deals;
create view v_active_deals as
select
  d.id            as deal_id,
  d.current_price,
  d.list_price,
  d.baseline_price,
  d.discount_vs_avg,
  d.discount_vs_list,
  d.is_lowest_ever,
  d.is_price_error,
  d.status,
  d.detected_at,
  d.ended_at,
  p.id            as product_id,
  p.platform,
  p.mall_name,
  p.shipping_fee,
  p.title,
  p.image_url,
  p.affiliate_url,
  p.product_url,
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
join products p   on p.id = d.product_id
left join categories c on c.id = p.category_id
left join deal_stats s on s.product_id = p.id
left join lateral (
  with daily as (
    select
      (collected_at at time zone 'Asia/Seoul')::date as observed_date,
      percentile_cont(0.5) within group (order by price)::numeric as day_price
    from price_history h
    where h.product_id = p.id
    group by 1
  )
  select
    round(avg(day_price) filter (where observed_date >= (now() at time zone 'Asia/Seoul')::date - 29))::bigint as avg30_price,
    min(day_price) filter (where observed_date >= (now() at time zone 'Asia/Seoul')::date - 89)::bigint as min90_price,
    max(day_price) filter (where observed_date >= (now() at time zone 'Asia/Seoul')::date - 89)::bigint as max90_price,
    case when count(*) = 0 then null
      else greatest(1, (max(observed_date) - min(observed_date)) + 1) end::int as tracked_days,
    count(*)::int as history_points
  from daily
) ph on true
where d.status = 'active'
   or (d.status = 'ended' and d.ended_at > now() - interval '24 hours');

alter view v_active_deals set (security_invoker = on);
grant select on v_active_deals to anon, authenticated;
