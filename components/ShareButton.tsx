"use client";

import { useState } from "react";

// 사슬(링크) 아이콘 — 공유/링크복사에 흔히 쓰는 모양
function LinkIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757" />
      <path d="M10.81 15.312a4.5 4.5 0 0 1-1.242-7.244l4.5-4.5a4.5 4.5 0 0 1 6.364 6.364l-1.757 1.757" />
    </svg>
  );
}

/**
 * 공유 버튼. dropped.kr 내부 경로를 공유해 → 받은 사람이 우리 사이트로 유입되고,
 * 우리 제휴 링크로 구매 → 수수료 연결 + 방문자 증가.
 * 모바일: 네이티브 공유시트(카톡 등). 데스크톱: 링크 복사.
 */
export default function ShareButton({
  path,
  title,
  compact = false,
}: {
  path: string; // "/deal/123" 같은 내부 경로 (또는 전체 URL)
  title: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function onShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = path.startsWith("http") ? path : `https://dropped.kr${path}`;
    const data = { title: "떨어졌다 특가", text: title, url };
    // 모바일 등 네이티브 공유 지원 시
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* 사용자가 취소 → 아래 폴백은 안 함 */
        return;
      }
    }
    // 폴백: 링크 복사
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 무시 */
    }
  }

  if (compact) {
    return (
      <button
        onClick={onShare}
        aria-label="공유"
        title="공유"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50"
      >
        {copied ? <span className="text-green-600">✓</span> : <LinkIcon />}
      </button>
    );
  }

  return (
    <button
      onClick={onShare}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
    >
      {copied ? (
        <span className="text-green-600">✓ 복사됨</span>
      ) : (
        <>
          <LinkIcon className="h-4 w-4" /> 공유
        </>
      )}
    </button>
  );
}
