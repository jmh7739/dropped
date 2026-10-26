import type { Metadata } from 'next';
import { Suspense } from 'react';
import RetailOffers from '@/components/RetailOffers';
import { getRetailCatalog } from '@/lib/retailCatalog';

export const revalidate = 1800;
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const params = await searchParams;
  return { title: '마트·편의점 행사 | 수량별 가격 비교와 장보기', description: 'CU·홈플러스·이마트의 행사 가격·기간·조건과 노브랜드·트레이더스의 공식 발표 참고가격을 구분해 확인하세요. 실제 관측 기록 비교, 브랜드 필터와 나만의 장보기 목록을 제공합니다.', alternates: { canonical: '/store-deals' }, ...(Object.keys(params).length ? { robots: { index: false, follow: true } } : {}) };
}
export default async function StoreDealsPage() {
  const { catalog, usingSaved } = await getRetailCatalog();
  return <Suspense fallback={<p className="rounded-xl border p-6" role="status">행사 필터를 준비하고 있습니다.</p>}><RetailOffers catalogJson={JSON.stringify(catalog)} usingSaved={usingSaved} /></Suspense>;
}
