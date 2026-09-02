import { permanentRedirect, notFound } from "next/navigation";
import { getDeal } from "@/lib/deals";

// 상품 canonical은 영구 URL(/price/[productId]). 딜 상세는 그리로 308 이전.
//   (딜 id는 휘발성 → 검색·공유는 상품 영구 URL로 모은다)
export const dynamic = "force-dynamic";

export default async function DealRedirect({
  params,
}: {
  params: { id: string };
}) {
  const deal = await getDeal(Number(params.id));
  if (!deal) notFound();
  permanentRedirect(`/price/${deal.productId}`);
}
