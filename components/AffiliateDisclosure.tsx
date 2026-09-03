import Link from "next/link";

const SERVICE_LINKS = [
  { href: "/", label: "급락딜" },
  { href: "/?sec=best", label: "베스트딜" },
  { href: "/?category=flight", label: "여행 특가" },
];

const MARKET_LINKS = [
  {
    href: "https://toolmarket.kr",
    name: "Tool Market",
    description: "무료 온라인 도구",
  },
  {
    href: "https://signalmarket.kr",
    name: "Signal Market",
    description: "코인 시장 신호",
  },
];

function BrandMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="13" fill="#ef4444" />
      <path d="M24 12 V27" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" />
      <path
        d="M17 22 L24 29 L31 22"
        stroke="#fff"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line x1="16" y1="35" x2="32" y2="35" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" />
    </svg>
  );
}

export default function AffiliateDisclosure() {
  return (
    <footer className="mt-14 bg-gray-950 text-gray-300">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.35fr_0.65fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5 text-white">
              <BrandMark />
              <span className="text-lg font-extrabold tracking-tight">떨어졌다</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-gray-400">
              판매자가 표시한 할인율 대신 실제 가격 이력으로 지금이 정말 싼지 확인합니다.
            </p>
          </div>

          <nav aria-label="떨어졌다 서비스">
            <h2 className="text-sm font-bold text-white">서비스</h2>
            <ul className="mt-3 space-y-2.5 text-sm">
              {SERVICE_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-gray-400 transition-colors hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="AI MARKET 서비스">
            <p className="text-xs font-extrabold tracking-[0.16em] text-red-400">AI MARKET</p>
            <div className="mt-3 grid gap-2">
              {MARKET_LINKS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="group flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/70 px-3.5 py-3 transition hover:border-gray-700 hover:bg-gray-900"
                  aria-label={`${item.name} — ${item.description}`}
                >
                  <span>
                    <span className="block text-sm font-bold text-gray-200 group-hover:text-white">
                      {item.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-gray-500">{item.description}</span>
                  </span>
                  <span className="text-gray-600 transition group-hover:translate-x-0.5 group-hover:text-gray-300" aria-hidden="true">
                    ↗
                  </span>
                </a>
              ))}
            </div>
          </nav>
        </div>

        <div className="mt-9 border-t border-gray-800 pt-6 text-xs leading-relaxed text-gray-500">
          <p>
            이 사이트는 제휴마케팅 활동을 통해 일정액의 수수료를 지급받을 수 있습니다.
            가격·할인 정보는 수집 시점 기준이며, 구매 전 판매 페이지에서 최종 가격을 확인해 주세요.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} 떨어졌다</p>
            <nav aria-label="정책 및 정보" className="flex flex-wrap gap-x-4 gap-y-2">
              <Link href="/privacy" className="transition-colors hover:text-gray-300">개인정보처리방침</Link>
              <Link href="/terms" className="transition-colors hover:text-gray-300">이용안내·면책</Link>
              <a href="/feed.xml" className="transition-colors hover:text-gray-300">RSS</a>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
