import Link from "next/link";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  decidePrice,
  fetchFrequentProducts,
  fetchNewProducts,
} from "@/lib/tnt-mall";

export default async function DashboardHome() {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const [
    services,
    customers,
    pendingBookings,
    openConsults,
    frequent,
    newProducts,
  ] = await Promise.all([
    admin.from("services").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
    admin.from("customers").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
    admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop.id)
      .eq("status", "PENDING"),
    admin
      .from("consultations")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop.id)
      .in("status", ["NEW", "IN_PROGRESS"]),
    fetchFrequentProducts(admin, shop.customer_company_id, 6),
    fetchNewProducts(admin, 30, 6),
  ]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">대시보드</h1>
      <p className="mb-8 text-sm text-gray-600">
        공개 예약 페이지:{" "}
        <Link
          href={`/${shop.slug}`}
          target="_blank"
          className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-blue-700 hover:bg-gray-200"
        >
          beautica.co.kr/{shop.slug} ↗
        </Link>
      </p>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <SummaryCard
          label="대기 예약"
          value={pendingBookings.count ?? 0}
          suffix="건"
          href="/dashboard/bookings"
          highlight={!!(pendingBookings.count && pendingBookings.count > 0)}
        />
        <SummaryCard label="고객" value={customers.count ?? 0} suffix="명" href="/dashboard/customers" />
        <SummaryCard label="시술 메뉴" value={services.count ?? 0} suffix="개" href="/dashboard/services" />
        <SummaryCard
          label="새 상담"
          value={openConsults.count ?? 0}
          suffix="건"
          href="/dashboard/consultations"
          highlight={!!(openConsults.count && openConsults.count > 0)}
        />
      </div>

      {/* 자주 구매 카드 */}
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-gray-700">🔁 자주 구매 자재</h2>
        <Link href="/dashboard/orders/new" className="text-xs text-rose-gold-700 hover:underline">
          전체 주문 +
        </Link>
      </div>
      {!shop.customer_company_id ? (
        <CompanyMissingNotice />
      ) : frequent.length === 0 ? (
        <EmptyState
          message="아직 구매 이력이 없어요. 첫 주문이 누적되면 자주 구매 상품 카드가 자동으로 표시됩니다."
          href="/dashboard/orders/new"
        />
      ) : (
        <div className="mb-8 grid gap-3 md:grid-cols-3">
          {frequent.map((p) => {
            const price = decidePrice({
              tier1: p.tier1,
              tier2: p.tier2,
              tier3: p.tier3,
              shopTier: shop.tier,
              lastUnitPrice: p.last_unit_price,
            });
            return (
              <ProductCard
                key={p.prod_cd}
                imageUrl={p.image_url}
                name={p.product_name}
                price={price}
                badge={`${p.purchase_count}회 구매`}
                hint={`최근 ${new Date(p.last_purchased_at).toLocaleDateString("ko-KR")}`}
                href={`/dashboard/orders/new?reorder=${p.prod_cd}`}
              />
            );
          })}
        </div>
      )}

      {/* 신상품 카드 */}
      <h2 className="mb-3 mt-8 text-base font-semibold text-gray-700">✨ 신상품 (최근 30일)</h2>
      {newProducts.length === 0 ? (
        <EmptyState message="현재 신상품 없음." />
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {newProducts.map((p) => {
            const price = decidePrice({
              tier1: p.tier1,
              tier2: p.tier2,
              tier3: p.tier3,
              shopTier: shop.tier,
            });
            return (
              <ProductCard
                key={p.prodCd}
                imageUrl={p.imageUrl}
                name={p.name}
                price={price}
                badge="NEW"
                hint={new Date(p.publishedAt).toLocaleDateString("ko-KR")}
                href={`/dashboard/orders/new?add=${p.prodCd}`}
                accent="new"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  suffix,
  href,
  highlight,
}: {
  label: string;
  value: number;
  suffix: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "block rounded-lg border bg-white p-5 transition hover:shadow-sm " +
        (highlight ? "border-amber-300 hover:border-amber-400" : "hover:border-gray-400")
      }
    >
      <div className="mb-1 text-xs text-gray-500">{label}</div>
      <div className="text-3xl font-bold text-gray-900">
        {value}
        <span className="ml-1 text-base font-normal text-gray-400">{suffix}</span>
      </div>
    </Link>
  );
}

function ProductCard({
  imageUrl,
  name,
  price,
  badge,
  hint,
  href,
  accent,
}: {
  imageUrl: string | null;
  name: string;
  price: number | null;
  badge: string;
  hint: string;
  href: string;
  accent?: "new";
}) {
  return (
    <Link
      href={href}
      className="group flex gap-3 overflow-hidden rounded-lg border border-rose-gold-100 bg-white p-3 transition hover:border-rose-gold-300 hover:shadow-sm"
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-gray-300">
            🛍
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <div className="line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-rose-gold-800">
            {name}
          </div>
          <div className="mt-0.5 text-xs text-gray-400">{hint}</div>
        </div>
        <div className="flex items-end justify-between">
          <span
            className={
              "rounded px-1.5 py-0.5 text-[10px] font-medium " +
              (accent === "new"
                ? "bg-rose-gold-100 text-rose-gold-700"
                : "bg-sage-100 text-sage-700")
            }
          >
            {badge}
          </span>
          <span className="font-mono text-sm font-semibold text-rose-gold-700">
            {price != null ? `${price.toLocaleString()}원` : "가격 문의"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function CompanyMissingNotice() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      ⚠️ tnt-mall 거래처 매핑이 아직 안 되어 있습니다 (customer_company_id 미설정).
      onboarding 을 다시 진행하거나, 관리자에게 문의해주세요.
    </div>
  );
}

function EmptyState({ message, href }: { message: string; href?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
      {message}
      {href && (
        <div className="mt-2">
          <Link href={href} className="text-xs text-rose-gold-700 hover:underline">
            자재 주문하러 가기 →
          </Link>
        </div>
      )}
    </div>
  );
}
