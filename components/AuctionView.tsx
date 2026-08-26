import Link from "next/link";
import {
  getAuctionDeals,
  AuctionScope,
  AuctionSort,
  AUCTION_SORTS,
} from "@/lib/auction";
import { formatWon, safeUrl, timeAgo } from "@/lib/format";
import SortDropdown from "./SortDropdown";

const TABS: { key: AuctionScope; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "부동산", label: "부동산" },
  { key: "자동차", label: "자동차" },
];

function href(scope: AuctionScope, sort: AuctionSort) {
  const p = new URLSearchParams({ category: "auction" });
  if (scope !== "all") p.set("ac", scope);
  if (sort !== "discount_desc") p.set("as", sort);
  return `/?${p.toString()}`;
}

export default async function AuctionView({
  scope,
  sort,
}: {
  scope: AuctionScope;
  sort: AuctionSort;
}) {
  const items = await getAuctionDeals(scope, sort);

  // 정렬 드롭다운이 유지할 쿼리
  const keep: Record<string, string> = { category: "auction" };
  if (scope !== "all") keep.ac = scope;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={href(t.key, sort)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                scope === t.key
                  ? "bg-brand text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <SortDropdown
          options={AUCTION_SORTS}
          value={sort}
          param="as"
          params={keep}
        />
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-400">
          아직 감지된 경매 물건이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => {
            const drop =
              a.appraisalPrice && a.minBidPrice
                ? Math.round((1 - a.minBidPrice / a.appraisalPrice) * 100)
                : null;
            return (
              <a
                key={a.id}
                href={safeUrl(a.detailUrl)}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
              >
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span
                    className={`rounded px-1.5 py-0.5 font-bold ${
                      a.assetType === "부동산"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {a.assetType}
                  </span>
                  {a.failCount > 0 && (
                    <span className="text-gray-400">유찰 {a.failCount}회</span>
                  )}
                  {drop !== null && (
                    <span className="ml-auto rounded bg-brand px-1.5 py-0.5 font-bold text-white">
                      감정가 대비 -{drop}%
                    </span>
                  )}
                </div>

                <div className="text-sm font-bold leading-snug text-gray-900">
                  {a.title}
                </div>
                {a.location && (
                  <div className="text-xs text-gray-400">{a.location}</div>
                )}

                <div className="mt-1">
                  <div className="text-xs text-gray-400 line-through">
                    감정가 {formatWon(a.appraisalPrice)}
                  </div>
                  <div className="text-lg font-extrabold text-brand">
                    최저 {formatWon(a.minBidPrice)}
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-x-2 text-[11px] text-gray-400">
                  <span>{a.caseNo}</span>
                  {a.collectedAt && (
                    <span>· 등록 {timeAgo(a.collectedAt)}</span>
                  )}
                  {a.bidDate && (
                    <span className="ml-auto">입찰 {a.bidDate}</span>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-[11px] text-gray-400">
        경매 정보는 참고용이며, 실제 권리관계·입찰은 법원경매정보에서 반드시
        확인하세요. 본 카테고리는 제휴 수익이 없는 정보 제공 목적입니다.
      </p>
    </div>
  );
}
