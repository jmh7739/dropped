import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

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
