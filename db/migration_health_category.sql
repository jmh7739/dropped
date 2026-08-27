-- ============================================================
--  식품/건강 → '식품' + '건강/보충제' 분리
--  (진짜 먹거리는 food, 비타민·홍삼 등 보충제는 health)
--  Supabase SQL Editor에서 1회 실행.
-- ============================================================

-- 1) 기존 'food' 카테고리 이름을 '식품'으로 변경
update categories set name = '식품' where slug = 'food';

-- 2) '건강/보충제' 카테고리 신설 (식품 바로 뒤)
insert into categories (name, slug, deal_type, sort_order) values
  ('건강/보충제', 'health', 'shopping', 65)
on conflict (slug) do nothing;

-- 3) 기존에 food로 잡혀 있던 보충제 상품을 health로 이동
--    (제목에 보충제 키워드가 들어간 것만 → 견과류 등 진짜 식품은 food 유지)
update products
set category_id = (select id from categories where slug = 'health')
where category_id = (select id from categories where slug = 'food')
  and (
       title like '%비타민%' or title like '%보충제%' or title like '%영양제%'
    or title like '%콜라겐%' or title like '%홍삼%'   or title like '%인삼%'
    or title like '%유산균%' or title like '%오메가%' or title like '%프로틴%'
    or title like '%단백질%' or title like '%글루코사민%' or title like '%마그네슘%'
    or title like '%아연%'   or title like '%프로폴리스%' or title like '%루테인%'
    or title like '%밀크씨슬%' or title like '%코엔자임%' or title like '%엽산%'
    or title like '%칼슘%'   or title like '%히알루론%'
  );
