import { requireShop } from "@/lib/shop";
import { getOrCreateReferralCode } from "@/lib/referral";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReferralLinkBox } from "./ReferralLinkBox";

export default async function ReferralPage() {
  const { shop } = await requireShop();
  const code = await getOrCreateReferralCode(shop.id);
  const admin = createAdminClient();

  const { count } = await admin
    .from("referral_signups")
    .select("id", { count: "exact", head: true })
    .eq("referrer_shop_id", shop.id);

  const referralUrl = `https://beautica.co.kr/join?ref=${code}`;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">추천 링크</h1>

      {/* 내 추천 링크 */}
      <section className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="text-2xl">🔗</span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">내 추천 링크</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              주변 원장님께 공유하세요. 이 링크로 가입하면 티엔티몰 구매 실적도 함께 연계됩니다.
            </p>
          </div>
        </div>
        <ReferralLinkBox url={referralUrl} />
      </section>

      {/* 추천 현황 */}
      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">추천 현황</h2>
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-5 py-4">
          <div>
            <div className="text-sm text-gray-500">내 링크로 가입한 원장님</div>
            <div className="mt-0.5 text-xs text-gray-400">무료 플랜 포함</div>
          </div>
          <div className="text-3xl font-bold text-rose-gold-700">
            {count ?? 0}
            <span className="ml-1 text-base font-normal text-rose-gold-400">명</span>
          </div>
        </div>
      </section>

      {/* 수당 안내 */}
      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-3 text-base font-semibold text-gray-900">수당 안내</h2>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-rose-gold-500">✦</span>
            <span>
              <strong>BEAUTICA 구독 수당</strong> — 추천받은 원장님이 유료 플랜 구독 시 매월 1일
              결제마다 <strong>5,000원</strong> 적립 예정 (현재 무료 서비스 운영 중, 조만간 활성화)
            </span>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-rose-gold-500">✦</span>
            <span>
              <strong>티엔티몰 구매 수당</strong> — 추천받은 원장님이 티엔티몰에서 구매 시
              티엔티몰 추천 수당 정책에 따라 자동 연계
            </span>
          </div>
        </div>
      </section>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        💡 지금 바로 추천해두면, 수당 시스템 활성화 후 소급 적용됩니다.
      </div>
    </div>
  );
}
