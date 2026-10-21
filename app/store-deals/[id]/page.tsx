import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RetailDetailActions } from '@/components/RetailOffers';
import { getRetailCatalog } from '@/lib/retailCatalog';
import { bundlePrice, checkedDate, comparableHistory, money, offerStatus, periodText, previousPrice, retailer } from '@/lib/retail';

export const revalidate = 1800;
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { catalog } = await getRetailCatalog();
  const o = catalog.offers.find(o => o.id === id);
  if (!o) return { title: '행사 기록을 찾을 수 없습니다', robots: { index: false } };
  return { title: `${o.name} ${o.promotion} | ${retailer(o.retailer).name} 행사 기록`, description: `${o.name}의 행사 수량별 결제 금액·공식 조건·실제 관측 이력을 확인하세요. 기간과 점포별 적용은 원문을 확인합니다.`, alternates: { canonical: `/store-deals/${id}` } };
}
export default async function StoreDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { catalog, usingSaved } = await getRetailCatalog();
  const o = catalog.offers.find(o => o.id === id);
  if (!o) notFound();
  const r = retailer(o.retailer), price = bundlePrice(o), prior = previousPrice(o), state = offerStatus(o);
  const history = comparableHistory(o).slice().reverse();
  return <article className="mx-auto max-w-3xl space-y-6">
    <Link href={`/store-deals?brand=${o.retailer}`} className="text-sm font-bold text-gray-600 hover:underline">← {r.name} 행사 목록</Link>
    <header className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8"><div className="flex flex-wrap items-center gap-3"><span className="text-sm font-black" style={{ color: r.color }}>{r.name}</span><span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">{o.promotion}</span><span className="text-xs font-bold text-gray-600">{state === 'ended' ? '종료된 행사' : state === 'old' ? '이전 확인 기록' : state === 'upcoming' ? '예정 행사' : '공식 원문에서 최근 확인'}</span></div><h1 className="mt-4 text-2xl font-black leading-tight text-gray-950 sm:text-3xl">{o.name}</h1><p className="mt-3 text-sm text-gray-600">{periodText(o)}</p><p className="mt-2 text-xs text-gray-500">마지막 원문 확인 {checkedDate(o.lastSeenAt)}</p></header>
    {o.priceKind === 'reference' && <p className="rounded-xl bg-slate-100 p-4 text-sm leading-6 text-slate-800">공식 발표·점포 조회의 참고가격입니다. 할인·현재 판매가·재고 확인이 아니며 장보기 예상 합계에 포함하지 않습니다. {o.priceLabel}</p>}
    {usingSaved && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">자료 갱신을 확인하지 못해 저장된 관측 기록을 표시하고 있습니다.</p>}
    {(state === 'old' || state === 'ended') && <p className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">{state === 'ended' ? '공개된 행사 기간이 지났습니다.' : '48시간 이내에 다시 확인하지 못했습니다.'} 아래 금액은 과거 관측 기록이며 현재 구매 가능 가격으로 볼 수 없습니다.</p>}
    {price && <section className="rounded-2xl bg-[#fff4ed] p-6"><h2 className="text-lg font-extrabold">{o.priceKind === 'reference' ? '공식 발표·조회 참고가격' : '필요한 수량과 결제 금액'}</h2><div className="mt-4 grid grid-cols-2 gap-4"><div><p className="text-xs text-gray-600">{o.giftQuantity ? '공식 목록의 1개 표시가' : o.priceKind === 'reference' ? '공식 발표·조회 참고가격' : '공식 원문의 판매단위 가격'}</p><p className="mt-1 text-xl font-extrabold">{money(o.unitPrice!)}</p></div><div><p className="text-xs text-gray-600">{o.giftQuantity ? `${o.buyQuantity}개 결제 + ${o.giftQuantity}개 증정` : '상품명에 표시된 용량·묶음 기준'}</p><p className="mt-1 text-xl font-extrabold">{o.giftQuantity ? `총 ${price.quantity}개` : '판매단위 1묶음'}</p></div><div><p className="text-xs text-gray-600">{o.priceKind === 'reference' ? '해당 판매단위 참고가격' : '한 행사 묶음의 결제 총액'}</p><p className="mt-1 text-2xl font-black text-red-700">{money(price.total)}</p></div><div><p className="text-xs text-gray-600">{o.giftQuantity ? '증정 수량을 포함한 개당 금액' : (o.priceLabel || '전단 조건 적용')}</p><p className="mt-1 text-xl font-extrabold">{money(price.each)}</p></div></div><p className="mt-4 text-xs leading-6 text-gray-600">{o.giftQuantity ? `계산: ${money(o.unitPrice!)} × ${o.buyQuantity}개 ÷ (${o.buyQuantity} + ${o.giftQuantity})개. 동일 상품을 행사 수량대로 구매할 때의 산술 비교입니다.` : '일반 전단가는 상품명에 표시된 판매 단위 기준입니다. 회원 조건·점포별 적용을 확인하세요.'} 평소 가격이나 추적 최저가가 아닙니다. 필요 없는 수량까지 사면 절약이 되지 않을 수 있습니다.</p></section>}
    <section className="rounded-2xl border border-gray-200 p-6"><h2 className="text-lg font-extrabold">방문 전에 확인할 조건</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-gray-700">{o.conditions.map(c => <li key={c}>{c}</li>)}{!o.endDate && <li>원문에 시작·종료일이 공개되지 않아 날짜를 추정하지 않았습니다. 확인시각은 행사 종료일이 아닙니다.</li>}<li>같은 브랜드라도 점포·온오프라인·회원·결제수단에 따라 적용이 다를 수 있습니다. 재고를 확인한 것은 아닙니다.</li></ul><p className="mt-3 text-xs text-gray-500">확인 범위: {o.scope}</p><a href={o.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block rounded-xl bg-gray-950 px-5 py-3 text-sm font-extrabold text-white">{r.name} 공식 상품·행사 확인 ↗</a><p className="mt-2 text-xs text-gray-500">공식 원문으로 바로 연결하며 제휴 식별자를 추가하지 않습니다.</p></section>
    <RetailDetailActions offer={o} />
    <section className="rounded-2xl border border-gray-200 p-6"><h2 className="text-lg font-extrabold">{o.priceKind === 'reference' ? '발표·조회 참고가격 기록' : '이전 행사·가격 기록'}</h2><p className="mt-2 text-sm leading-6 text-gray-600">{prior ? `이전에는 ${prior.observation.promotion}, 판매단위당 ${money(prior.price.each)}로 관측했습니다. 동일 상품·증정 수량 기준의 기록입니다.` : '아직 비교 가능한 이전 행사 변경 기록이 없습니다. 가격을 추정해 그래프를 만들지 않습니다.'}</p><p className="mt-2 text-xs text-gray-500">첫 확인 {checkedDate(o.firstSeenAt)} · 재수집만으로 조건이 바뀌었다고 표시하지 않습니다.</p>
      {history.length > 0 && <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><caption className="mb-2 text-left text-gray-500">실제 확인 기록 · 같은 날 조건이 같으면 마지막 확인 1회로 합칩니다.</caption><thead><tr className="border-b"><th className="whitespace-nowrap p-2">확인시각</th><th className="p-2">행사</th><th className="whitespace-nowrap p-2">{o.priceKind === 'reference' ? '참고가격' : '결제 총액'}</th><th className="whitespace-nowrap p-2">판매단위당 금액</th></tr></thead><tbody>{history.map((h, i) => { const p = bundlePrice(h)!; return <tr className="border-b border-gray-100" key={h.checkedAt + i}><td className="whitespace-nowrap p-2">{checkedDate(h.checkedAt)}</td><td className="p-2">{h.promotion}</td><td className="whitespace-nowrap p-2">{money(p.total)} / {o.giftQuantity ? `${p.quantity}개` : '판매단위 1묶음'}</td><td className="whitespace-nowrap p-2">{money(p.each)}</td></tr>; })}</tbody></table></div>}
      {!price && <p className="mt-3 text-sm text-gray-600">가격이 공개되지 않은 행사 안내는 상품 가격 비교 대상에서 제외합니다.</p>}
    </section>
    <section className="rounded-2xl bg-gray-50 p-6 text-sm leading-7 text-gray-600"><h2 className="font-extrabold text-gray-950">이 기록으로 판단할 수 없는 것</h2><p className="mt-2">행사 표시만으로 국내 최저가를 판정하지 않습니다. 다른 용량·맛·묶음은 별도 상품이며, 전체 기간의 최저가·재고·결제 성공을 보장하지 않습니다. 다른 판매처를 비교할 때는 배송비와 필요한 수량까지 맞춰 보세요.</p><Link href="/unit-price" className="mt-3 inline-block font-bold text-red-700">용량·수량을 맞춰 단위가격 계산 →</Link></section>
  </article>;
}
