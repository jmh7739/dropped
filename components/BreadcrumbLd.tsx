import { SITE_URL } from "@/lib/site";

/** 화면에 경로 표시가 따로 있거나 필요 없는 페이지용 BreadcrumbList 구조화 데이터. */
export default function BreadcrumbLd({ items }: { items: { label: string; href: string }[] }) {
  const all = [{ label: "홈", href: "/" }, ...items];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.label, item: `${SITE_URL}${item.href === "/" ? "/" : item.href}` })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />;
}
