# Dropped DataMarket 1차 설계안

이번 작업은 DataMarket 기반 데이터 구조 정리 작업이다. 기존 데이터 삭제/변경/백필/마이그레이션/cron 수정은 승인 없이 실행하지 않고, 먼저 현재 구조를 분석해서 변경안·스키마·데이터 손실 위험·예상 파일 변경 목록만 보고한 뒤 승인 후 구현한다.

## 현재 구조

현재 Dropped는 Supabase/PostgreSQL 기반으로 상품, 가격이력, 특가, 반응, 항공권, 경매 데이터를 저장한다.

확인된 핵심 테이블:

- `products`
- `price_history`
- `hot_deals`
- `deal_stats`
- `deal_likes`
- `flight_deals`
- `flight_price_history`
- `auction_deals`
- `goldbox_deals`

확인된 운영 row 수:

- `products`: 9,128
- `price_history`: 173,539
- `hot_deals`: 134
- `flight_deals`: 2,143
- `flight_price_history`: 0
- `auction_deals`: 243

`price_history` 최근 증가량:

- 최근 1일: 12,250 rows
- 최근 7일: 95,574 rows
- 최근 14일: 166,894 rows

현재 방식 유지 시 `price_history`는 대략 연 430만~500만 rows 증가할 수 있다.

## 확인된 데이터 손실 위험

### `rollup_old_price_history`

`db/schema.sql`의 `rollup_old_price_history()`는 30일 초과 `price_history`를 상품/날짜 평균 1건으로 요약한 뒤 원본 row를 삭제한다.

이 방식은 DataMarket 관점에서 위험하다.

- min_price 유실
- max_price 유실
- median_price 유실
- first_price/last_price 유실
- 하루 중 가격 변경 횟수 유실
- 이상치 검증 근거 유실

### 항공권 prune

`prune_old_flight_deals()`는 30일 지난 항공권 row를 삭제한다.

`crawler/db.py`의 `prune_old_flights()`는 `flight_price_history` 90일 초과 row를 삭제한다.

### 경매 prune

`prune_old_auction_deals()`는 지난 경매 row를 삭제한다.

경매는 Dropped 핵심 가격이력 모델과 다르므로 장기적으로 별도 서비스/데이터셋 분리가 맞다.

## 권장 구조

기존 raw는 유지한다. 별도 daily aggregate를 추가한다.

```text
raw recent: price_history
daily permanent: dropped_price_daily
archive: parquet /dropped/price_daily/year=YYYY/month=MM/
```

## normalized product 설계

동일상품 통합은 기존 `products.id`를 바로 바꾸지 않고 별도 mapping으로 시작한다.

```text
normalized_products
- id
- canonical_title
- brand
- model
- category_id
- representative_product_id
- confidence
- created_at
- updated_at

product_normalization_map
- product_id
- normalized_product_id
- source
- confidence
- match_reason
- title_hash
- created_at
```

## 권장 구현 순서

1. 현재 `rollup_old_price_history` 실제 실행 여부 확인
2. 삭제형 rollup 일시 중단 여부 결정
3. `dropped_price_daily` 추가
4. 기존 raw에서 daily aggregate backfill
5. backfill 검증
6. 새 crawler run부터 daily aggregate 추가 적재
7. raw 60~90일 보존 정책 도입
8. Parquet archive 설계

## 승인 후 예상 파일 변경

- `db/datamarket_proposal.sql`
- `crawler/db.py`
- `crawler/run.py`
- `crawler/tests/*`
- `README.md`

## 금지

- 기존 `price_history` 삭제 금지
- 기존 raw history를 daily로 덮어쓰기 금지
- backfill 검증 전 raw prune 금지
- 항공/경매 prune 임의 변경 금지

