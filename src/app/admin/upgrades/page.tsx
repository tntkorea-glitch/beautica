import { createAdminClient } from "@/lib/supabase/admin";
import { UpgradeRow } from "./UpgradeRow";

type PendingShop = {
  id: string;
  name: string;
  slug: string;
  business_number: string | null;
  business_license_url: string | null;
  phone: string | null;
  postal_code: string | null;
  address: string | null;
  address_detail: string | null;
  tier_upgrade_requested_at: string | null;
  created_at: string;
};

export default async function PendingUpgradesPage() {
  const admin = createAdminClient();

  const { data: shops } = await admin
    .from("shops")
    .select(
      "id, name, slug, business_number, business_license_url, phone, postal_code, address, address_detail, tier_upgrade_requested_at, created_at",
    )
    .eq("tier_upgrade_status", "PENDING")
    .order("tier_upgrade_requested_at", { ascending: true });

  const list = (shops ?? []) as PendingShop[];

  // 사업자등록증 signed URL 미리 생성 (1시간 유효)
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
      <h1 className="mb-2 text-2xl font-bold">등업 신청 대기</h1>
      <p className="mb-6 text-sm text-gray-600">
        사업자등록증/명함을 검토하고 도매가(뷰티샵 등급) 으로 승인하거나 거절합니다.
      </p>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          현재 검토 대기 중인 신청이 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((shop) => (
            <UpgradeRow
              key={shop.id}
              shop={shop}
              previewUrl={previewMap.get(shop.id) ?? null}
            />
          ))}
        </div>
      )}
    </main>
  );
}
