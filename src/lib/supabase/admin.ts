import { createClient } from "@supabase/supabase-js";

/**
 * 서버 전용 admin 클라이언트 (service_role, RLS 우회).
 * server action / route handler 안에서만 사용. 절대 client-side 로 노출 X.
 *
 * 사용 시점: server action 안에서 user 검증을 이미 끝낸 후, RLS 우회가 필요한 INSERT/UPDATE.
 * (사용자 토큰 전달 이슈가 있는 케이스에서 RLS 우회 + 코드에서 owner 명시)
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
