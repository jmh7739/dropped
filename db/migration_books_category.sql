-- 기존 Supabase 프로젝트용: 링크프라이스 예스24·교보문고 피드를 받을 카테고리
insert into categories (name, slug, deal_type, sort_order)
values ('도서/콘텐츠', 'books', 'shopping', 115)
on conflict (slug) do nothing;
