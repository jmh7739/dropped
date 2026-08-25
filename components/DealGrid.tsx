"use client";

import { useEffect, useState } from "react";
import { Deal } from "@/lib/types";
import DealCard from "./DealCard";

type View = "gallery" | "list";

export default function DealGrid({ deals }: { deals: Deal[] }) {
  const [view, setView] = useState<View>("gallery");

  useEffect(() => {
    const saved = localStorage.getItem("dealView");
    if (saved === "list" || saved === "gallery") setView(saved);
  }, []);

  function choose(v: View) {
    setView(v);
    localStorage.setItem("dealView", v);
  }

  const btn = (v: View, label: string) =>
    `rounded-md px-2 py-1 text-sm transition ${
      view === v
        ? "bg-brand text-white"
        : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
    }`;

  return (
    <div>
      <div className="mb-3 flex justify-end gap-1.5">
        <button
          onClick={() => choose("gallery")}
          className={btn("gallery", "갤러리")}
          aria-label="갤러리형 보기"
          aria-pressed={view === "gallery"}
        >
          ⊞ 갤러리
        </button>
        <button
          onClick={() => choose("list")}
          className={btn("list", "리스트")}
          aria-label="리스트형 보기"
          aria-pressed={view === "list"}
        >
          ☰ 리스트
        </button>
      </div>

      {view === "gallery" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} variant="list" />
          ))}
        </div>
      )}
    </div>
  );
}
