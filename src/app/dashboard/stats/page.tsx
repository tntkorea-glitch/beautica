import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";

function kstMonthRange(year: number, month: number) {
  // KST 월 시작/끝을 UTC ISO로 변환
  const start = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+09:00`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function kstNow() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

export default async function StatsPage() {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const now = kstNow();
  const thisYear = now.getUTCFullYear();
  const thisMonth = now.getUTCMonth() + 1;
  const prevMonth = thisMonth === 1 ? 12 : thisMonth - 1;
  const prevYear = thisMonth === 1 ? thisYear - 1 : thisYear;

  const thisRange = kstMonthRange(thisYear, thisMonth);
  const prevRange = kstMonthRange(prevYear, prevMonth);

  const [
    // 이번 달
    thisBookings,
    // 지난 달
    prevBookings,
    // 인기 시술 (이번 달 완료)
    topServices,
    // 직원별 (이번 달)
    staffBookings,
    // 최근 30일 일별 예약
    last30,
    // 신규 고객 (이번 달 등록)
    newCustomers,
  ] = await Promise.all([
    admin
      .from("bookings")
      .select("id, status, price_won, customer_id")
      .eq("shop_id", shop.id)
      .gte("start_at", thisRange.start)
      .lt("start_at", thisRange.end)
      .not("status", "in", '("CANCELLED")'),

    admin
      .from("bookings")
      .select("id, status, price_won")
      .eq("shop_id", shop.id)
      .gte("start_at", prevRange.start)
      .lt("start_at", prevRange.end)
      .not("status", "in", '("CANCELLED")'),

    admin
      .from("bookings")
      .select("service:services(name), price_won")
      .eq("shop_id", shop.id)
      .eq("status", "COMPLETED")
      .gte("start_at", thisRange.start)
      .lt("start_at", thisRange.end),

    admin
      .from("bookings")
      .select("staff:staff(name, display_color)")
      .eq("shop_id", shop.id)
      .not("status", "in", '("CANCELLED")')
      .gte("start_at", thisRange.start)
      .lt("start_at", thisRange.end),

    admin
      .from("bookings")
      .select("start_at, status")
      .eq("shop_id", shop.id)
      .not("status", "in", '("CANCELLED")')
      .gte("start_at", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("start_at"),

    admin
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop.id)
      .gte("created_at", thisRange.start)
      .lt("created_at", thisRange.end),
  ]);

  // ── 이번 달 통계 ──────────────────────────────────────
  const thisAll = thisBookings.data ?? [];
  const thisCompleted = thisAll.filter((b) => b.status === "COMPLETED");
  const thisRevenue = thisCompleted.reduce((s, b) => s + (Number(b.price_won) || 0), 0);
  const thisTotal = thisAll.length;
  const thisUniqueCustomers = new Set(thisAll.map((b) => b.customer_id).filter(Boolean)).size;

  // ── 지난 달 통계 ──────────────────────────────────────
  const prevAll = prevBookings.data ?? [];
  const prevCompleted = prevAll.filter((b) => b.status === "COMPLETED");
  const prevRevenue = prevCompleted.reduce((s, b) => s + (Number(b.price_won) || 0), 0);
  const prevTotal = prevAll.length;

  function diff(curr: number, prev: number) {
    if (prev === 0) return null;
    const pct = Math.round(((curr - prev) / prev) * 100);
    return pct;
  }

  // ── 인기 시술 TOP 5 ───────────────────────────────────
  const serviceMap = new Map<string, { name: string; count: number; revenue: number }>();
  for (const b of topServices.data ?? []) {
    const svc = (b.service as unknown) as { name: string } | null;
    if (!svc) continue;
    const prev = serviceMap.get(svc.name) ?? { name: svc.name, count: 0, revenue: 0 };
    serviceMap.set(svc.name, {
      name: svc.name,
      count: prev.count + 1,
      revenue: prev.revenue + (Number(b.price_won) || 0),
    });
  }
  const topSvcList = Array.from(serviceMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxSvcCount = topSvcList[0]?.count ?? 1;

  // ── 직원별 예약 수 ─────────────────────────────────────
  const staffMap = new Map<string, { name: string; color: string; count: number }>();
  for (const b of staffBookings.data ?? []) {
    const staff = (b.staff as unknown) as { name: string; display_color: string } | null;
    const key = staff?.name ?? "미지정";
    const color = staff?.display_color ?? "#9ca3af";
    const prev = staffMap.get(key) ?? { name: key, color, count: 0 };
    staffMap.set(key, { ...prev, count: prev.count + 1 });
  }
  const staffList = Array.from(staffMap.values()).sort((a, b) => b.count - a.count);
  const maxStaffCount = staffList[0]?.count ?? 1;

  // ── 최근 30일 일별 예약 ───────────────────────────────
  const dayMap = new Map<string, number>();
  for (const b of last30.data ?? []) {
    const kst = new Date(new Date(b.start_at).toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const key = `${kst.getMonth() + 1}/${kst.getDate()}`;
    dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
  }
  // 최근 14일만 표시
  const days14: { label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const kst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const key = `${kst.getMonth() + 1}/${kst.getDate()}`;
    days14.push({ label: key, count: dayMap.get(key) ?? 0 });
  }
  const maxDay = Math.max(...days14.map((d) => d.count), 1);

  const thisMonthLabel = `${thisMonth}월`;
  const prevMonthLabel = `${prevMonth}월`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">예약·매출 통계</h1>
        <p className="mt-1 text-sm text-gray-500">
          {thisYear}년 {thisMonthLabel} 기준
        </p>
      </div>

      {/* 이번 달 요약 카드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={`${thisMonthLabel} 매출`}
          value={`${thisRevenue.toLocaleString()}원`}
          sub={prevRevenue > 0 ? `${prevMonthLabel} 대비 ${formatDiff(diff(thisRevenue, prevRevenue))}` : undefined}
          accent="rose"
        />
        <StatCard
          label={`${thisMonthLabel} 예약`}
          value={`${thisTotal}건`}
          sub={prevTotal > 0 ? `${prevMonthLabel} 대비 ${formatDiff(diff(thisTotal, prevTotal))}` : undefined}
        />
        <StatCard
          label={`${thisMonthLabel} 완료`}
          value={`${thisCompleted.length}건`}
          sub={thisTotal > 0 ? `완료율 ${Math.round((thisCompleted.length / thisTotal) * 100)}%` : undefined}
        />
        <StatCard
          label={`${thisMonthLabel} 방문 고객`}
          value={`${thisUniqueCustomers}명`}
          sub={`신규 등록 ${newCustomers.count ?? 0}명`}
        />
      </div>

      {/* 최근 14일 예약 추이 */}
      <section className="rounded-xl border bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">📈 최근 14일 예약 추이</h2>
        <div className="flex items-end gap-1 overflow-x-auto pb-2" style={{ height: 100 }}>
          {days14.map((d) => (
            <div key={d.label} className="flex flex-1 min-w-[22px] flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-rose-300 transition-all"
                style={{ height: `${(d.count / maxDay) * 72}px`, minHeight: d.count > 0 ? 4 : 0 }}
                title={`${d.label}: ${d.count}건`}
              />
              <span className="text-[9px] text-gray-400">{d.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          총 {last30.data?.length ?? 0}건 (최근 30일, 취소 제외)
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 인기 시술 TOP 5 */}
        <section className="rounded-xl border bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">💇 인기 시술 TOP 5 ({thisMonthLabel} 완료)</h2>
          {topSvcList.length === 0 ? (
            <p className="text-sm text-gray-400">완료된 예약이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {topSvcList.map((s, i) => (
                <div key={s.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      <span className="mr-1.5 font-bold text-gray-400">{i + 1}</span>
                      {s.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {s.count}건 · {s.revenue.toLocaleString()}원
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-rose-300"
                      style={{ width: `${(s.count / maxSvcCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 직원별 예약 */}
        <section className="rounded-xl border bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">👩‍💼 직원별 예약 ({thisMonthLabel}, 취소 제외)</h2>
          {staffList.length === 0 ? (
            <p className="text-sm text-gray-400">예약이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {staffList.map((s) => (
                <div key={s.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-gray-700">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.name}
                    </span>
                    <span className="text-xs text-gray-500">{s.count}건</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(s.count / maxStaffCount) * 100}%`,
                        backgroundColor: s.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 이번 달 vs 지난 달 비교 */}
      <section className="rounded-xl border bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">📊 월별 비교</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500">
                <th className="py-2 text-left font-medium">항목</th>
                <th className="py-2 text-right font-medium">{prevMonthLabel}</th>
                <th className="py-2 text-right font-medium">{thisMonthLabel}</th>
                <th className="py-2 text-right font-medium">증감</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <CompareRow
                label="예약 수"
                prev={prevTotal}
                curr={thisTotal}
                format={(v) => `${v}건`}
              />
              <CompareRow
                label="완료"
                prev={prevCompleted.length}
                curr={thisCompleted.length}
                format={(v) => `${v}건`}
              />
              <CompareRow
                label="매출"
                prev={prevRevenue}
                curr={thisRevenue}
                format={(v) => `${v.toLocaleString()}원`}
              />
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function formatDiff(pct: number | null) {
  if (pct === null) return "—";
  if (pct === 0) return "동일";
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "rose";
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        accent === "rose"
          ? "border-rose-200 bg-rose-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <p className={`mb-1 text-xs ${accent === "rose" ? "text-rose-500" : "text-gray-500"}`}>
        {label}
      </p>
      <p className={`text-2xl font-bold ${accent === "rose" ? "text-rose-700" : "text-gray-900"}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function CompareRow({
  label,
  prev,
  curr,
  format,
}: {
  label: string;
  prev: number;
  curr: number;
  format: (v: number) => string;
}) {
  const delta = curr - prev;
  const pct = prev > 0 ? Math.round((delta / prev) * 100) : null;
  return (
    <tr>
      <td className="py-2.5 text-gray-700">{label}</td>
      <td className="py-2.5 text-right text-gray-400">{format(prev)}</td>
      <td className="py-2.5 text-right font-medium text-gray-900">{format(curr)}</td>
      <td className="py-2.5 text-right">
        {pct === null ? (
          <span className="text-gray-400">—</span>
        ) : delta === 0 ? (
          <span className="text-gray-400">—</span>
        ) : delta > 0 ? (
          <span className="text-emerald-600">+{pct}%</span>
        ) : (
          <span className="text-red-500">{pct}%</span>
        )}
      </td>
    </tr>
  );
}
