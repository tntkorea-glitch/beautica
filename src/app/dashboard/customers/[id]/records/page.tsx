import Link from "next/link";
import { notFound } from "next/navigation";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSignedUrls } from "./signed-urls";
import { RecordCard } from "./RecordCard";

type Record = {
  id: string;
  performed_at: string;
  formula: string | null;
  techniques: string | null;
  notes: string | null;
  before_photo_urls: string[];
  after_photo_urls: string[];
  staff: { name: string; display_color: string } | null;
  service: { name: string } | null;
};

export default async function RecordsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: customerId } = await params;
  const { shop } = await requireShop();
  const admin = createAdminClient();

  // 고객 존재 확인 (layout 에서 했지만 안전망)
  const { data: customer } = await admin
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("shop_id", shop.id)
    .maybeSingle();
  if (!customer) notFound();

  const { data } = await admin
    .from("service_records")
    .select(
      "id, performed_at, formula, techniques, notes, before_photo_urls, after_photo_urls, staff:staff(name, display_color), service:services(name)",
    )
    .eq("shop_id", shop.id)
    .eq("customer_id", customerId)
    .order("performed_at", { ascending: false })
    .limit(100);

  const list = (data ?? []) as unknown as Record[];

  // 모든 사진 path 의 signed URL 한 번에 생성
  const allPaths = list.flatMap((r) => [...r.before_photo_urls, ...r.after_photo_urls]);
  const signedMap = await createSignedUrls(admin, allPaths);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          시술 후 기록 — 전후 사진, 색소 배합, 사용 제품, 메모.
        </p>
        <Link
          href={`/dashboard/customers/${customerId}/records/new`}
          className="rounded-md bg-rose-gold-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-gold-700"
        >
          + 시술 기록 추가
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          아직 시술 기록이 없습니다. 시술 후 기록을 추가하면 누적 히스토리가 됩니다.
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((r) => (
            <RecordCard
              key={r.id}
              customerId={customerId}
              record={r}
              signedUrls={signedMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}
