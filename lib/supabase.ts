import { createClient, SupabaseClient } from "@supabase/supabase-js";

// anon 키/URL은 공개돼도 안전한 값(브라우저에 노출되는 게 정상, RLS가 데이터 보호).
// 환경변수가 있으면 그걸 쓰고, 없으면 아래 공개 기본값으로 폴백한다.
// (Vercel 환경변수 미설정 시에도 운영 DB에 붙게 하기 위함 — anon 키라 안전)
// ⚠️ service_role(secret) 키는 절대 여기 넣지 말 것 — 크롤러 .env 전용.
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://xirpfadorbmeutuijpbm.supabase.co";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpcnBmYWRvcmJtZXV0dWlqcGJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzAyODEsImV4cCI6MjEwMzE0NjI4MX0.6A-AZx92uuWmFQ5C_6AyAWc5sPlY_D7EESdWbaGQjXI";

/**
 * 환경변수가 설정돼 있으면 Supabase 클라이언트를, 없으면 null을 반환.
 * null이면 데이터 계층은 빈 목록을 반환한다(가짜 데이터 없음).
 */
// Next.js가 Supabase의 fetch 응답을 데이터 캐시에 넣어 '옛 딜'을 보여주는 문제 방지.
//   모든 읽기를 no-store로 강제 → force-dynamic 페이지에서 항상 최신 딜 반영.
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        global: {
          fetch: (input: RequestInfo | URL, init?: RequestInit) =>
            fetch(input, { ...init, cache: "no-store" }),
        },
      })
    : null;

export const isSupabaseConfigured = Boolean(url && anonKey);
