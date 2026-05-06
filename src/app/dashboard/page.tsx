import Link from "next/link";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  decidePrice,
  fetchFrequentProducts,
  fetchNewProducts,
} from "@/lib/tnt-mall";
import { formatKST } from "@/lib/format";
import { MonthCalendar } from "./MonthCalendar";
import { PublicLinkCopy } from "./PublicLinkCopy";

export default async function DashboardHome() {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  // 오늘(KST) 범위 계산
  const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayStart = new Date(nowKST);
  todayStart.setUTCHours(0, 0, 0, 0);
  todayStart.setUTCHours(todayStart.getUTCHours() - 9);
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCHours(todayEnd.getUTCHours() + 24);

  // 이번 달(KST) 범위 — 캘린더용
  const yearKST = nowKST.getUTCFullYear();
  const monthKST = nowKST.getUTCMonth() + 1; // 1~12
  const monthStartKST = new Date(Date.UTC(yearKST, monthKST - 1, 1, -9));
  const monthEndKST = new Date(Date.UTC(yearKST, monthKST, 1, -9));

  const [
    customers,
    pendingBookings,
    todayBookings,
    openConsults,
    frequent,
    newProducts,
    monthBookingsRes,
    monthEventsRes,
    servicesRes,
    customersListRes,
    staffRes,
  ] = await Promise.all([
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
    admin
      .from("bookings")
      .select(
        "id, start_at, status, guest_name, customer:customers(name), service:services(name)",
      )
      .eq("shop_id", shop.id)
      .gte("start_at", monthStartKST.toISOString())
      .lt("start_at", monthEndKST.toISOString())
      .not("status", "in", '("CANCELLED")')
      .order("start_at"),
    admin
      .from("personal_events")
      .select("id, title, start_at, color")
      .eq("shop_id", shop.id)
      .gte("start_at", monthStartKST.toISOString())
      .lt("start_at", monthEndKST.toISOString()),
    admin
      .from("services")
      .select("id, name, category, price_won, duration_min")
      .eq("shop_id", shop.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    admin
      .from("customers")
      .select("id, name, phone")
      .eq("shop_id", shop.id)
      .order("name"),
    admin
      .from("staff")
      .select("id, name, display_color, position")
      .eq("shop_id", shop.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
  ]);

  const monthBookings = (monthBookingsRes.data ?? []).map((b: Record<string, unknown>) => {
    const customer = b.customer as { name: string } | null;
    const service = b.service as { name: string } | null;
    return {
      id: b.id as string,
      start_at: b.start_at as string,
      status: b.status as string,
      customerName: customer?.name ?? (b.guest_name as string | null) ?? "(이름 없음)",
      serviceName: service?.name ?? null,
    };
  });
  const monthEvents = (monthEventsRes.data ?? []) as {
    id: string;
    title: string;
    start_at: string;
    color: string;
  }[];

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-sm text-gray-600">
          공개 예약 페이지:{" "}
          <PublicLinkCopy
            href={`https://beautica.co.kr/${shop.slug}`}
            label={`beautica.co.kr/${shop.slug}`}
          />
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* 좌측 — 예약 요약 */}
        <aside className="space-y-3 lg:col-span-3">
          <h2 className="text-sm font-semibold text-gray-500">예약 현황</h2>
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

          <div className="pt-2">
            <Link
              href="/dashboard/bookings/new"
              className="block rounded-lg bg-rose-500 py-2.5 text-center text-sm font-semibold text-white hover:bg-rose-600"
            >
              + 예약 추가
            </Link>
          </div>
        </aside>

        {/* 중앙 — 월별 캘린더 */}
        <section className="lg:col-span-6">
          <MonthCalendar
            year={yearKST}
            month={monthKST}
            bookings={monthBookings}
            events={monthEvents}
            services={servicesRes.data ?? []}
            customers={customersListRes.data ?? []}
            staff={staffRes.data ?? []}
          />

          {/* 바로가기 배너 */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <a
              href="https://postica.co.kr"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border border-purple-100 bg-gradient-to-r from-purple-50 via-white to-pink-50 px-4 py-3 transition hover:border-purple-200 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-base font-bold text-white shadow-sm">
                  P
                </div>
                <div>
                  <p className="text-sm font-semibold text-purple-900">Postica</p>
                  <p className="mt-0.5 text-xs text-purple-600">AI SNS 자동화</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-purple-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                바로가기 →
              </span>
            </a>
            <a
              href="https://tntkorea.co.kr"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border border-rose-gold-100 bg-gradient-to-r from-rose-gold-50 via-white to-amber-50 px-4 py-3 transition hover:border-rose-gold-200 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-gold-600 text-base font-bold text-white shadow-sm">
                  T
                </div>
                <div>
                  <p className="text-sm font-semibold text-rose-gold-900">티엔티몰</p>
                  <p className="mt-0.5 text-xs text-rose-gold-600">뷰티 도매몰</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-rose-gold-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                바로가기 →
              </span>
            </a>
          </div>
        </section>

        {/* 우측 — 제품 */}
        <aside className="space-y-4 lg:col-span-3">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-gray-500">🔁 자주 구매</h2>
              <Link href="/dashboard/orders/new" className="text-[11px] text-rose-gold-700 hover:underline">
                전체 +
              </Link>
            </div>
            {!shop.customer_company_id ? (
              <CompanyMissingNotice shopId={shop.id} matchStatus={shop.match_status} />
            ) : frequent.length === 0 ? (
              <EmptyState
                small
                message="아직 구매 이력이 없어요."
                href="/dashboard/orders/new"
              />
            ) : (
              <div className="space-y-2">
                {frequent.slice(0, 4).map((p) => {
                  const price = decidePrice({
                    tier1: p.tier1,
                    tier2: p.tier2,
                    tier3: p.tier3,
                    shopTier: shop.tier,
                    lastUnitPrice: p.last_unit_price,
                  });
                  return (
                    <ProductCardCompact
                      key={p.prod_cd}
                      imageUrl={p.image_url}
                      name={p.product_name}
                      price={price}
                      badge={`${p.purchase_count}회`}
                      hint={`최근 ${formatKST(p.last_purchased_at, false)}`}
                      href={`/dashboard/orders/new?reorder=${p.prod_cd}`}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-500">✨ 신상품</h2>
            {newProducts.length === 0 ? (
              <EmptyState small message="신상품 없음" />
            ) : (
              <div className="space-y-2">
                {newProducts.slice(0, 4).map((p) => {
                  const price = decidePrice({
                    tier1: p.tier1,
                    tier2: p.tier2,
                    tier3: p.tier3,
                    shopTier: shop.tier,
                  });
                  return (
                    <ProductCardCompact
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
        </aside>
      </div>
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
        "block rounded-lg border p-3 transition hover:shadow-sm " +
        (isToday
          ? "border-rose-gold-200 bg-rose-gold-50 hover:border-rose-gold-300"
          : highlight
            ? "border-amber-300 bg-white hover:border-amber-400"
            : "border-gray-200 bg-white hover:border-gray-400")
      }
    >
      <div className={`mb-1 text-xs ${isToday ? "text-rose-gold-600" : "text-gray-500"}`}>{label}</div>
      <div className={`text-2xl font-bold ${isToday ? "text-rose-gold-700" : "text-gray-900"}`}>
        {value}
        <span className={`ml-1 text-sm font-normal ${isToday ? "text-rose-gold-400" : "text-gray-400"}`}>{suffix}</span>
      </div>
    </Link>
  );
}

function ProductCardCompact({
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
      className="group flex gap-2 overflow-hidden rounded-lg border border-rose-gold-100 bg-white p-2 transition hover:border-rose-gold-300 hover:shadow-sm"
    >
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-base text-gray-300">
            🛍
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="line-clamp-2 text-xs font-medium text-gray-900 group-hover:text-rose-gold-800">
          {name}
        </div>
        <div className="flex items-center justify-between gap-1">
          <span
            className={
              "rounded px-1 py-0.5 text-[9px] font-medium " +
              (accent === "new"
                ? "bg-rose-gold-100 text-rose-gold-700"
                : "bg-sage-100 text-sage-700")
            }
          >
            {badge}
          </span>
          <span className="font-mono text-xs font-semibold text-rose-gold-700">
            {price != null ? `${price.toLocaleString()}` : "-"}
          </span>
        </div>
        <div className="text-[10px] text-gray-400">{hint}</div>
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
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
        ⏳ 거래처 매칭 신청 접수됨
      </div>
    );
  }
  if (matchStatus === "REJECTED") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
        매칭 거절됨.{" "}
        <Link href={`/onboarding/match?shop=${shopId}`} className="underline">
          다시 시도 →
        </Link>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
      ⚠️ 거래처 미연결.{" "}
      <Link href={`/onboarding/match?shop=${shopId}`} className="font-medium underline">
        매핑 시작 →
      </Link>
    </div>
  );
}

function EmptyState({
  message,
  href,
  small,
}: {
  message: string;
  href?: string;
  small?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg border border-dashed border-gray-300 bg-white text-center text-gray-500 " +
        (small ? "p-3 text-xs" : "p-6 text-sm")
      }
    >
      {message}
      {href && (
        <div className="mt-2">
          <Link href={href} className="text-xs text-rose-gold-700 hover:underline">
            주문하러 가기 →
          </Link>
        </div>
      )}
    </div>
  );
}
