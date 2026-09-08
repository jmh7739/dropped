import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase anon key — RLS로 보호되는 공개 키(프론트엔드 전용).
// Vercel 환경변수가 없으면 하드코딩 fallback 사용.
const FALLBACK_URL = "https://xirpfadorbmeutuijpbm.supabase.co";
const FALLBACK_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
  ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpcnBmYWRvcmJtZXV0dWlqcGJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzAyODEsImV4cCI6MjEwMzE0NjI4MX0" +
  ".6A-AZx92uuWmFQ5C_6AyAWc5sPlY_D7EESdWbaGQjXI";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY;

// 데이터를 5분 캐시(ISR)해서 매 요청마다 DB를 안 때림.
//   딜은 1시간 주기 수집이라 5분 지연은 허용 범위.
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        global: {
          fetch: (input: RequestInfo | URL, init?: RequestInit) =>
            fetch(input, { ...init, next: { revalidate: 300 } } as any),
        },
      })
    : null;

export const isSupabaseConfigured = Boolean(url && anonKey);
