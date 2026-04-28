import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Storage path 배열 → signed URL Map (1시간 유효).
 * 빈 배열이면 빈 Map 반환.
 */
export async function createSignedUrls(
  admin: SupabaseClient,
  paths: string[],
): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const unique = Array.from(new Set(paths));
  const { data } = await admin.storage
    .from("customer-photos")
    .createSignedUrls(unique, 60 * 60);
  const map = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  }
  return map;
}
