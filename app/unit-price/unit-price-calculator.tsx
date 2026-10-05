"use client";

import { useState } from "react";

type Item = { price: string; shipping: string; packs: string; amount: string };
const empty = (): Item => ({ price: "", shipping: "0", packs: "1", amount: "" });

function calculate(item: Item, unit: "g" | "ml" | "개") {
  const price = Number(item.price);
  const shipping = Number(item.shipping);
  const packs = Number(item.packs);
  const amount = Number(item.amount);
  if (!Number.isFinite(price) || !Number.isFinite(shipping) || !Number.isFinite(packs) || !Number.isFinite(amount) ||
    price <= 0 || shipping < 0 || packs <= 0 || amount <= 0) return null;
  const basis = unit === "개" ? 1 : 100;
  return (price + shipping) / (packs * amount) * basis;
}

export default function UnitPriceCalculator() {
  const [unit, setUnit] = useState<"g" | "ml" | "개">("g");
  const [items, setItems] = useState<[Item, Item]>([empty(), empty()]);
  const values = items.map(item => calculate(item, unit));
  const label = unit === "개" ? "1개" : `100${unit}`;
  const format = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });
  const update = (index: number, field: keyof Item, value: string) =>
    setItems(current => current.map((item, i) => i === index ? { ...item, [field]: value } : item) as [Item, Item]);
  return <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7" aria-labelledby="unit-heading">
    <h2 id="unit-heading" className="text-xl font-bold">두 상품 직접 비교</h2>
    <label className="mt-4 block font-semibold" htmlFor="basis">비교 단위</label>
    <select id="basis" value={unit} onChange={event => setUnit(event.target.value as typeof unit)} className="mt-2 min-h-11 rounded-lg border px-3">
      <option value="g">100g당</option><option value="ml">100ml당</option><option value="개">1개당</option>
    </select>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {items.map((item, index) => <fieldset key={index} className="rounded-xl border border-gray-200 p-4">
        <legend className="px-2 font-bold">상품 {index + 1}</legend>
        {([
          ["price", "할인 적용 판매가 (원)"],
          ["shipping", "별도 배송비 (원)"],
          ["packs", "묶음 수량"],
          ["amount", `묶음 하나의 내용량 (${unit})`],
        ] as const).map(([field, title]) => <label key={field} className="mt-3 block text-sm font-medium">
          {title}
          <input type="number" inputMode="decimal" min={field === "shipping" ? "0" : "0.01"} step="any" value={item[field]}
            onChange={event => update(index, field, event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border px-3 text-base" />
        </label>)}
        <p className="mt-4 rounded-lg bg-blue-50 p-3 font-bold text-blue-950" aria-live="polite">
          {values[index] === null ? "가격과 내용량을 입력하세요" : `${label}당 ${format.format(values[index]!)}원`}
        </p>
      </fieldset>)}
    </div>
    {values[0] !== null && values[1] !== null && <p className="mt-5 rounded-xl bg-gray-950 p-4 font-bold text-white" aria-live="polite">
      {Math.abs(values[0]! - values[1]!) < 0.005 ? "입력한 조건의 단위가격이 같습니다." :
        `상품 ${values[0]! < values[1]! ? 1 : 2}가 ${label}당 ${format.format(Math.abs(values[0]! - values[1]!))}원 낮습니다.`}
    </p>}
    <p className="mt-4 text-sm leading-6 text-gray-600">입력값은 이 브라우저에서만 계산하며 저장하거나 실제 판매가격이라고 주장하지 않습니다.</p>
  </section>;
}
