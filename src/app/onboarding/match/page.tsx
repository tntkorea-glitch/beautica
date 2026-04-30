import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/brand/Logo";
import { MatchClient } from "./MatchClient";

type Candidate = {
  partner_id: string;
  customer_company_id: string | null;
  partner_name: string;
  representative_masked: string | null;
  business_no_masked: string | null;
  mobile_masked: string | null;
  address_short: string | null;
  registered_at: string | null;
  score: number;
  signals: string[] | null;
  already_mapped_to_other: boolean;
};

export default async function OnboardingMatchPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const { shop: shopId } = await searchParams;
  if (!shopId) redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // shop OWNER 검증
  const { data: link } = await admin
    .from("shop_users")
    .select("shops!inner(id, name, owner_name, phone, business_number, match_status)")
    .eq("user_id", user.id)
    .eq("shop_id", shopId)
    .eq("role", "OWNER")
    .maybeSingle();

  const shop = link?.shops as unknown as
    | {
        id: string;
        name: string;
        owner_name: string;
        phone: string | null;
        business_number: string | null;
        match_status: string | null;
      }
    | null
    | undefined;

  if (!shop) redirect("/dashboard");

  // 이미 매칭 신청한 상태면 대기 화면
  if (shop.match_status === "PENDING_REVIEW") {
    return <PendingScreen />;
  }
  if (shop.match_status === "APPROVED") {
    redirect("/dashboard");
  }

  // 후보 재조회
  const { data: candidates, error } = await admin.rpc("beautica_match_candidates", {
    p_business_number: shop.business_number,
    p_company_name: shop.name,
    p_owner_name: shop.owner_name,
    p_mobile: shop.phone,
    p_user_id: user.id,
    p_limit: 5,
  });

  if (error) {
    console.error("[onboarding/match] RPC 실패:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    redirect("/dashboard");
  }

  const list = ((candidates ?? []) as Candidate[]).filter((c) => !c.already_mapped_to_other);

  return (
    <main className="flex min-h-screen items-start justify-center bg-cream-50 px-4 py-10">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-rose-gold-100">
        <div className="mb-3 flex justify-center">
          <Logo size="md" />
        </div>
        {list.length > 0 ? (
          <>
            <h1 className="mb-1 text-center text-xl font-bold text-rose-gold-800">
              기존 거래처가 발견되었어요
            </h1>
            <p className="mb-6 text-center text-xs text-rose-gold-700/70">
              입력하신 정보와 일치하는 거래처가 있습니다. 본인 거래처가 맞는지 확인해주세요.
            </p>
            <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⚠️ 잘못 선택하면 다른 매장의 거래내역이 노출될 수 있어요. 확실한 경우에만 선택하세요.
              관리자가 사업자등록증과 대조 후 최종 승인합니다.
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-1 text-center text-xl font-bold text-rose-gold-800">
              일치하는 거래처가 없어요
            </h1>
            <p className="mb-6 text-center text-xs text-rose-gold-700/70">
              입력하신 정보로 tnt-mall 에 등록된 거래처를 찾지 못했어요. 신규 거래처로 등록해주세요.
            </p>
          </>
        )}

        <MatchClient shopId={shop.id} candidates={list} />
      </div>
    </main>
  );
}

function PendingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-rose-gold-100">
        <div className="mb-3 flex justify-center">
          <Logo size="md" />
        </div>
        <h1 className="mb-2 text-lg font-bold text-rose-gold-800">매칭 신청 접수됨</h1>
        <p className="text-sm text-gray-600">
          관리자가 사업자등록증과 대조 후 승인 처리합니다. 승인되면 자동으로 거래처에 연결되어 도매가 / 자주 구매 자료가 활성화됩니다.
        </p>
        <a
          href="/dashboard"
          className="mt-6 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          대시보드로 이동
        </a>
      </div>
    </main>
  );
}
