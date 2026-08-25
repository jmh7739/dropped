"use client";

import { useEffect, useState } from "react";
import { hasLiked, likeDeal } from "@/lib/engagementClient";

export default function LikeButton({
  productId,
  initialCount,
  size = "md",
}: {
  productId: number;
  initialCount: number;
  size?: "sm" | "md";
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLiked(hasLiked(productId));
    // 데모 모드에서 로컬 저장된 카운트 반영
    const local = Number(localStorage.getItem(`likecount_${productId}`));
    if (local) setCount(local);
  }, [productId]);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (liked || busy) return;
    setBusy(true);
    setLiked(true);
    setCount((c) => c + 1); // 낙관적 반영
    const real = await likeDeal(productId, count);
    setCount(real);
    setBusy(false);
  }

  const pad = size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <button
      onClick={onClick}
      aria-pressed={liked}
      aria-label="좋아요"
      className={`inline-flex items-center gap-1 rounded-full border transition ${pad} ${
        liked
          ? "border-brand bg-red-50 text-brand"
          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
      }`}
    >
      <span>{liked ? "❤️" : "🤍"}</span>
      <span className="font-semibold tabular-nums">{count}</span>
    </button>
  );
}
