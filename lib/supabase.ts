import { createClient, SupabaseClient } from "@supabase/supabase-js";

// anon 키/URL은 브라우저에 노출되는 값이지만, 배포 환경마다 반드시 명시한다.
// 기본 운영 프로젝트로 폴백하면 미설정 미리보기 배포가 운영 DB를 읽게 된다.
// ⚠️ service_role(secret) 키는 절대 여기 넣지 말 것 — 크롤러 .env 전용.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * 환경변수가 설정돼 있으면 Supabase 클라이언트를, 없으면 null을 반환.
 * null이면 데이터 계층은 빈 목록을 반환한다(가짜 데이터 없음).
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = Boolean(url && anonKey);
