-- ============================================================
--  핫딜 큐레이션 사이트 — Supabase(PostgreSQL) 스키마
--  Supabase > SQL Editor 에 붙여넣고 실행하세요.
-- ============================================================

-- ── 1. 카테고리 (대/소분류 트리 + deal_type로 확장 대비) ──────
create table if not exists categories (
  id          bigint generated always as identity primary key,
  parent_id   bigint references categories(id) on delete set null,
  name        text not null,
  slug        text not null unique,
  deal_type   text not null default 'shopping'
              check (deal_type in ('shopping', 'flight', 'auction')),
  sort_order  int  not null default 0
);

-- ── 2. 상품 ──────────────────────────────────────────────────
create table if not exists products (
  id                   bigint generated always as identity primary key,
  platform             text not null
                       check (platform in ('coupang', 'aliexpress', 'cps', 'naver')),
  external_product_id  text not null,
  title                text not null,
  category_id          bigint references categories(id) on delete set null,
  image_url            text,
  product_url          text,
  affiliate_url        text,
  list_price           bigint,           -- 정가(원가)
  mall_name            text,             -- 표시용 쇼핑몰명 (G마켓/쿠팡 등)
  shipping_fee         bigint,           -- 배송비 (0=무료, null=정보없음)
  unit_price           text,             -- 단위가격 (예: "100g당 1,094원")
  created_at           timestamptz not null default now(),
  -- 같은 플랫폼 내 동일 상품 중복 방지
  unique (platform, external_product_id)
);

create index if not exists idx_products_category on products(category_id);

-- ── 3. 가격 이력 (노출 특가 상품만 시계열 적재 → 그래프/평균용) ─
create table if not exists price_history (
  id           bigint generated always as identity primary key,
  product_id   bigint not null references products(id) on delete cascade,
  price        bigint not null,
  collected_at timestamptz not null default now()
);

create index if not exists idx_price_history_product
  on price_history(product_id, collected_at desc);

-- ── 4. 핫딜 (딜 생명주기 + 하락률 지표) ───────────────────────
create table if not exists hot_deals (
  id               bigint generated always as identity primary key,
  product_id       bigint not null references products(id) on delete cascade,
  current_price    bigint not null,
  list_price       bigint,            -- 정가(스냅샷)
  baseline_price   bigint,            -- 평소 기준가(30일 평균/중앙값)
  discount_vs_list numeric(8,2),      -- 정가 대비 하락률 % (확장: 5,2 → 8,2)
  discount_vs_avg  numeric(8,2),      -- 평균 대비 하락률 % (확장: 5,2 → 8,2)
  is_lowest_ever   boolean not null default false,  -- 역대 최저가 여부
  is_price_error   boolean not null default false,  -- 가격오류 의심 플래그
  status           text not null default 'active'
                   check (status in ('active', 'ended')),
  detected_at      timestamptz not null default now(),
  ended_at         timestamptz,
  updated_at       timestamptz not null default now(),
  -- 상품당 진행중 딜은 1개만 (부분 유니크 인덱스로 아래 별도 생성)
  unique (product_id, detected_at)
);

create index if not exists idx_hot_deals_status on hot_deals(status);
create index if not exists idx_hot_deals_discount
  on hot_deals(discount_vs_avg desc nulls last);

-- 상품당 진행중(active) 딜은 하나만 허용
create unique index if not exists uniq_active_deal_per_product
  on hot_deals(product_id) where (status = 'active');

-- ── 5. 프론트가 읽는 뷰: 진행중 딜 + 상품/카테고리 조인 ────────
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
  p.title,
  p.image_url,
  p.affiliate_url,
  p.product_url,
  c.slug          as category_slug,
  c.name          as category_name,
  c.deal_type,
  p.unit_price
from hot_deals d
join products p   on p.id = d.product_id
left join categories c on c.id = p.category_id
-- 진행중 + 최근 24시간 내 종료된 딜(종료 표시용)까지 노출
where d.status = 'active'
   or (d.status = 'ended' and d.ended_at > now() - interval '24 hours');

-- ============================================================
--  카테고리 시드 데이터
-- ============================================================
insert into categories (name, slug, deal_type, sort_order) values
  ('디지털/컴퓨터', 'digital',   'shopping', 10),
  ('모바일/태블릿', 'mobile',    'shopping', 20),
  ('가전',          'appliance', 'shopping', 30),
  ('소프트웨어/게임','software',  'shopping', 40),
  ('생활/주방',     'living',    'shopping', 50),
  ('식품',          'food',      'shopping', 60),
  ('건강/보충제',   'health',    'shopping', 65),
  ('패션/잡화',     'fashion',   'shopping', 70),
  ('뷰티',          'beauty',    'shopping', 80),
  ('육아/유아',     'baby',      'shopping', 90),
  ('스포츠/레저',   'sports',    'shopping', 100),
  ('상품권/쿠폰',   'voucher',   'shopping', 110),
  ('도서/콘텐츠',   'books',     'shopping', 115),
  ('해외직구',      'overseas',  'shopping', 120),
  ('항공권 특가',   'flight',    'flight',   200),
  ('경매 특가',     'auction',   'auction',  300)
on conflict (slug) do nothing;

-- ============================================================
--  30일 지난 가격 이력 롤업(일 1건 요약) — 무료티어 용량 방지
--  크롤러가 주기적으로 SELECT rollup_old_price_history(); 호출
-- ============================================================
-- 종료 딜은 검색/공유 URL 자산이라 삭제하지 않는다.
create or replace function prune_ended_deals()
returns void language plpgsql as $$
begin
  return;
end;
$$;

create or replace function rollup_old_price_history()
returns void language plpgsql as $$
begin
  -- 30일 이전 데이터를 (상품, 날짜)별 평균 1건으로 요약
  with agg as (
    select product_id,
           date_trunc('day', collected_at) as day,
           round(avg(price))::bigint       as avg_price
    from price_history
    where collected_at < now() - interval '30 days'
    group by product_id, date_trunc('day', collected_at)
  ),
  del as (
    delete from price_history
    where collected_at < now() - interval '30 days'
    returning 1
  )
  insert into price_history (product_id, price, collected_at)
  select product_id, avg_price, day from agg;
end;
$$;
