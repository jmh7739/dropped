// 링크프라이스 리얼핫딜(MD 추천) — 국내몰 큐레이션 특가.
//   가격추적(급락 판정) 대상이 아니라, 제휴사 MD가 고른 실제 프로모션이다.
//   ⚠️ 거짓정가(뻥튀기 MSRP)와 다름 — 사람이 고른 특가. 다만 '얼마 싼지' %는
//   API가 안 줘서(discount_price 대부분 0) 표시하지 않고 '추천 특가'로만 노출.

const LP_AID = "A100707159"; // 공개 어필ID (클릭 URL에 이미 노출되는 값)

const MALL: Record<string, string> = {
  "11st": "11번가", gmarket: "G마켓", auction: "옥션", lotteon: "롯데온",
  emart: "이마트", yes24: "예스24", wconcept: "W컨셉", iherb: "아이허브",
  himart: "하이마트", kbbook: "교보문고", ssg: "SSG", gsshop: "GS SHOP",
  hmall: "Hmall", nsmall: "NS홈쇼핑", kurly: "컬리", cjbrand: "CJ더마켓",
};

// 상품이 아닌 CPA(가입·설치)·저품질 카테고리는 제외
const SKIP_CATEGORY = new Set(["참여", "설치"]);

export interface CuratedDeal {
  id: string;
  title: string;
  imageUrl: string;
  affiliateUrl: string;
  price: number;
  mallName: string;
  promoText: string | null;
}

function toInt(v: unknown): number {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** 리얼핫딜 API에서 '괜찮은' 국내몰 특가만 골라 반환 (30분 캐시). */
export async function getCuratedDeals(): Promise<CuratedDeal[]> {
  try {
    const res = await fetch(
      `https://api.linkprice.com/ci/hotdeal/data/${LP_AID}`,
      { next: { revalidate: 1800 } } // 링크프라이스 갱신 주기(30분)에 맞춤
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const seen = new Set<string>();
    const out: CuratedDeal[] = [];
    for (const x of data) {
      const category = String(x?.category ?? "");
      if (SKIP_CATEGORY.has(category)) continue;
      const disc = toInt(x?.discount_price);
      const normal = toInt(x?.normal_price);
      const price = disc > 0 ? disc : normal;
      const title = String(x?.product_name ?? "").trim();
      const img = String(x?.product_image ?? "").trim();
      const url = String(x?.click_url ?? "").trim();
      const mcode = String(x?.merchant_id ?? "");
      // 품질 필터: 5천원 이상 + 이미지·제목·링크 존재 (잡템·빈값 제외)
      if (price < 5000 || !title || !img || !url) continue;
      const id = `${mcode}_${x?.product_code}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const promo = String(x?.promotional_text ?? "").trim();
      out.push({
        id,
        title,
        imageUrl: img.startsWith("//") ? `https:${img}` : img,
        affiliateUrl: url,
        price,
        mallName: MALL[mcode] ?? mcode,
        promoText: promo || null,
      });
    }
    return out.slice(0, 12);
  } catch {
    return [];
  }
}
