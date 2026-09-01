import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    // lib/ 도 스캔해야 함 — dealStatus/priceReport의 색 클래스(bg-sky-500 등)가
    //   여기 문자열로만 존재. 빠지면 프로덕션 빌드에서 purge돼 배지가 투명해짐.
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  // 동적 조합 색은 안전목록으로도 고정 (purge 재발 방지).
  safelist: [
    "bg-red-600",
    "bg-sky-500",
    "bg-emerald-600",
    "bg-amber-400",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#ef4444",
          dark: "#dc2626",
        },
      },
    },
  },
  plugins: [],
};

export default config;
