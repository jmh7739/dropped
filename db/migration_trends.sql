-- 실시간 인기순위 / 요즘 뜨는 상품 / 파트너스 수동 생성 큐
-- 운영 DB에는 자동 적용하지 않는다. 검토 후 Supabase SQL Editor에서 수동 실행한다.

create table if not exists affiliate_keyword_cache (
  normalized_keyword text primary key,
  keyword text not null,
  affiliate_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists realtime_trends (
  id bigint generated always as identity primary key,
  keyword text not null,
  normalized_keyword text not null,
  rank int not null check (rank between 1 and 20),
  previous_rank int,
  rank_change int,
  status text not null check (status in ('up', 'down', 'same', 'NEW')),
  hot_score numeric(6,2) not null,
  category text,
  affiliate_search_url text,
  is_published boolean not null default false,
  collected_at timestamptz not null default now(),
  unique (collected_at, normalized_keyword),
  unique (collected_at, rank)
);
create index if not exists idx_realtime_trends_latest on realtime_trends(collected_at desc, rank);
alter table realtime_trends add column if not exists is_published boolean not null default false;
create index if not exists idx_realtime_trends_published on realtime_trends(is_published, collected_at desc, rank);

create table if not exists trending_products (
  id bigint generated always as identity primary key,
  keyword text not null,
  product_id bigint not null references products(id) on delete cascade,
  product_score numeric(6,2) not null,
  hot_score numeric(6,2) not null,
  category text,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (product_id)
);
create index if not exists idx_trending_products_active on trending_products(is_active, hot_score desc, product_score desc);

create table if not exists affiliate_queue (
  id bigint generated always as identity primary key,
  type text not null check (type in ('product', 'keywordSearch')),
  keyword text,
  normalized_keyword text,
  product_id bigint references products(id) on delete cascade,
  external_product_id text,
  original_url text not null,
  affiliate_url text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'success', 'error')),
  error text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uniq_affiliate_queue_keyword_pending
  on affiliate_queue(normalized_keyword) where type = 'keywordSearch' and status in ('pending', 'processing');
create unique index if not exists uniq_affiliate_queue_product_pending
  on affiliate_queue(external_product_id) where type = 'product' and status in ('pending', 'processing');

alter table realtime_trends enable row level security;
alter table trending_products enable row level security;
alter table affiliate_keyword_cache enable row level security;
alter table affiliate_queue enable row level security;

drop policy if exists "public read realtime trends" on realtime_trends;
create policy "public read realtime trends" on realtime_trends for select using (true);
drop policy if exists "public read trending products" on trending_products;
create policy "public read trending products" on trending_products for select using (true);

-- affiliate cache/queue에는 공개 정책을 만들지 않는다. worker(service_role)와
-- 서버 전용 결과 API만 읽고 쓴다.
