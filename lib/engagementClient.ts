"use client";

import { supabase } from "./supabase";

/** 브라우저별 익명 방문자 id (회원제 아님, 중복 좋아요 방지용) */
export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  const existing = localStorage.getItem("visitor_id");
  if (existing) return existing;
  const generated: string =
    (crypto as any).randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now();
  localStorage.setItem("visitor_id", generated);
  return generated;
}

export function hasLiked(productId: number): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`liked_${productId}`) === "1";
}

/**
 * 좋아요. 성공 시 최신 카운트를 반환.
 * - Supabase 연결 시: like_deal RPC (서버에서 중복키로 이중 방지)
 * - 데모 모드: localStorage로 카운트 유지 (브라우저 로컬)
 */
export async function likeDeal(
  productId: number,
  fallbackCount: number
): Promise<number> {
  if (hasLiked(productId)) return fallbackCount;
  localStorage.setItem(`liked_${productId}`, "1");

  if (supabase) {
    const { data, error } = await supabase.rpc("like_deal", {
      p_product_id: productId,
      p_visitor: getVisitorId(),
    });
    if (!error && typeof data === "number") return data;
    return fallbackCount + 1;
  }

  // 데모 모드
  const key = `likecount_${productId}`;
  const next = (Number(localStorage.getItem(key)) || fallbackCount) + 1;
  localStorage.setItem(key, String(next));
  return next;
}

/** 클릭 집계 (중복 허용, 실패 무시) */
export async function trackClick(productId: number): Promise<void> {
  try {
    if (supabase) {
      await supabase.rpc("click_deal", { p_product_id: productId });
    }
  } catch {
    /* 집계 실패는 무시 */
  }
}
