import Link from "next/link";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  decidePrice,
  fetchFrequentProducts,
  fetchNewProducts,
} from "@/lib/tnt-mall";
import { formatKST } from "@/lib/format";

export default async function DashboardHome() {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  // 오늘(KST) 범위 계산
  const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayStart = new Date(nowKST);
  todayStart.setUTCHours(0, 0, 0, 0);
  todayStart.setUTCHours(todayStart.getUTCHours() - 9); // KST → UTC
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCHours(todayEnd.getUTCHours() + 24);

  const [
    services,
    customers,
    pendingBookings,
    todayBookings,
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
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop.id)
      .in("status", ["CONFIRMED", "PENDING"])
      .gte("start_at", todayStart.toISOString())
      .lt("start_at", todayEnd.toISOString()),
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

      <div className="mb-8 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <SummaryCard
          label="오늘 예약"
          value={todayBookings.count ?? 0}
          suffix="건"
          href={`/dashboard/bookings/calendar?view=day`}
          highlight={!!(todayBookings.count && todayBookings.count > 0)}
          accent="today"
        />
        <SummaryCard
          label="대기 예약"
          value={pendingBookings.count ?? 0}
          suffix="건"
          href="/dashboard/bookings"
          highlight={!!(pendingBookings.count && pendingBookings.count > 0)}
        />
        <SummaryCard label="고객" value={customers.count ?? 0} suffix="명" href="/dashboard/customers" />
        <SummaryCard
          label="새 상담"
          value={openConsults.count ?? 0}
          suffix="건"
          href="/dashboard/consultations"
          highlight={!!(openConsults.count && openConsults.count > 0)}
        />
      </div>

      {/* Postica 연결 배너 */}
      <a
        href="https://postica.co.kr"
        target="_blank"
        rel="noreferrer"
        className="mb-8 flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50 via-white to-pink-50 px-6 py-4 transition hover:border-purple-200 hover:shadow-sm"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-lg font-bold text-white shadow-sm">
            P
          </div>
          <div>
            <p className="text-sm font-semibold text-purple-900">Postica — AI SNS 자동화</p>
            <p className="mt-0.5 text-xs text-purple-600">
              시술 사진을 올리면 AI가 인스타·블로그 게시물을 자동으로 작성해줍니다
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-purple-700">
          바로가기 →
        </span>
      </a>

      {/* 자주 구매 카드 */}
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-gray-700">🔁 자주 구매 제품</h2>
        <Link href="/dashboard/orders/new" className="text-xs text-rose-gold-700 hover:underline">
          전체 주문 +
        </Link>
      </div>
      {!shop.customer_company_id ? (
        <CompanyMissingNotice shopId={shop.id} matchStatus={shop.match_status} />
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
                hint={`최근 ${formatKST(p.last_purchased_at, false)}`}
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
                hint={formatKST(p.publishedAt, false)}
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
  accent,
}: {
  label: string;
  value: number;
  suffix: string;
  href: string;
  highlight?: boolean;
  accent?: "today";
}) {
  const isToday = accent === "today";
  return (
    <Link
      href={href}
      className={
        "block rounded-lg border p-5 transition hover:shadow-sm " +
        (isToday
          ? "border-rose-gold-200 bg-rose-gold-50 hover:border-rose-gold-300"
          : highlight
            ? "border-amber-300 bg-white hover:border-amber-400"
            : "border-gray-200 bg-white hover:border-gray-400")
      }
    >
      <div className={`mb-1 text-xs ${isToday ? "text-rose-gold-600" : "text-gray-500"}`}>{label}</div>
      <div className={`text-3xl font-bold ${isToday ? "text-rose-gold-700" : "text-gray-900"}`}>
        {value}
        <span className={`ml-1 text-base font-normal ${isToday ? "text-rose-gold-400" : "text-gray-400"}`}>{suffix}</span>
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

function CompanyMissingNotice({
  shopId,
  matchStatus,
}: {
  shopId: string;
  matchStatus: string | null;
}) {
  if (matchStatus === "PENDING_REVIEW") {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        ⏳ 거래처 매칭 신청이 접수되었어요. 관리자가 사업자등록증과 대조 후 승인하면 자동 연결됩니다.
      </div>
    );
  }
  if (matchStatus === "REJECTED") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        매칭 신청이 거절되었습니다. 관리자에게 문의하시거나 다시 시도해주세요.
        <div className="mt-2">
          <Link
            href={`/onboarding/match?shop=${shopId}`}
            className="text-xs underline"
          >
            거래처 다시 매핑하기 →
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      ⚠️ 아직 tnt-mall 거래처와 연결되지 않았습니다. 도매가 / 자주 구매 / 신상품 노출에 필요해요.
      <div className="mt-2">
        <Link
          href={`/onboarding/match?shop=${shopId}`}
          className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-200"
        >
          거래처 매핑 시작하기 →
        </Link>
      </div>
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
            제품 주문하러 가기 →
          </Link>
        </div>
      )}
    </div>
  );
}
