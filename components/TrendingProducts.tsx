import Link from "next/link";
import SafeImage from "./SafeImage";
import type { TrendingProduct } from "@/lib/trends";

export default function TrendingProducts({ products }: { products: TrendingProduct[] }) {
  if (!products.length) return null;
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div><h2 className="text-lg font-extrabold text-gray-900">요즘 뜨는 상품</h2><p className="mt-0.5 text-xs text-gray-400">쇼핑 트렌드와 상품 일치도를 바탕으로 고른 실제 상품</p></div>
        <span className="text-xs text-gray-400">4시간마다 갱신</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map(product => (
          <Link key={product.id} href={`/price/${product.id}`} className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md">
            <SafeImage src={product.imageUrl} alt={product.title} className="aspect-square w-full object-cover" />
            <div className="p-3"><span className="text-[11px] font-bold text-brand">#{product.keyword}</span><h3 className="mt-1 line-clamp-2 text-sm font-bold leading-5 text-gray-900 group-hover:text-brand">{product.title}</h3></div>
          </Link>
        ))}
      </div>
    </section>
  );
}
