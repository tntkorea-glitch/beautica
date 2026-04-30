import { createAdminClient } from "@/lib/supabase/admin";
import { MatchRow } from "./MatchRow";

type PendingMatch = {
  id: string;
  name: string;
  slug: string;
  owner_name: string | null;
  phone: string | null;
  business_number: string | null;
  business_license_url: string | null;
  postal_code: string | null;
  address: string | null;
  address_detail: string | null;
  matched_partner_id: string | null;
  match_score: number | null;
  match_signals: string[] | null;
  match_requested_at: string | null;
  created_at: string;
};

type PartnerInfo = {
  id: string;
  name: string;
  representative: string | null;
  businessNo: string | null;
  mobile: string | null;
  phone: string | null;
  zipcode: string | null;
  address1: string | null;
  address2: string | null;
  createdAt: string;
};

export default async function PendingMatchesPage() {
  const admin = createAdminClient();

  const { data: shops } = await admin
    .from("shops")
    .select(
      "id, name, slug, owner_name, phone, business_number, business_license_url, postal_code, address, address_detail, matched_partner_id, match_score, match_signals, match_requested_at, created_at",
    )
    .eq("match_status", "PENDING_REVIEW")
    .order("match_requested_at", { ascending: true });

  const list = (shops ?? []) as PendingMatch[];

  // 매칭 후보 Partner 정보 + 사업자등록증 signed URL 병렬 조회
  const partnerIds = Array.from(
    new Set(list.map((s) => s.matched_partner_id).filter(Boolean) as string[]),
  );
  const { data: partners } = partnerIds.length
    ? await admin
        .from("Partner")
        .select(
          "id, name, representative, businessNo, mobile, phone, zipcode, address1, address2, createdAt",
        )
        .in("id", partnerIds)
    : { data: [] as PartnerInfo[] };
  const partnerMap = new Map<string, PartnerInfo>(
    (partners as PartnerInfo[] | null ?? []).map((p) => [p.id, p]),
  );

  const previews = await Promise.all(
    list.map(async (s) => {
      if (!s.business_license_url) return { id: s.id, url: null as string | null };
      const { data } = await admin.storage
        .from("business-licenses")
        .createSignedUrl(s.business_license_url, 60 * 60);
      return { id: s.id, url: data?.signedUrl ?? null };
    }),
  );
  const previewMap = new Map(previews.map((p) => [p.id, p.url]));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-bold">거래처 매칭 신청 대기</h1>
      <p className="mb-6 text-sm text-gray-600">
        회원이 선택한 거래처가 본인 거래처가 맞는지 사업자등록증과 대조해서 승인/거절합니다.
        승인 시 자동으로 거래처(CustomerCompany)에 supabaseUserId 가 매핑되고, tier 가 업데이트됩니다.
      </p>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          현재 검토 대기 중인 매칭 신청이 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((shop) => (
            <MatchRow
              key={shop.id}
              shop={shop}
              partner={
                shop.matched_partner_id ? partnerMap.get(shop.matched_partner_id) ?? null : null
              }
              previewUrl={previewMap.get(shop.id) ?? null}
            />
          ))}
        </div>
      )}
    </main>
  );
}
