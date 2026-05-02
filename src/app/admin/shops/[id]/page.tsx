import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKST } from "@/lib/format";
import { ManualMatchPanel } from "./ManualMatchPanel";

import { tierLabel } from "@/lib/tier";

const matchStatusText = (s: string | null) => {
  if (s === "APPROVED") return "매칭 완료";
  if (s === "PENDING_REVIEW") return "검토 대기 중";
  if (s === "REJECTED") return "거절됨";
  return "미연결 (또는 신규 등록)";
};

type Shop = {
  id: string;
  name: string;
  slug: string;
  owner_name: string | null;
  phone: string | null;
  business_number: string | null;
  postal_code: string | null;
  address: string | null;
  address_detail: string | null;
  tier: number;
  tier_upgrade_status: "PENDING" | "APPROVED" | "REJECTED" | null;
  customer_company_id: string | null;
  matched_partner_id: string | null;
  match_status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | null;
  match_score: number | null;
  match_reject_reason: string | null;
  created_at: string;
};

export default async function ShopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: shopData } = await admin
    .from("shops")
    .select(
      "id, name, slug, owner_name, phone, business_number, postal_code, address, address_detail, tier, tier_upgrade_status, customer_company_id, matched_partner_id, match_status, match_score, match_reject_reason, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!shopData) notFound();
  const shop = shopData as Shop;

  const { data: link } = await admin
    .from("shop_users")
    .select("user_id")
    .eq("shop_id", id)
    .eq("role", "OWNER")
    .maybeSingle();
  const ownerUserId = (link?.user_id as string | undefined) ?? null;

  const { data: ownerData } = ownerUserId
    ? await admin.auth.admin.getUserById(ownerUserId)
    : { data: { user: null } };
  const ownerEmail = ownerData?.user?.email ?? null;

  const { data: ownerProfile } = ownerUserId
    ? await admin
        .from("user_profiles")
        .select("deletion_requested_at, deletion_reason")
        .eq("user_id", ownerUserId)
        .maybeSingle()
    : { data: null };
  const deletionInfo = ownerProfile as
    | { deletion_requested_at: string | null; deletion_reason: string | null }
    | null;

  const { data: ccData } = shop.customer_company_id
    ? await admin
        .from("CustomerCompany")
        .select("id, companyName, tier, customerType, supabaseUserId, partnerId, businessNumber")
        .eq("id", shop.customer_company_id)
        .maybeSingle()
    : { data: null };

  const { data: partnerData } = shop.matched_partner_id
    ? await admin
        .from("Partner")
        .select("id, name, representative, businessNo, mobile, phone, address1, address2")
        .eq("id", shop.matched_partner_id)
        .maybeSingle()
    : { data: null };

  const fullAddress = [shop.postal_code, shop.address, shop.address_detail]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/admin/shops"
        className="mb-4 inline-block text-xs text-gray-500 hover:underline"
      >
        ← 매장 목록
      </Link>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{shop.name}</h1>
          <p className="text-sm text-gray-500">/{shop.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              shop.tier === 3
                ? "bg-purple-100 text-purple-700"
                : shop.tier === 2
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {tierLabel(shop.tier)}
          </span>
          {shop.tier_upgrade_status === "PENDING" && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              등업 대기
            </span>
          )}
        </div>
      </div>

      {deletionInfo?.deletion_requested_at && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
          <div className="text-sm font-semibold text-red-900">⚠ 탈퇴 신청 접수됨</div>
          <div className="mt-1 text-xs text-red-700">
            신청 시각: {formatKST(deletionInfo.deletion_requested_at)}
          </div>
          {deletionInfo.deletion_reason && (
            <div className="mt-1 text-xs text-red-700">
              사유: {deletionInfo.deletion_reason}
            </div>
          )}
          <div className="mt-2 text-xs text-red-700">
            매장 데이터(고객/예약/주문) 처리 정책 확정 후 수동 처리. 회원이 직접 취소 가능.
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">매장 / 회원 정보</h2>
          <dl className="space-y-2 text-sm">
            <Field label="원장" value={shop.owner_name} />
            <Field label="이메일" value={ownerEmail} />
            <Field label="휴대폰" value={shop.phone} />
            <Field label="사업자번호" value={shop.business_number} />
            <Field label="주소" value={fullAddress || null} />
            <Field
              label="가입일"
              value={formatKST(shop.created_at)}
            />
          </dl>
        </section>

        <section className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">현재 매칭 상태</h2>
          <dl className="space-y-2 text-sm">
            <Field label="매칭 상태" value={matchStatusText(shop.match_status)} />
            <Field label="등급" value={`${shop.tier} (${tierLabel(shop.tier)})`} />
            <Field
              label="CustomerCompany"
              value={
                ccData
                  ? `${(ccData as { companyName: string }).companyName} (tier ${(ccData as { tier: number }).tier})`
                  : null
              }
            />
            <Field
              label="Partner (전산)"
              value={partnerData ? (partnerData as { name: string }).name : null}
            />
            {partnerData && (
              <>
                <Field
                  label="대표자(전산)"
                  value={(partnerData as { representative: string | null }).representative}
                />
                <Field
                  label="사업자번호(전산)"
                  value={(partnerData as { businessNo: string | null }).businessNo}
                />
                <Field
                  label="휴대폰(전산)"
                  value={(partnerData as { mobile: string | null }).mobile}
                />
              </>
            )}
            {shop.match_status === "REJECTED" && shop.match_reject_reason && (
              <Field label="거절 사유" value={shop.match_reject_reason} />
            )}
          </dl>
        </section>
      </div>

      <section className="mt-6 rounded-lg border bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-gray-700">수동 매칭</h2>
        <p className="mb-4 text-xs text-gray-500">
          자동 매칭이 실패했거나(전산상 상호/연락처 불일치 등) 잘못 연결된 경우, 거래처를 직접
          검색해서 연결할 수 있습니다. 매칭 시 기존 매핑은 자동으로 정리되고 tier 가 갱신됩니다.
          전산에 거래처 등록이 없는 경우 tnt-mall 에서 먼저 거래처를 만든 뒤 다시 시도하세요.
        </p>
        <ManualMatchPanel
          shopId={shop.id}
          ownerUserId={ownerUserId}
          currentTier={shop.tier}
        />
      </section>
    </main>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-xs text-gray-500">{label}</dt>
      <dd className="break-all text-right text-gray-900">{value ?? "—"}</dd>
    </div>
  );
}
