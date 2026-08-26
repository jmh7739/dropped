import Link from "next/link";
import FlightsView from "./FlightsView";

export type TravelTab = "flight" | "stay" | "deal";

const TABS: { key: TravelTab; label: string }[] = [
  { key: "flight", label: "✈️ 항공권" },
  { key: "stay", label: "🏨 숙소" },
  { key: "deal", label: "🎢 여행딜" },
];

function Placeholder({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
      <div className="mb-2 text-3xl">{icon}</div>
      <div className="mb-1 font-bold text-gray-800">{title}</div>
      <p className="mx-auto max-w-md text-sm text-gray-500">{desc}</p>
    </div>
  );
}

export default function TravelView({
  tab,
  region,
  origin,
  destination,
}: {
  tab: TravelTab;
  region?: string;
  origin?: string;
  destination?: string;
}) {
  return (
    <div>
      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "flight" ? "/?category=flight" : `/?category=flight&tt=${t.key}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              tab === t.key
                ? "bg-brand text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "flight" && (
        <FlightsView region={region} origin={origin} destination={destination} />
      )}
      {tab === "stay" && (
        <Placeholder
          icon="🏨"
          title="숙소 특가 준비중이에요"
          desc="국내외 호텔·펜션·리조트의 할인 숙소를 곧 모아서 보여드릴게요. 조금만 기다려 주세요!"
        />
      )}
      {tab === "deal" && (
        <Placeholder
          icon="🎢"
          title="여행딜 준비중이에요"
          desc="테마파크 입장권·투어·액티비티 같은 여행 특가를 곧 모아서 보여드릴게요. 조금만 기다려 주세요!"
        />
      )}
    </div>
  );
}
