"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type CalBooking = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  customerName: string;
  serviceName: string | null;
  staffColor: string;
  staffName: string | null;
};

const HOUR_HEIGHT = 64; // px per hour
const START_HOUR = 8;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;

function toKSTDate(iso: string) {
  return new Date(new Date(iso).toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}

function getWeekDays(baseDate: Date) {
  const monday = new Date(baseDate);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatDateParam(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: "border-amber-400 bg-amber-50",
  CONFIRMED: "border-blue-400 bg-blue-50",
  COMPLETED: "border-green-400 bg-green-50",
  CANCELLED: "border-gray-300 bg-gray-100 opacity-50",
  NO_SHOW: "border-red-400 bg-red-50 opacity-60",
  PAYMENT_PENDING: "border-purple-400 bg-purple-50",
};

export function WeekCalendar({
  bookings,
  weekStart,
}: {
  bookings: CalBooking[];
  weekStart: string; // YYYY-MM-DD (Monday)
}) {
  const router = useRouter();
  const base = new Date(weekStart + "T00:00:00");
  const days = getWeekDays(base);

  function navigate(offset: number) {
    const next = new Date(base);
    next.setDate(next.getDate() + offset * 7);
    router.push(`/dashboard/bookings/calendar?week=${formatDateParam(next)}`);
  }

  const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
  const today = new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });

  return (
    <div>
      {/* Week nav */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          ← 이전 주
        </button>
        <span className="text-sm font-semibold text-gray-700">
          {days[0].getMonth() + 1}월 {days[0].getDate()}일 ~ {days[6].getMonth() + 1}월 {days[6].getDate()}일
        </span>
        <button
          onClick={() => navigate(1)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          다음 주 →
        </button>
        <button
          onClick={() => {
            const now = new Date();
            const mon = getWeekDays(now)[0];
            router.push(`/dashboard/bookings/calendar?week=${formatDateParam(mon)}`);
          }}
          className="ml-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
        >
          오늘
        </button>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <div className="flex min-w-[640px]">
          {/* Time axis */}
          <div className="w-12 flex-shrink-0 border-r border-gray-100">
            <div className="h-10 border-b border-gray-100" />
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div
                key={i}
                className="border-b border-gray-100 pr-1 text-right text-xs text-gray-400"
                style={{ height: HOUR_HEIGHT }}
              >
                {START_HOUR + i}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => {
            const dayStr = formatDateParam(day);
            const isToday =
              day.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) === today;

            const dayBookings = bookings.filter((b) => {
              const d = toKSTDate(b.start_at);
              return formatDateParam(d) === dayStr;
            });

            return (
              <div key={di} className="relative flex-1 border-r border-gray-100 last:border-r-0">
                {/* Day header */}
                <div
                  className={`flex h-10 items-center justify-center border-b border-gray-100 text-xs font-semibold ${
                    isToday ? "bg-rose-50 text-rose-600" : "text-gray-600"
                  }`}
                >
                  {DAY_LABELS[di]} {day.getMonth() + 1}/{day.getDate()}
                </div>

                {/* Hour rows */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={i}
                    className="border-b border-gray-50"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}

                {/* Bookings */}
                {dayBookings.map((b) => {
                  const startKST = toKSTDate(b.start_at);
                  const endKST = toKSTDate(b.end_at);
                  const startMin = startKST.getHours() * 60 + startKST.getMinutes();
                  const endMin = endKST.getHours() * 60 + endKST.getMinutes();
                  const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT + 40; // +40 header
                  const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 24);

                  return (
                    <Link
                      key={b.id}
                      href={`/dashboard/bookings/${b.id}`}
                      className={`absolute left-0.5 right-0.5 overflow-hidden rounded border-l-2 px-1 py-0.5 text-xs hover:opacity-80 ${STATUS_COLOR[b.status] ?? "border-gray-400 bg-gray-50"}`}
                      style={{ top, height }}
                    >
                      <div
                        className="h-1.5 w-1.5 rounded-full inline-block mr-1"
                        style={{ backgroundColor: b.staffColor }}
                      />
                      <span className="font-medium">{b.customerName}</span>
                      {b.serviceName && (
                        <div className="truncate text-gray-500">{b.serviceName}</div>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
