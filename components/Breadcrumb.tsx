import Link from "next/link";
import { SITE_URL } from "@/lib/site";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd)
            .replace(/</g, "\\u003c")
            .replace(/>/g, "\\u003e"),
        }}
      />
      <nav aria-label="breadcrumb" className="mb-4 text-sm text-gray-500">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && (
                <span aria-hidden="true" className="text-gray-300">
                  ›
                </span>
              )}
              {item.href ? (
                <Link href={item.href} className="hover:text-gray-800">
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-700">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
