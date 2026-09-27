-- Dropped DataMarket proposal.
-- DO NOT RUN without explicit approval.
-- Non-destructive draft: creates separate aggregate/mapping tables only.

create table if not exists normalized_products (
  id bigint generated always as identity primary key,
  canonical_title text not null,
  brand text,
  model text,
  category_id bigint references categories(id) on delete set null,
  representative_product_id bigint references products(id) on delete set null,
  confidence numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_normalization_map (
  product_id bigint primary key references products(id) on delete cascade,
  normalized_product_id bigint not null references normalized_products(id) on delete cascade,
  source text not null default 'rule',
  confidence numeric(5,2) not null default 0,
  match_reason text,
  title_hash text,
  created_at timestamptz not null default now()
);

create table if not exists dropped_price_daily (
  product_id bigint not null references products(id) on delete cascade,
  normalized_product_id bigint references normalized_products(id) on delete set null,
  period_date date not null,
  source text,
  market text,
  seller text,
  min_price bigint not null,
  max_price bigint not null,
  avg_price numeric(14,2) not null,
  median_price bigint,
  first_price bigint,
  last_price bigint,
  sample_count int not null,
  price_change_count int not null default 0,
  seller_count int,
  stock_status text,
  quality text not null default 'valid',
  is_estimated boolean not null default false,
  source_url text,
  license_type text,
  commercial_use_allowed boolean,
  redistribution_allowed boolean,
  license_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, period_date)
);

create index if not exists idx_dropped_price_daily_date
  on dropped_price_daily (period_date desc);

create index if not exists idx_dropped_price_daily_normalized
  on dropped_price_daily (normalized_product_id, period_date desc);

create table if not exists dropped_dataset_exports (
  dataset_id text not null,
  dataset_version text not null,
  period_start date not null,
  period_end date not null,
  row_count bigint not null,
  generated_at timestamptz not null default now(),
  format text not null check (format in ('csv', 'xlsx', 'json', 'parquet')),
  license text,
  source_notes text,
  primary key (dataset_id, dataset_version)
);

