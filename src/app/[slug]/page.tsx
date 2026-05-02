import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/brand/Logo";

const RESERVED_SLUGS = new Set([
  "login",
  "logout",
  "auth",
  "api",
  "dashboard",
  "onboarding",
  "shop",
  "admin",
  "settings",
  "_next",
  "favicon.ico",
]);

type Service = {
  id: string;
  name: string;
  category: string | null;
  price_won: number;
  duration_min: number;
  description: string | null;
};

export default async function PublicShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) notFound();

  const admin = createAdminClient();

  const { data: shop } = await admin
    .from("shops")
    .select(
      "id, name, slug, description, phone, postal_code, address, address_detail, is_active, naver_booking_enabled, naver_place_url",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!shop || !shop.is_active) notFound();

  const { data: services } = await admin
    .from("services")
    .select("id, name, category, price_won, duration_min, description")
    .eq("shop_id", shop.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  const list = (services ?? []) as Service[];
  const fullAddress = [shop.postal_code, shop.address, shop.address_detail]
    .filter(Boolean)
    .join(" ");

  // 카테고리별 그룹핑
  const grouped = new Map<string, Service[]>();
  for (const s of list) {
    const cat = s.category?.trim() || "";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(s);
  }
  const hasCategories = grouped.size > 1 || (grouped.size === 1 && !grouped.has(""));

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {/* 헤더 카드 */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-rose-gold-100">
          <div className="bg-gradient-to-br from-rose-gold-100 via-cream-50 to-sage-50 px-8 py-10 text-center">
            <h1 className="text-3xl font-bold text-rose-gold-800">{shop.name}</h1>
            {shop.description && (
              <p className="mx-auto mt-3 max-w-md text-sm text-rose-gold-700/80 whitespace-pre-wrap">
                {shop.description}
              </p>
            )}
          </div>

          <div className="px-8 py-6">
            <div className="space-y-1.5 text-sm text-gray-700">
              {shop.phone && <p>📞 {shop.phone}</p>}
              {fullAddress && <p>📍 {fullAddress}</p>}
            </div>

            <div className="mt-6 flex gap-2">
              <Link
                href={`/${slug}/book`}
                className="flex-1 rounded-xl bg-rose-gold-600 px-4 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-rose-gold-700"
              >
                📅 예약하기
              </Link>
              <Link
                href={`/${slug}/consult`}
                className="flex-1 rounded-xl border border-rose-gold-200 bg-white px-4 py-3.5 text-center text-sm font-semibold text-rose-gold-700 transition hover:bg-rose-gold-50"
              >
                💬 상담 문의
              </Link>
            </div>

            {/* 네이버 예약 안내 (활성화된 경우) */}
            {shop.naver_booking_enabled && shop.naver_place_url && (
              <a
                href={shop.naver_place_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-sage-300 bg-sage-50 px-4 py-3 text-sm font-medium text-sage-700 transition hover:bg-sage-100"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#03C75A] text-xs font-bold text-white">
                  N
                </span>
                네이버에서도 예약 가능 →
              </a>
            )}
          </div>
        </div>

        {/* 시술 메뉴 */}
        <h2 className="mt-10 mb-3 px-1 text-lg font-bold text-rose-gold-800">
          시술 메뉴
        </h2>
        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-rose-gold-200 bg-white p-10 text-center text-sm text-gray-500">
            등록된 시술 메뉴가 없습니다.
          </div>
        ) : hasCategories ? (
          // 카테고리 그룹핑 뷰
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([category, items]) => (
              <div key={category || "__none__"}>
                {category && (
                  <div className="mb-3 flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-rose-gold-700">{category}</h3>
                    <div className="h-px flex-1 bg-rose-gold-100" />
                  </div>
                )}
                <div className="space-y-2">
                  {items.map((s) => (
                    <ServiceCard key={s.id} service={s} slug={slug} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // 카테고리 없으면 flat list
          <div className="space-y-2">
            {list.map((s) => (
              <ServiceCard key={s.id} service={s} slug={slug} />
            ))}
          </div>
        )}

        <div className="mt-10 flex justify-center">
          <Logo size="sm" />
        </div>
      </div>
    </main>
  );
}

function ServiceCard({ service: s, slug }: { service: Service; slug: string }) {
  return (
    <div className="rounded-2xl border border-rose-gold-100 bg-white p-5 transition hover:shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{s.name}</h3>
          {s.description && (
            <p className="mt-1 text-sm text-gray-600">{s.description}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">약 {s.duration_min}분 소요</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-base font-semibold text-rose-gold-700">
            {s.price_won.toLocaleString()}원
          </div>
          <Link
            href={`/${slug}/book?service=${s.id}`}
            className="mt-1 inline-block rounded-full bg-rose-gold-100 px-3 py-1 text-xs font-medium text-rose-gold-700 transition hover:bg-rose-gold-200"
          >
            예약 →
          </Link>
        </div>
      </div>
    </div>
  );
}
