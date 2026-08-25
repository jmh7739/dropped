import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="text-brand text-2xl leading-none">🔻</span>
          <span className="text-lg font-extrabold tracking-tight">떨어졌다</span>
        </Link>
        <span className="text-xs text-gray-400 hidden sm:inline">
          평소보다 싸진 것만 모아서
        </span>
      </div>
    </header>
  );
}
