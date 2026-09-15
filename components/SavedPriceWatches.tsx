"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { displayTitle, formatWon } from "@/lib/format";

type Watch = { id: number; target: number | null; lowest: boolean };
type Item = { id: number; title: string; mall: string | null; price: number | null; lowest: number | null; checkedAt: string | null };

export default function SavedPriceWatches() {
  const [watches, setWatches] = useState<Watch[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const saved: Watch[] = [];
    try {
      for (let i = 0; i < localStorage.length && saved.length < 12; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith("dropped_price_watch_")) continue;
        const id = Number(key.slice("dropped_price_watch_".length));
        if (!Number.isSafeInteger(id) || id <= 0) continue;
        const watch = JSON.parse(localStorage.getItem(key) ?? "{}") as Partial<Watch>;
        if ((watch.target === null || Number.isSafeInteger(watch.target) && (watch.target ?? 0) > 0) && typeof watch.lowest === "boolean")
          saved.push({ id, target: watch.target ?? null, lowest: watch.lowest });
      }
    } catch { /* Unavailable storage should not block browsing. */ }
    setWatches(saved);
    if (!saved.length) { setReady(true); return () => controller.abort(); }
    fetch("/api/watch-prices?ids=" + saved.map(w => w.id).join(","), { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Price lookup unavailable");
        const result = await response.json() as { items: Item[] };
        setItems(result.items); setReady(true);
      })
      .catch(() => { if (!controller.signal.aborted) { setUnavailable(true); setReady(true); } });
    return () => controller.abort();
  }, []);
  if (!ready || !watches.length) return null;
  return <section className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4" aria-label="관심상품 가격변동">
    <h2 className="text-lg font-extrabold text-gray-900">⭐ 관심상품 가격변동</h2>
    <p className="mt-1 text-sm text-gray-600">이 기기에 저장한 목표 가격·최근 90일 최저가 조건과 수집 가격을 비교합니다. 판매처 가격은 구매 전에 다시 확인하세요.</p>
    {unavailable && <p className="mt-3 text-sm text-gray-600">지금 가격 확인이 지연되고 있습니다. 상품 상세에서 다시 확인해 주세요.</p>}
    <div className="mt-3 grid gap-2 sm:grid-cols-2">{watches.map(watch => {
      const item = items.find(p => p.id === watch.id);
      const reached = item?.price != null &&
        ((watch.target != null && item.price <= watch.target) ||
          (watch.lowest && item.lowest != null && item.price <= item.lowest));
      return <Link key={watch.id} href={`/price/${watch.id}`}
        className="rounded-lg border border-gray-200 bg-white p-3 hover:border-emerald-400">
        <span className="block text-sm font-bold text-gray-900">{item ? displayTitle(item.title, 48) : `저장한 상품 #${watch.id}`}</span>
        <span className="mt-1 block text-xs text-gray-600">{item?.mall ? item.mall + " · " : ""}
          {item?.price != null ? formatWon(item.price) : "최근 가격 확인 필요"}
          {watch.target != null && ` · 목표 ${formatWon(watch.target)}`}
        </span>
        <span className={`mt-1 block text-xs font-bold ${reached ? "text-emerald-700" : "text-gray-500"}`}>
          {reached ? "저장한 가격 조건 도달 · 판매처 확인" : "가격 조건 확인 중"}
          {item?.checkedAt && ` · ${item.checkedAt.slice(0, 10)} 수집`}
        </span>
      </Link>;
    })}</div>
  </section>;
}
