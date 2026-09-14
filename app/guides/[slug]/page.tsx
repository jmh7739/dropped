import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import { GUIDES, getGuide } from "@/lib/guides";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide) return { title: "가이드를 찾을 수 없음", robots: { index: false, follow: false } };
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `${SITE_URL}/guides/${guide.slug}` },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();

  return (
    <article className="mx-auto max-w-3xl">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "가격 비교 가이드", href: "/guides" }, { label: guide.title }]} />
      <h1 className="text-2xl font-extrabold leading-snug text-gray-900">{guide.title}</h1>
      <p className="mt-5 text-base leading-8 text-gray-700">{guide.intro}</p>

      {guide.sections.map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="text-lg font-bold text-gray-900">{section.heading}</h2>
          <p className="mt-3 text-base leading-8 text-gray-700">{section.body}</p>
        </section>
      ))}

      <aside className="mt-10 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-bold text-gray-900">{guide.category === "travel" ? "여행 예약처에서 확인하기" : "실제 가격 이력으로 확인하기"}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {guide.links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-brand hover:border-brand/40">
              {link.label} →
            </Link>
          ))}
          {guide.category !== "travel" && <Link href="/insights" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-brand hover:border-brand/40">실제 상품 가격 추적 사례 →</Link>}
        </div>
      </aside>
      <Link href="/guides" className="mt-6 inline-block text-sm font-bold text-gray-500 hover:text-gray-900">← 모든 가이드</Link>
    </article>
  );
}
