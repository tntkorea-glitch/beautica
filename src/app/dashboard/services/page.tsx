import Link from "next/link";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { ServiceRow } from "./ServiceRow";

type Service = {
  id: string;
  name: string;
  category: string | null;
  price_won: number;
  duration_min: number;
  description: string | null;
  is_active: boolean;
  display_order: number;
  photo_url: string | null;
};

export default async function ServicesPage() {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data: services } = await admin
    .from("services")
    .select("id, name, category, price_won, duration_min, description, is_active, display_order, photo_url")
    .eq("shop_id", shop.id)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  const list = (services ?? []) as Service[];

  // 카테고리별 그룹핑 (카테고리 없음 → "기타")
  const grouped = new Map<string, Service[]>();
  for (const s of list) {
    const cat = s.category?.trim() || "기타";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(s);
  }

  const activeCount = list.filter((s) => s.is_active).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">시술 메뉴</h1>
          <p className="mt-1 text-sm text-gray-600">
            {list.length > 0
              ? `총 ${list.length}개 · 공개 ${activeCount}개`
              : "고객이 예약 시 선택할 수 있는 시술 메뉴를 관리합니다."}
          </p>
        </div>
        <Link
          href="/dashboard/services/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          + 시술 추가
        </Link>
      </div>

      {list.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([category, items]) => (
            <section key={category}>
              {/* 카테고리 헤더 */}
              <div className="mb-2 flex items-center gap-3">
                <h2 className="text-sm font-semibold text-gray-700">{category}</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {items.length}개
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="overflow-hidden rounded-lg border bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">시술명</th>
                      <th className="px-4 py-3 text-right font-medium">가격</th>
                      <th className="px-4 py-3 text-right font-medium">시간</th>
                      <th className="px-4 py-3 text-center font-medium">상태</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((s) => (
                      <ServiceRow key={s.id} service={s} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
      <div className="mb-2 text-3xl">💇</div>
      <p className="mb-1 text-sm font-medium text-gray-700">아직 시술 메뉴가 없어요</p>
      <p className="mb-4 text-xs text-gray-500">
        첫 시술을 등록하면 공개 예약 페이지에 노출됩니다.
      </p>
      <Link
        href="/dashboard/services/new"
        className="inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
      >
        + 첫 시술 추가
      </Link>
    </div>
  );
}
