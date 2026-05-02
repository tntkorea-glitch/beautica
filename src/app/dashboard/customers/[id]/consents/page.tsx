import { notFound } from "next/navigation";
import Link from "next/link";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKST } from "@/lib/format";
import { createSignedUrls } from "../records/signed-urls";

type Consent = {
  id: string;
  signed_at: string | null;
  signer_name: string | null;
  signature_url: string | null;
  signature_method: string | null;
  template_version: number;
  signed_content_snapshot: string;
  booking_id: string | null;
  template: { name: string } | null;
};

export default async function CustomerConsentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: customerId } = await params;
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data: customer } = await admin
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("shop_id", shop.id)
    .maybeSingle();
  if (!customer) notFound();

  const { data } = await admin
    .from("consent_forms")
    .select(
      "id, signed_at, signer_name, signature_url, signature_method, template_version, signed_content_snapshot, booking_id, template:consent_form_templates(name)",
    )
    .eq("shop_id", shop.id)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  const list = (data ?? []) as unknown as Consent[];
  const sigPaths = list.map((c) => c.signature_url).filter((p): p is string => !!p);
  const signedMap = await createSignedUrls(admin, sigPaths);

  return (
    <div>
      <p className="mb-4 text-sm text-gray-600">
        이 고객이 서명한 동의서 누적 목록. 새 동의서 받기는 <strong>예약 상세 페이지</strong>에서 진행됩니다.
      </p>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          서명된 동의서가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((c) => {
            const sigUrl = c.signature_url ? signedMap.get(c.signature_url) : null;
            return (
              <div
                key={c.id}
                className="rounded-lg border border-rose-gold-100 bg-white p-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-base font-semibold text-gray-900">
                    {c.template?.name ?? "동의서"}
                  </span>
                  <span className="text-xs text-gray-500">v{c.template_version}</span>
                  {c.signed_at && (
                    <span className="text-xs text-gray-500">
                      · {formatKST(c.signed_at)}
                    </span>
                  )}
                  {c.booking_id && (
                    <Link
                      href={`/dashboard/bookings/${c.booking_id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      예약 보기 →
                    </Link>
                  )}
                </div>

                <details className="mb-3">
                  <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-800">
                    서명 시점 동의서 본문 보기
                  </summary>
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-md border bg-gray-50 p-3 text-sm whitespace-pre-wrap text-gray-700">
                    {c.signed_content_snapshot}
                  </div>
                </details>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    서명자: <strong>{c.signer_name ?? "-"}</strong>
                    <span className="ml-2 text-xs text-gray-500">
                      ({c.signature_method === "IN_STORE" ? "매장 직접" : "모바일 링크"})
                    </span>
                  </div>
                  {sigUrl && (
                    <a href={sigUrl} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sigUrl}
                        alt="서명"
                        className="h-12 w-32 rounded border bg-white object-contain"
                      />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
