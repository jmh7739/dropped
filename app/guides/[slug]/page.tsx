import { withOg } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import { GUIDES, getGuide } from "@/lib/guides";
import { SITE_URL } from "@/lib/site";
import { getDeals } from "@/lib/deals";
import { guideCases } from "@/lib/guideCases";
import { observedAtLabel } from "@/lib/format";
import { GUIDE_UPDATED, SISTER_LINKS } from "@/lib/guideMeta";

export const revalidate = 3600;

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide) return withOg({ title: "가이드를 찾을 수 없음", robots: { index: false, follow: false } });
  const url = `${SITE_URL}/guides/${guide.slug}`;
  return withOg({
    title: guide.title,
    description: guide.description,
    alternates: { canonical: url },
    openGraph: { title: guide.title, description: guide.description, url, type: "article" },
  });
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();
  const deals = await getDeals().catch((error) => { console.error("guide cases unavailable", error); return []; });
  const data = guideCases(guide.slug, deals);
  const url = `${SITE_URL}/guides/${guide.slug}`;
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    inLanguage: "ko-KR",
    datePublished: GUIDE_UPDATED,
    dateModified: GUIDE_UPDATED,
    mainEntityOfPage: url,
    image: `${SITE_URL}/og-default.png`,
    author: { "@type": "Organization", name: "Dropped(떨어졌다)", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Dropped(떨어졌다)", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/og-default.png` } },
  };
  const sister = SISTER_LINKS[guide.slug];

  return (
    <article className="mx-auto max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd).replace(/</g, "\\u003c") }} />
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "가격 비교 가이드", href: "/guides" }, { label: guide.title }]} />
      <h1 className="text-2xl font-extrabold leading-snug text-gray-900">{guide.title}</h1>
      <p className="mt-2 text-sm text-gray-600">Dropped 편집 · 최종 수정 {GUIDE_UPDATED}</p>
      <p className="mt-5 text-base leading-8 text-gray-700">{guide.intro}</p>

      {guide.sections.map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="text-lg font-bold text-gray-900">{section.heading}</h2>
          <p className="mt-3 text-base leading-8 text-gray-700">{section.body}</p>
        </section>
      ))}

      {data && (
        <section aria-labelledby="real-cases" className="mt-10 rounded-xl border border-gray-200 bg-white p-5">
          <h2 id="real-cases" className="text-lg font-bold text-gray-900">Dropped 기록에서 본 실제 사례</h2>
          {data.total > 0 ? <>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-gray-700">
              {data.summary.map((line) => <li key={line}>{line}</li>)}
            </ul>
            {data.cases.length > 0 && <ol className="mt-5 space-y-4">
              {data.cases.map((c) => (
                <li key={c.productId} className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm font-bold text-brand">{c.label}</p>
                  <Link href={`/price/${c.productId}`} className="mt-1 block text-base font-bold leading-6 text-gray-950 hover:underline">{c.title}</Link>
                  <p className="mt-2 text-base leading-7 text-gray-700">{c.body}</p>
                  <p className="mt-1 text-sm text-gray-600">{c.mall}{observedAtLabel(c.checkedAt) ? ` · ${observedAtLabel(c.checkedAt)}` : ""}</p>
                </li>
              ))}
            </ol>}
            <p className="mt-4 text-sm leading-6 text-gray-600">수치는 이 페이지를 만든 시점에 공개 중이던 딜 기록으로 계산했습니다. 특정 판매처나 상품을 평가하는 목록이 아니며, 사례 상품의 현재 가격은 판매 페이지에서 다시 확인하세요.</p>
          </> : <p className="mt-3 text-base leading-7 text-gray-700">이번 갱신에서는 사례로 고를 공개 딜 기록을 싣지 못했습니다. <Link href="/insights" className="font-bold text-brand underline">실제 가격 추적 사례</Link>에서 같은 기준의 기록을 볼 수 있습니다.</p>}
        </section>
      )}

      <aside className="mt-10 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-bold text-gray-900">{guide.category === "travel" ? "여행 예약처에서 확인하기" : "실제 가격 이력으로 확인하기"}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {guide.links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-brand hover:border-brand/40">
              {link.label} →
            </Link>
          ))}
          {guide.category !== "travel" && <Link href="/insights" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-brand hover:border-brand/40">실제 상품 가격 추적 사례 →</Link>}
          {guide.slug === "food-unit-price" && <Link href="/unit-price" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-brand hover:border-brand/40">내 상품 단위가격 직접 계산 →</Link>}
        </div>
        {sister && <p className="mt-4 text-sm leading-6 text-gray-700">함께 보면 좋은 곳: <a href={sister.href} className="font-bold text-brand underline">{sister.label}</a> — {sister.note}</p>}
      </aside>
      <Link href="/guides" className="mt-6 inline-block text-sm font-bold text-gray-500 hover:text-gray-900">← 모든 가이드</Link>
    </article>
  );
}
