import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "crypto";

function genCode(): string {
  return randomBytes(6).toString("base64url").toUpperCase().slice(0, 8);
}

/** 샵의 추천 코드를 반환. 없으면 생성해서 저장 후 반환. */
export async function getOrCreateReferralCode(shopId: string): Promise<string> {
  const admin = createAdminClient();

  const { data: shop } = await admin
    .from("shops")
    .select("referral_code")
    .eq("id", shopId)
    .single();

  if (shop?.referral_code) return shop.referral_code as string;

  // 충돌 없는 코드 생성 (최대 5회 시도)
  for (let i = 0; i < 5; i++) {
    const code = genCode();
    const { error } = await admin
      .from("shops")
      .update({ referral_code: code })
      .eq("id", shopId)
      .is("referral_code", null);
    if (!error) return code;
  }

  throw new Error("referral code generation failed");
}

/**
 * /join?ref=<code> 랜딩 후 로그인 완료 시 호출.
 * - beautica referral_signups 에 기록
 * - tnt-mall User.referredByUserId 베스트에포트 동기화
 */
export async function recordReferralSignup(
  refCode: string,
  refereeSupabaseId: string,
): Promise<void> {
  const admin = createAdminClient();

  // 추천 코드로 샵 조회
  const { data: shop } = await admin
    .from("shops")
    .select("id")
    .eq("referral_code", refCode)
    .maybeSingle();

  if (!shop) return;

  // beautica 자체 기록 (중복이면 무시)
  await admin.from("referral_signups").upsert(
    { referrer_shop_id: shop.id, referee_supabase_id: refereeSupabaseId },
    { onConflict: "referee_supabase_id", ignoreDuplicates: true },
  );

  // tnt-mall 동기화 — 추천인 샵 오너의 supabase user id 조회
  const { data: ownerLink } = await admin
    .from("shop_users")
    .select("user_id")
    .eq("shop_id", shop.id)
    .eq("role", "OWNER")
    .maybeSingle();

  if (ownerLink?.user_id) {
    await syncToTntMall(refereeSupabaseId, ownerLink.user_id as string, shop.id);
  }
}

/**
 * tnt-mall User 테이블에 referredByUserId 기록.
 * CustomerCompany.supabaseUserId 로 양측 User 를 찾아 연결.
 * 한쪽이라도 없으면 조용히 skip (나중에 연결되면 어드민 도구로 재동기화 가능).
 */
async function syncToTntMall(
  refereeSupabaseId: string,
  referrerSupabaseId: string,
  referrerShopId: string,
): Promise<void> {
  const admin = createAdminClient();

  // 추천인(referrer) tnt-mall User 조회
  const { data: referrerCc } = await admin
    .from("CustomerCompany")
    .select("id")
    .eq("supabaseUserId", referrerSupabaseId)
    .maybeSingle();
  if (!referrerCc) return;

  const { data: referrerUser } = await admin
    .from("User")
    .select("id")
    .eq("customerCompanyId", referrerCc.id)
    .maybeSingle();
  if (!referrerUser) return;

  // 피추천인(referee) tnt-mall User 조회
  const { data: refereeCc } = await admin
    .from("CustomerCompany")
    .select("id")
    .eq("supabaseUserId", refereeSupabaseId)
    .maybeSingle();
  if (!refereeCc) return;

  const { data: refereeUser } = await admin
    .from("User")
    .select("id, referredByUserId")
    .eq("customerCompanyId", refereeCc.id)
    .maybeSingle();
  if (!refereeUser || refereeUser.referredByUserId) return; // 이미 추천인 있으면 skip

  await admin
    .from("User")
    .update({ referredByUserId: (referrerUser as { id: string }).id })
    .eq("id", (refereeUser as { id: string }).id);

  // 동기화 완료 표시
  await admin
    .from("referral_signups")
    .update({ tnt_linked: true })
    .eq("referrer_shop_id", referrerShopId)
    .eq("referee_supabase_id", refereeSupabaseId);
}
