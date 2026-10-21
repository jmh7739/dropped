'use client';

import Link from 'next/link';
import RetailProductImage from './RetailProductImage';
import RetailDiscount from './RetailDiscount';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RETAILERS, RETAIL_STORAGE, bundlePrice, canAddToShopping, checkedDate, emptyPreferences, filterOffers, money, offerStatus, parsePreferences, periodText, previousPrice, readFilters, retailer, type RetailCatalog, type RetailFilters, type RetailOffer, type RetailPreferences } from '@/lib/retail';

function useRetailPreferences() {
  const [prefs, setPrefs] = useState<RetailPreferences>(emptyPreferences);
  const [ready, setReady] = useState(false);
  const [since, setSince] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    let p = emptyPreferences();
    try { p = parsePreferences(localStorage.getItem(RETAIL_STORAGE)); } catch { setStorageError(true); }
    let cutoff = p.lastVisit;
    try {
      const visit = JSON.parse(sessionStorage.getItem('dropped-retail-visit') || 'null');
      if (visit && Number.isFinite(visit.startedAt) && Date.now() - visit.startedAt >= 0 && Date.now() - visit.startedAt < 30 * 60000 && (visit.since === null || typeof visit.since === 'string' && Number.isFinite(Date.parse(visit.since)))) cutoff = visit.since;
      else sessionStorage.setItem('dropped-retail-visit', JSON.stringify({ since: cutoff, startedAt: Date.now() }));
    } catch { /* Local preferences still work if session storage is disabled. */ }
    setSince(cutoff);
    setPrefs({ ...p, lastVisit: new Date().toISOString() });
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(RETAIL_STORAGE, JSON.stringify(prefs)); } catch { setStorageError(true); }
  }, [prefs, ready]);
  const favorite = (id: string) => setPrefs(p => ({ ...p, favorites: p.favorites.includes(id) ? p.favorites.filter(x => x !== id) : [...p.favorites, id].slice(-500) }));
  const cart = (id: string, count?: number) => setPrefs(p => {
    const next = { ...p.cart };
    if (count === 0) delete next[id]; else next[id] = Math.max(1, Math.min(50, Math.trunc(count ?? (next[id] || 0) + 1) || 1));
    return { ...p, cart: next };
  });
  const brand = (id: string) => setPrefs(p => ({ ...p, brands: p.brands.includes(id) ? p.brands.filter(x => x !== id) : [...p.brands, id] }));
  return { prefs, ready, since, storageError, favorite, cart, brand };
}
type Controls = ReturnType<typeof useRetailPreferences>;
const outline = 'rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold hover:border-red-300 focus-visible:outline-red-500 disabled:opacity-40';
function ActionButtons({ offer: o, controls: c }: { offer: RetailOffer; controls: Controls }) {
  const saved = c.prefs.favorites.includes(o.id);
  return <div className="flex flex-wrap gap-2">
    <button type="button" className={outline} aria-pressed={saved} aria-label={`${o.name} 관심 ${saved ? '해제' : '저장'}`} disabled={!c.ready} onClick={() => c.favorite(o.id)}>{saved ? '♥ 저장됨' : '♡ 관심 저장'}</button>
    {o.kind === 'product' && <button type="button" className={outline} disabled={!c.ready || !canAddToShopping(o)} onClick={() => c.cart(o.id)}>{c.prefs.cart[o.id] ? `장보기 ${c.prefs.cart[o.id]}묶음 +` : '+ 장보기'}</button>}
  </div>;
}
function ChangedLabel({ o, since }: { o: RetailOffer; since: string | null }) {
  if (!since) return null;
  if (Date.parse(o.firstSeenAt) > Date.parse(since)) return <span className="text-xs font-bold text-red-700">지난 방문 이후 새로 확인</span>;
  if (o.history.some((h, i) => i > 0 && h.revision !== o.history[i - 1].revision && Date.parse(h.checkedAt) > Date.parse(since))) return <span className="text-xs font-bold text-amber-800">지난 방문 이후 조건 변경</span>;
  return null;
}
function OfferCard({ o, controls: c }: { o: RetailOffer; controls: Controls }) {
  const r = retailer(o.retailer), p = bundlePrice(o), prior = previousPrice(o), state = offerStatus(o);
  return <article data-retail-offer={o.id} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span style={{ color: r.color }} className="text-sm font-black">{r.name}</span><span className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-extrabold text-red-700">{o.promotion}</span></div>
    <ChangedLabel o={o} since={c.since} />
    <RetailProductImage offer={o} />
    <h3 className="min-h-12 text-base font-extrabold leading-6 text-gray-950"><Link prefetch={false} href={`/store-deals/${o.id}`} className="hover:text-red-600 hover:underline">{o.name}</Link></h3>
    {p ? <div className="my-4 rounded-xl bg-gray-50 p-3">
      <p className="text-xs text-gray-600">{o.giftQuantity ? `${o.buyQuantity}개 결제 · 총 ${p.quantity}개 받을 때` : '상품명에 표시된 판매 단위 기준'}</p>
      <p className="mt-1 text-xl font-black text-gray-950">{money(p.total)} <span className="text-xs font-medium text-gray-600">{o.priceKind === 'reference' ? '참고가' : '총액'}</span></p>
      {o.giftQuantity ? <p className="mt-1 text-sm font-bold text-red-700">개당 {money(p.each)} <span className="font-normal text-gray-500">(동일 상품 기준)</span></p> : <p className="mt-1 text-xs font-bold text-red-700">{o.priceLabel || '전단 판매 단위 기준'}</p>}
    </div> : <p className="my-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">혜택·참여 조건은 공식 안내 확인</p>}
    <RetailDiscount offer={o} />
    <div className="mb-4 space-y-1 text-xs leading-5 text-gray-600">
      <p>{state === 'ended' ? '종료 · ' : state === 'upcoming' ? '예정 · ' : state === 'old' ? '이전 확인 기록 · ' : ''}{periodText(o)}</p>
      <p>공식 원문 확인 {checkedDate(o.lastSeenAt)}</p>
      <p>{prior ? `이전 관측: 판매단위당 ${money(prior.price.each)} (${prior.observation.promotion})` : o.priceKind === 'reference' ? '발표·조회 참고가격입니다. 할인·현재 판매가를 확인한 가격이 아닙니다.' : '이전 행사와 비교할 기록이 아직 없습니다.'}</p>
    </div>
    <div className="mt-auto space-y-3"><ActionButtons offer={o} controls={c} /><div className="flex flex-wrap justify-between gap-2 border-t border-gray-100 pt-3 text-sm font-bold"><Link prefetch={false} href={`/store-deals/${o.id}`} className="text-gray-800 hover:underline">조건·가격 기록 →</Link><a href={o.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-red-700 hover:underline">공식 안내 ↗</a></div></div>
  </article>;
}
function ShoppingList({ offers, controls: c }: { offers: RetailOffer[]; controls: Controls }) {
  const rows = Object.entries(c.prefs.cart).map(([id, count]) => ({ id, count, o: offers.find(o => o.id === id) }));
  const known = rows.filter(row => row.o && canAddToShopping(row.o));
  const total = known.reduce((sum, row) => sum + bundlePrice(row.o!)!.total * row.count, 0);
  return <section aria-label="내 장보기 목록" className="rounded-2xl border border-gray-200 bg-white p-5">
    <h2 className="text-xl font-extrabold">내 장보기 목록</h2><p className="mt-2 text-sm leading-6 text-gray-600">증정 행사는 결제·증정 수량을 합친 묶음, 일반 전단가는 상품명에 표시된 판매 단위입니다. 회원·점포 조건과 재고는 방문 전 확인해 주세요.</p>
    {!rows.length && <p className="py-8 text-sm text-gray-600">상품의 ‘+ 장보기’를 누르면 브랜드별로 모아 볼 수 있어요.</p>}
    {RETAILERS.map(r => { const group = rows.filter(row => row.o?.retailer === r.id); return group.length ? <div key={r.id} className="mt-5"><h3 className="font-extrabold" style={{ color: r.color }}>{r.name}</h3><ul className="divide-y divide-gray-100">{group.map(({ id, o, count }) => { const p = bundlePrice(o!), fresh = canAddToShopping(o!); return <li key={id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="max-w-lg"><Link href={`/store-deals/${id}`} className="text-sm font-bold hover:underline">{o!.name}</Link><p className="mt-1 text-xs text-gray-600">{fresh && p ? `${o!.giftQuantity ? `${p.quantity * count}개` : `판매단위 ${count}묶음`} · 예상 결제 ${money(p.total * count)}` : '이전 확인 기록 · 합계에서 제외'}</p></div><div className="flex items-center gap-2"><label className="text-xs">묶음 <input aria-label={`${o!.name} 묶음 수`} type="number" min="1" max="50" value={count} onChange={e => c.cart(id, Number(e.target.value) || 1)} className="ml-1 w-16 rounded-lg border p-2 text-sm" /></label><button type="button" className={outline} onClick={() => c.cart(id, 0)}>삭제</button></div></li>; })}</ul></div> : null; })}
    {rows.filter(row => !row.o).map(row => <p key={row.id} className="mt-3 text-sm">이전 상품의 정보를 불러올 수 없습니다. <button type="button" className={outline} onClick={() => c.cart(row.id, 0)}>목록에서 삭제</button></p>)}
    {!!rows.length && <div className="mt-4 rounded-xl bg-red-50 p-4"><p className="font-extrabold">확인 가능한 예상 합계 {money(total)}</p><p className="mt-1 text-xs leading-5 text-gray-600">{known.length}종 기준 · 참고가격·미확인·오래된 가격 제외. 쿠폰·회원·결제수단·점포 조건에 따라 실제 결제금액은 달라질 수 있습니다.</p></div>}
    <p className="mt-4 text-xs text-gray-500">이 브라우저에만 저장됩니다. 매장 주문·예약·자동 알림 기능이 아닙니다.</p>
  </section>;
}
export function RetailDetailActions({ offer }: { offer: RetailOffer }) {
  const controls = useRetailPreferences();
  return <div className="space-y-3"><ActionButtons offer={offer} controls={controls} /><Link href="/store-deals#my-shopping" className="inline-block text-sm font-bold text-red-700 hover:underline">내 장보기 목록 보기 →</Link>{controls.storageError && <p role="status" className="text-xs text-amber-800">브라우저 저장을 사용할 수 없어 이번 화면에서만 유지됩니다.</p>}</div>;
}
export default function RetailOffers({ catalog, usingSaved }: { catalog: RetailCatalog; usingSaved: boolean }) {
  const params = useSearchParams(), router = useRouter(), pathname = usePathname();
  const filters = readFilters(new URLSearchParams(params.toString()));
  const pendingFilters = useRef(filters);
  const searchForm = useRef<HTMLFormElement>(null);
  const [view, setView] = useState<'all' | 'favorites' | 'brands' | 'changes'>('all');
  const [limit, setLimit] = useState(24), [share, setShare] = useState('');
  const controls = useRetailPreferences();
  useEffect(() => { pendingFilters.current = filters; setLimit(24); }, [params.toString()]);
  const update = (patch: Partial<RetailFilters>) => {
    const previous = pendingFilters.current;
    const next = { ...previous, ...patch };
    if (patch.type && previous.brand && retailer(previous.brand).type !== patch.type) next.brand = '';
    pendingFilters.current = next;
    const search = new URLSearchParams();
    Object.entries(next).forEach(([key, val]) => { if (val && !(key === 'period' && val === 'current')) search.set(key, val); });
    router.push(pathname + (search.size ? '?' + search.toString() : ''), { scroll: false });
  };
  const clearFilters = () => {
    pendingFilters.current = readFilters(new URLSearchParams());
    searchForm.current?.reset();
    router.push(pathname, { scroll: false });
    setView('all');
    setLimit(24);
  };
  const visible = useMemo(() => {
    const matched = filterOffers(catalog.offers, filters).filter(o => view === 'all' || view === 'favorites' && controls.prefs.favorites.includes(o.id) || view === 'brands' && controls.prefs.brands.includes(o.retailer) || view === 'changes' && !!controls.since && (Date.parse(o.firstSeenAt) > Date.parse(controls.since) || o.history.some((h, i) => i > 0 && h.revision !== o.history[i - 1].revision && Date.parse(h.checkedAt) > Date.parse(controls.since!))));
    const groups = RETAILERS.map(r => matched.filter(o => o.retailer === r.id));
    return Array.from({length: Math.max(0,...groups.map(g => g.length))}, (_,i) => groups.flatMap(g => g[i] ? [g[i]] : [])).flat();
  }, [catalog, params.toString(), view, controls.prefs, controls.since]);
  const guides = RETAILERS.filter(r => (!filters.brand || filters.brand === r.id) && (!filters.type || filters.type === r.type) && (view !== 'brands' || controls.prefs.brands.includes(r.id)));
  const current = catalog.offers.filter(o => offerStatus(o) === 'current');
  const copyLink = async () => { const url = window.location.origin + pathname + (params.size ? '?' + params.toString() : ''); try { await navigator.clipboard.writeText(url); setShare('링크를 복사했습니다. 관심·장보기 기록은 포함되지 않습니다.'); } catch { setShare(url); } };
  return <div className="space-y-7">
    <header className="rounded-3xl bg-[#fff4ed] p-6 sm:p-9">
      <p className="text-xs font-extrabold tracking-widest text-red-700">이번 장보기, 조건부터 비교하세요</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">마트·편의점 행사</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-700">1+1이라고 무조건 싼 건 아니니까. 필요한 수량의 총액을 보고, 직접 확인한 이전 행사 기록과 비교해 보세요.</p>
      <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold"><span className="rounded-full bg-white px-3 py-2">행사 상품 {current.filter(o => o.kind === 'product' && o.priceKind !== 'reference').length}종</span><span className="rounded-full bg-white px-3 py-2">참고가격 {current.filter(o => o.priceKind === 'reference').length}종</span><span className="rounded-full bg-white px-3 py-2">공식 안내 {RETAILERS.length}개 브랜드</span><a href="#my-shopping" className="rounded-full bg-gray-950 px-3 py-2 text-white">내 장보기 {Object.keys(controls.prefs.cart).length}종 ↓</a></div>
    </header>
    <section aria-label="행사 검색과 필터" className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <form ref={searchForm} action="/store-deals" method="get" onSubmit={e => { e.preventDefault(); update({ q: String(new FormData(e.currentTarget).get('q') || '') }); }} className="flex gap-2">
        {Object.entries(filters).filter(([key,value]) => key !== 'q' && !!value).map(([key,value]) => <input key={key} type="hidden" name={key} value={value} />)}
        <label className="min-w-0 flex-1"><span className="sr-only">행사 상품 검색</span><input key={filters.q} name="q" type="search" maxLength={80} placeholder="상품명·용량으로 검색" defaultValue={filters.q} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm" /></label><button className="rounded-xl bg-red-600 px-5 text-sm font-extrabold text-white" type="submit">검색</button></form>
      <div aria-label="가격 구분" className="mt-4 flex flex-wrap gap-2">{([['','전체 가격'],['promotion','행사 가격'],['reference','참고가격']] as const).map(([v,label]) => <button key={v} type="button" disabled={!controls.ready} aria-pressed={filters.priceKind === v} className={outline + (filters.priceKind === v ? ' border-red-500 bg-red-50' : '')} onClick={() => update({priceKind:v})}>{label}</button>)}</div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <label className="text-xs font-bold text-gray-600">기간<select disabled={!controls.ready} aria-label="기간" value={filters.period} onChange={e => update({ period: e.target.value })} className="mt-1 w-full rounded-lg border bg-white p-2.5 text-sm text-gray-950"><option value="current">최근 확인 기록</option><option value="week">7일 내 종료일 확인</option><option value="upcoming">예정 행사</option><option value="ended">종료 행사 기록</option><option value="all">전체 관측 기록</option></select></label>
        <label className="text-xs font-bold text-gray-600">매장 종류<select disabled={!controls.ready} aria-label="매장 종류" value={filters.type} onChange={e => update({ type: e.target.value })} className="mt-1 w-full rounded-lg border bg-white p-2.5 text-sm text-gray-950"><option value="">전체</option>{['마트','편의점','창고형'].map(v => <option key={v}>{v}</option>)}</select></label>
        <label className="text-xs font-bold text-gray-600">브랜드<select disabled={!controls.ready} aria-label="브랜드" value={filters.brand} onChange={e => update({ brand: e.target.value, type: '' })} className="mt-1 w-full rounded-lg border bg-white p-2.5 text-sm text-gray-950"><option value="">전체 브랜드</option>{RETAILERS.map(r => <option value={r.id} key={r.id}>{r.name}</option>)}</select></label>
        <label className="text-xs font-bold text-gray-600">행사 유형<select disabled={!controls.ready} aria-label="행사 유형" value={filters.promo} onChange={e => update({ promo: e.target.value })} className="mt-1 w-full rounded-lg border bg-white p-2.5 text-sm text-gray-950"><option value="">전체</option>{['1+1','2+1','멤버특가','전단가','공식행사가','공식발표가','점포조회가','행사 안내'].map(v => <option key={v}>{v}</option>)}</select></label>
        <label className="text-xs font-bold text-gray-600">품목<select disabled={!controls.ready} aria-label="품목" value={filters.category} onChange={e => update({ category: e.target.value })} className="mt-1 w-full rounded-lg border bg-white p-2.5 text-sm text-gray-950"><option value="">전체 품목</option>{['음료','과자·디저트','생활용품','식품·기타','행사 안내'].map(v => <option key={v}>{v}</option>)}</select></label>
        <div className="col-span-2 flex items-end gap-2 sm:col-span-1"><button type="button" className={outline + ' whitespace-nowrap'} onClick={clearFilters}>초기화</button><button type="button" className={outline + ' whitespace-nowrap'} onClick={copyLink}>링크 공유</button></div>
      </div><p className="mt-3 text-xs leading-5 text-gray-500">‘최근 확인’은 48시간 안에 공식 원문을 확인한 기록입니다. 참고가격은 발표·조회 기록이며 현재 판매가나 할인 확인이 아니므로 장보기 합계에 넣지 않습니다. 종료일이 없는 상품은 ‘7일 내 종료’에 넣지 않습니다.</p>{share && <p role="status" className="mt-2 break-all text-xs text-red-700">{share}</p>}
    </section>
    <div aria-label="브랜드별 내부 가격 목록" className="flex flex-wrap gap-2">{RETAILERS.map(r => { const count = current.filter(o => o.kind === 'product' && o.retailer === r.id).length; return <button key={r.id} type="button" onClick={() => update({brand:r.id,type:''})} aria-pressed={filters.brand === r.id} className={outline + (filters.brand === r.id ? ' border-red-500 bg-red-50' : '')}>{r.name} <span className="ml-1 text-xs text-gray-500">{count ? `${count}종` : '확인 중'}</span></button>; })}</div>
    <details aria-label="공식 매장 행사 안내" open={!!filters.brand && !current.some(o => o.retailer === filters.brand)} className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <summary className="cursor-pointer text-base font-extrabold">브랜드별 공식 안내 {guides.length}곳 <span className="ml-2 text-xs font-normal text-gray-500">전단·점포 찾기 · 관심 브랜드 저장</span></summary>
      <div className="mb-3 mt-4 text-xs text-gray-500">별표로 자주 가는 곳을 저장하세요. 브랜드를 선택하면 해당 안내가 자동으로 열립니다.</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{guides.map(r => <article key={r.id} className="rounded-xl border border-gray-200 bg-white p-4"><div className="flex items-center justify-between"><h3 className="font-black" style={{ color: r.color }}>{r.name}</h3><button type="button" aria-label={`${r.name} 관심 브랜드`} aria-pressed={controls.prefs.brands.includes(r.id)} disabled={!controls.ready} onClick={() => controls.brand(r.id)} className="rounded-lg px-2 py-1 text-lg text-amber-700">{controls.prefs.brands.includes(r.id) ? '★' : '☆'}</button></div><p className="my-2 min-h-10 text-xs leading-5 text-gray-600">{r.note}</p><a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-gray-900 hover:underline">{r.id === 'nobrand' ? '공식 점포 찾기' : '공식 행사·전단'} ↗</a></article>)}</div>
    </details>
    <section aria-labelledby="retail-list-heading">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="retail-list-heading" className="text-xl font-extrabold">조건에 맞는 관측 기록 <span className="text-red-600">{visible.length}건</span></h2><span className="text-xs text-gray-500">상품 {visible.filter(o => o.kind === 'product').length} · 행사 안내 {visible.filter(o => o.kind === 'event').length}</span></div>
      <div className="my-4 flex flex-wrap gap-2" aria-label="저장 기록 필터">{([['all','전체'],['favorites',`관심 상품 ${controls.prefs.favorites.length}`],['brands','관심 브랜드'],['changes','지난 방문 이후']] as const).map(([v,label]) => <button key={v} type="button" aria-pressed={view === v} onClick={() => { setView(v); setLimit(24); }} className={view === v ? 'rounded-full bg-gray-950 px-4 py-2 text-xs font-bold text-white' : 'rounded-full border bg-white px-4 py-2 text-xs font-bold text-gray-600'}>{label}</button>)}</div>
      {view === 'changes' && !controls.since && <p className="mb-4 text-sm text-gray-600">첫 방문입니다. 다음 방문부터 새 상품과 실제 조건 변경을 구분해 보여드립니다.</p>}
      {usingSaved && <p role="status" className="mb-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">최근 자료를 불러오지 못해 저장된 확인 기록을 표시합니다. 아래 상품별 확인시각을 확인해 주세요.</p>}
      {!visible.length ? <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-7"><h3 className="font-bold">이 조건으로 확인된 상품 기록이 없습니다.</h3><p className="mt-2 text-sm leading-6 text-gray-600">매장에 행사가 없다는 뜻은 아닙니다. 위 공식 안내에서 점포·기간을 확인하거나 필터를 바꿔 보세요. 가격을 확인하지 못한 상품은 채워 넣지 않습니다.</p><button type="button" className={outline + ' mt-4'} onClick={clearFilters}>전체 행사로 돌아가기</button></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.slice(0,limit).map(o => <OfferCard key={o.id} o={o} controls={controls} />)}</div>}
      {visible.length > limit && <button type="button" onClick={() => setLimit(n => n + 24)} className={outline + ' mx-auto mt-5 block px-8'}>상품 더 보기 ({limit}/{visible.length})</button>}
      <p className="mt-4 text-xs leading-5 text-gray-500">CU는 공식 1+1·2+1 목록에서 각 2페이지, 홈플러스는 공식 디지털 전단 목록과 상품 상세를 대조한 기록입니다. 이마트 행사가는 공식 뉴스룸의 행사 기간·결제 조건을 대조했습니다. 노브랜드·트레이더스는 공식 출시 발표의 참고가격만 제공합니다. 전체 매장의 행사 수가 아닙니다. 브랜드별로 확인된 가격만 내부 목록에 반영합니다. 판매처 표시 행사와 이력 기반 최저가 판정은 다릅니다.</p>
    </section>
    <div id="my-shopping" className="scroll-mt-36"><ShoppingList offers={catalog.offers} controls={controls} /></div>
    {controls.storageError && <p role="status" className="text-sm text-amber-800">브라우저 저장을 사용할 수 없어 관심·장보기 목록은 이번 화면에서만 유지됩니다.</p>}
    <section className="rounded-2xl bg-gray-50 p-5 text-sm leading-7 text-gray-600"><h2 className="font-extrabold text-gray-950">방문 전에 이렇게 확인하세요</h2><ol className="mt-2 list-decimal space-y-1 pl-5"><li>용량·맛·수량이 같은 상품인지 확인합니다. 이름만 비슷한 상품은 가격 이력을 합치지 않습니다.</li><li>1+1은 2개, 2+1은 3개가 필요합니다. 개당 금액보다 내가 쓸 수량의 결제 총액을 먼저 보세요.</li><li>점포·기간·회원·결제수단·교차 증정·재고 조건은 공식 안내와 매장에서 최종 확인하세요.</li></ol><p className="mt-3 text-xs">관심·브랜드·장보기·마지막 방문은 이 브라우저에만 저장하며 자동 알림은 보내지 않습니다. 이 섹션의 공식 안내 링크에는 제휴 식별자를 추가하지 않습니다. 전단 사진을 재게시하지 않고 확인 가능한 항목을 정리합니다.</p></section>
  </div>;
}
