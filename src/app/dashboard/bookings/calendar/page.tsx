import Link from "next/link";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { WeekCalendar } from "./WeekCalendar";
import { DayCalendar } from "./DayCalendar";

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateParam(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; view?: string; date?: string }>;
}) {
  const { shop } = await requireShop();
  const sp = await searchParams;
  const view = sp.view === "day" ? "day" : "week";

  // Determine date range to fetch
  let rangeStart: Date;
  let rangeEnd: Date;
  let weekStartParam: string;
  let dayParam: string;

  if (view === "day") {
    const base = sp.date ? new Date(sp.date + "T00:00:00") : new Date();
    rangeStart = new Date(base); rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date(base); rangeEnd.setHours(23, 59, 59, 999);
    dayParam = formatDateParam(base);
    weekStartParam = formatDateParam(getMondayOfWeek(base));
  } else {
    const base = sp.week ? new Date(sp.week + "T00:00:00") : new Date();
    const monday = getMondayOfWeek(base);
    const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
    rangeStart = monday;
    rangeEnd = sunday;
    weekStartParam = formatDateParam(monday);
    dayParam = formatDateParam(new Date());
  }

  const admin = createAdminClient();
  const [{ data: bookings }, { data: personalEvents }] = await Promise.all([
    admin
      .from("bookings")
      .select(
        "id, start_at, end_at, status, guest_name, customer:customers(name), service:services(name), staff:staff(name, display_color)",
      )
      .eq("shop_id", shop.id)
      .gte("start_at", rangeStart.toISOString())
      .lte("start_at", rangeEnd.toISOString())
      .not("status", "in", '("CANCELLED")')
      .order("start_at"),
    admin
      .from("personal_events")
      .select("id, title, start_at, end_at, all_day, color, note")
      .eq("shop_id", shop.id)
      .gte("start_at", rangeStart.toISOString())
      .lte("start_at", rangeEnd.toISOString())
      .order("start_at"),
  ]);

  const calBookings = (bookings ?? []).map((b: Record<string, unknown>) => {
    const customer = b.customer as { name: string } | null;
    const service = b.service as { name: string } | null;
    const staff = b.staff as { name: string; display_color: string } | null;
    return {
      id: b.id as string,
      start_at: b.start_at as string,
      end_at: b.end_at as string,
      status: b.status as string,
      customerName: customer?.name ?? (b.guest_name as string | null) ?? "(이름 없음)",
      serviceName: service?.name ?? null,
      staffColor: staff?.display_color ?? "#9ca3af",
      staffName: staff?.name ?? null,
    };
  });

  const calEvents = (personalEvents ?? []).map((e: Record<string, unknown>) => ({
    id: e.id as string,
    title: e.title as string,
    start_at: e.start_at as string,
    end_at: e.end_at as string,
    all_day: e.all_day as boolean,
    color: e.color as string,
    note: (e.note as string | null) ?? null,
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">예약 캘린더</h1>
          <p className="mt-1 text-sm text-gray-500">
            {view === "day" ? "일간" : "주간"} 예약 현황
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/bookings" className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            목록 보기
          </Link>
          <Link href="/dashboard/bookings/new" className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: "var(--rose-gold-500)" }}>
            + 예약 추가
          </Link>
        </div>
      </div>

      {/* View toggle */}
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={`/dashboard/bookings/calendar?view=week&week=${weekStartParam}`}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${view === "week" ? "bg-gray-900 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          주간
        </Link>
        <Link
          href={`/dashboard/bookings/calendar?view=day&date=${dayParam}`}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${view === "day" ? "bg-gray-900 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          일간
        </Link>

        {/* Status legend */}
        <div className="ml-4 flex flex-wrap gap-3 text-xs">
          {[
            ["border-amber-400 bg-amber-50", "대기"],
            ["border-blue-400 bg-blue-50", "확정"],
            ["border-green-400 bg-green-50", "완료"],
            ["border-red-400 bg-red-50", "노쇼"],
          ].map(([cls, label]) => (
            <span key={label} className="flex items-center gap-1">
              <span className={`inline-block h-3 w-3 rounded border-l-2 ${cls}`} /> {label}
            </span>
          ))}
        </div>
      </div>

      {view === "day" ? (
        <DayCalendar bookings={calBookings} dateParam={dayParam} personalEvents={calEvents} />
      ) : (
        <WeekCalendar bookings={calBookings} weekStart={weekStartParam} personalEvents={calEvents} />
      )}
    </div>
  );
}
