import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKST } from "@/lib/format";
import { tierLabel } from "@/lib/tier";

type ShopRow = {
  id: string;
  name: string;
  slug: string;
  owner_name: string | null;
  tier: number;
  tier_upgrade_status: "PENDING" | "APPROVED" | "REJECTED" | null;
  match_status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | null;
  customer_company_id: string | null;
  matched_partner_id: string | null;
  business_number: string | null;
  phone: string | null;
  created_at: string;
};

type CustomerCompanyRow = {
  id: string;
  companyName: string;
  partnerId: string | null;
};

const matchStatusLabel = (s: ShopRow["match_status"]) => {
  if (s === "APPROVED") return { text: "매칭 완료", cls: "bg-green-100 text-green-700" };
  if (s === "PENDING_REVIEW") return { text: "검토 대기", cls: "bg-amber-100 text-amber-700" };
  if (s === "REJECTED") return { text: "거절됨", cls: "bg-red-100 text-red-700" };
  return { text: "미연결", cls: "bg-gray-100 text-gray-600" };
};

export default async function AdminShopsPage() {
  const admin = createAdminClient();

  const { data: shops } = await admin
    .from("shops")
    .select(
      "id, name, slug, owner_name, tier, tier_upgrade_status, match_status, customer_company_id, matched_partner_id, business_number, phone, created_at",
    )
    .order("created_at", { ascending: false });

  const list = (shops ?? []) as ShopRow[];

  // OWNER user_id 일괄 조회
  const { data: ownerLinks } = await admin
    .from("shop_users")
    .select("shop_id, user_id")
    .eq("role", "OWNER")
    .in(
      "shop_id",
      list.map((s) => s.id),
    );
  const ownerByShop = new Map<string, string>(
    (ownerLinks ?? []).map((l) => [l.shop_id as string, l.user_id as string]),
  );

  // owner 이메일 일괄 조회 (auth.users)
  const ownerIds = Array.from(new Set(Array.from(ownerByShop.values())));
  const emailById = new Map<string, string>();
  for (const uid of ownerIds) {
    const { data } = await admin.auth.admin.getUserById(uid);
    if (data?.user?.email) emailById.set(uid, data.user.email);
  }

  // 탈퇴 신청 여부 일괄 조회 (user_profiles)
  const { data: profiles } = ownerIds.length
    ? await admin
        .from("user_profiles")
        .select("user_id, deletion_requested_at")
        .in("user_id", ownerIds)
        .not("deletion_requested_at", "is", null)
    : { data: [] };
  const deletionRequestedSet = new Set<string>(
    (profiles ?? []).map((p) => p.user_id as string),
  );

  // CustomerCompany 일괄 조회
  const ccIds = Array.from(
    new Set(list.map((s) => s.customer_company_id).filter(Boolean) as string[]),
  );
  const { data: ccs } = ccIds.length
    ? await admin
        .from("CustomerCompany")
        .select("id, companyName, partnerId")
        .in("id", ccIds)
    : { data: [] as CustomerCompanyRow[] };
  const ccById = new Map<string, CustomerCompanyRow>(
    ((ccs as CustomerCompanyRow[] | null) ?? []).map((c) => [c.id, c]),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-bold">매장 관리</h1>
      <p className="mb-6 text-sm text-gray-600">
        가입된 모든 매장 목록. 매장명을 클릭하면 상세 정보 + 수동 매칭 처리 화면으로 이동합니다.
      </p>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          가입된 매장이 없습니다.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">매장명 / slug</th>
                <th className="px-4 py-3 text-left font-medium">원장</th>
                <th className="px-4 py-3 text-left font-medium">등급</th>
                <th className="px-4 py-3 text-left font-medium">거래처 매칭</th>
                <th className="px-4 py-3 text-left font-medium">사업자번호</th>
                <th className="px-4 py-3 text-left font-medium">가입일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((s) => {
                const ownerId = ownerByShop.get(s.id);
                const email = ownerId ? emailById.get(ownerId) : null;
                const cc = s.customer_company_id ? ccById.get(s.customer_company_id) : null;
                const ms = matchStatusLabel(s.match_status);
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/shops/${s.id}`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {s.name}
                        </Link>
                        {ownerId && deletionRequestedSet.has(ownerId) && (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                            탈퇴 신청
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">/{s.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{s.owner_name ?? "—"}</div>
                      <div className="text-xs text-gray-500">{email ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            s.tier === 3
                              ? "bg-purple-100 text-purple-700"
                              : s.tier === 2
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {tierLabel(s.tier)}
                        </span>
                        {s.tier_upgrade_status === "PENDING" && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            등업 대기
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${ms.cls}`}
                      >
                        {ms.text}
                      </span>
                      {cc && (
                        <div className="mt-1 text-xs text-gray-500">{cc.companyName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {s.business_number ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatKST(s.created_at, false)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
