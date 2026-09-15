"use client";

import { useEffect, useState } from "react";

type Watch = { target: number | null; lowest: boolean };

export default function PriceWatch({ productId, currentPrice, lowestPrice, checkedAt }: {
  productId: number; currentPrice: number | null; lowestPrice: number | null; checkedAt: string | null;
}) {
  const key = `dropped_price_watch_${productId}`;
  const [watch, setWatch] = useState<Watch | null>(null);
  const [target, setTarget] = useState("");
  const [lowest, setLowest] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as Watch;
        if ((saved.target === null || (Number.isFinite(saved.target) && saved.target > 0)) && typeof saved.lowest === "boolean") {
          setWatch(saved);
          setTarget(saved.target?.toString() ?? "");
          setLowest(saved.lowest);
        }
      }
    } catch { /* Invalid or unavailable browser storage: leave the form usable. */ }
    setLoaded(true);
  }, [key]);

  const reached = Boolean(watch && currentPrice !== null &&
    ((watch.target !== null && currentPrice <= watch.target) ||
      (watch.lowest && lowestPrice !== null && currentPrice <= lowestPrice)));
  const price = Number(target.replaceAll(",", ""));
  const valid = (!target.trim() || (Number.isSafeInteger(price) && price > 0)) && (Boolean(target.trim()) || lowest);

  function save() {
    if (!valid) return;
    const next = { target: target.trim() ? price : null, lowest };
    try { localStorage.setItem(key, JSON.stringify(next)); setWatch(next); } catch { /* Storage may be disabled. */ }
  }
  function remove() {
    try { localStorage.removeItem(key); } catch { /* Storage may be disabled. */ }
    setWatch(null); setTarget(""); setLowest(false);
  }

  return <section className="mt-5 rounded-xl border border-gray-200 bg-white p-4" aria-label="가격 관심 조건">
    <h2 className="font-bold text-gray-900">관심 가격 저장</h2>
    <p className="mt-1 text-sm text-gray-600">이 기기에 저장하고 다시 방문했을 때 최근 수집 가격과 비교합니다. 이메일·푸시 알림은 아직 제공하지 않습니다.</p>
    {loaded && watch && <p role="status" className={`mt-3 rounded-lg p-3 text-sm font-semibold ${reached ? "bg-green-50 text-green-900" : "bg-gray-50 text-gray-700"}`}>
      {reached ? "저장한 가격 조건에 도달했습니다. 판매처의 실시간 가격을 확인하세요." : "아직 저장한 가격 조건에 도달하지 않았습니다."}
      {checkedAt && <span className="block font-normal">가격 수집 시점: {checkedAt.slice(0, 10)}</span>}
    </p>}
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <label className="text-sm font-medium text-gray-700">목표가격 (원)
        <input inputMode="numeric" type="number" min="1" step="1" value={target} onChange={e => setTarget(e.target.value)}
          placeholder="예: 50000" className="mt-1 block w-40 rounded-lg border border-gray-300 p-2" />
      </label>
      <label className="flex min-h-10 items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={lowest} onChange={e => setLowest(e.target.checked)} />
        최근 90일 추적 최저가 도달
      </label>
      <button type="button" onClick={save} disabled={!valid} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">저장</button>
      {watch && <button type="button" onClick={remove} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">삭제</button>}
    </div>
  </section>;
}
