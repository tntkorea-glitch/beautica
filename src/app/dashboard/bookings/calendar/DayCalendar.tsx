"use client";

import { useRouter } from "next/navigation";
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

const HOUR_HEIGHT = 80;
const START_HOUR = 8;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;

function toKSTDate(iso: string) {
  return new Date(new Date(iso).toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}

function formatDateParam(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:         "border-amber-400 bg-amber-50 text-amber-900",
  CONFIRMED:       "border-blue-400 bg-blue-50 text-blue-900",
  COMPLETED:       "border-green-400 bg-green-50 text-green-900",
  CANCELLED:       "border-gray-300 bg-gray-100 text-gray-500 opacity-50",
  NO_SHOW:         "border-red-400 bg-red-50 text-red-900 opacity-60",
  PAYMENT_PENDING: "border-purple-400 bg-purple-50 text-purple-900",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기", CONFIRMED: "확정", COMPLETED: "완료",
  CANCELLED: "취소", NO_SHOW: "노쇼", PAYMENT_PENDING: "결제대기",
};

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

export function DayCalendar({
  bookings,
  dateParam,
}: {
  bookings: CalBooking[];
  dateParam: string; // YYYY-MM-DD
}) {
  const router = useRouter();
  const date = new Date(dateParam + "T00:00:00");

  function navigate(offset: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + offset);
    router.push(`/dashboard/bookings/calendar?view=day&date=${formatDateParam(next)}`);
  }

  function goToday() {
    const now = new Date();
    router.push(`/dashboard/bookings/calendar?view=day&date=${formatDateParam(now)}`);
  }

  const dayBookings = bookings.filter((b) => {
    const d = toKSTDate(b.start_at);
    return formatDateParam(d) === dateParam;
  });

  const isToday = dateParam === formatDateParam(new Date());

  return (
    <div>
      {/* Day nav */}
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
          ← 전날
        </button>
        <span className={`text-sm font-semibold ${isToday ? "text-rose-600" : "text-gray-700"}`}>
          {date.getMonth() + 1}월 {date.getDate()}일 ({WEEKDAY[date.getDay()]}){isToday ? " • 오늘" : ""}
        </span>
        <button onClick={() => navigate(1)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
          다음 날 →
        </button>
        <button onClick={goToday} className="ml-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50">
          오늘
        </button>
      </div>

      {/* Summary bar */}
      <div className="mb-3 flex items-center gap-4 text-sm text-gray-600">
        <span>총 <strong>{dayBookings.length}</strong>건</span>
        {["PENDING","CONFIRMED","COMPLETED"].map((s) => {
          const cnt = dayBookings.filter((b) => b.status === s).length;
          return cnt > 0 ? (
            <span key={s} className="text-xs">
              {STATUS_LABEL[s]} {cnt}
            </span>
          ) : null;
        })}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <div className="flex min-w-[400px]">
          {/* Time axis */}
          <div className="w-14 flex-shrink-0 border-r border-gray-100">
            <div className="h-10 border-b border-gray-100" />
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div key={i} className="flex items-start justify-end border-b border-gray-50 pr-2 pt-1 text-xs text-gray-400" style={{ height: HOUR_HEIGHT }}>
                {START_HOUR + i}:00
              </div>
            ))}
          </div>

          {/* Day column */}
          <div className="relative flex-1">
            <div className={`flex h-10 items-center px-3 border-b border-gray-100 text-sm font-medium ${isToday ? "bg-rose-50 text-rose-600" : "text-gray-600"}`}>
              {date.getMonth() + 1}/{date.getDate()} ({WEEKDAY[date.getDay()]})
            </div>
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div key={i} className="border-b border-gray-50" style={{ height: HOUR_HEIGHT }} />
            ))}

            {dayBookings.map((b) => {
              const startKST = toKSTDate(b.start_at);
              const endKST = toKSTDate(b.end_at);
              const startMin = startKST.getHours() * 60 + startKST.getMinutes();
              const endMin = endKST.getHours() * 60 + endKST.getMinutes();
              const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT + 40;
              const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 32);
              const timeStr = `${String(startKST.getHours()).padStart(2,"0")}:${String(startKST.getMinutes()).padStart(2,"0")} ~ ${String(endKST.getHours()).padStart(2,"0")}:${String(endKST.getMinutes()).padStart(2,"0")}`;

              return (
                <Link
                  key={b.id}
                  href={`/dashboard/bookings/${b.id}`}
                  className={`absolute left-2 right-2 overflow-hidden rounded-lg border-l-4 px-3 py-1.5 hover:opacity-80 ${STATUS_COLOR[b.status] ?? "border-gray-400 bg-gray-50"}`}
                  style={{ top, height }}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: b.staffColor }} />
                    <span className="font-semibold">{b.customerName}</span>
                    <span className="text-xs opacity-70">{STATUS_LABEL[b.status]}</span>
                  </div>
                  {b.serviceName && <div className="mt-0.5 truncate text-xs opacity-80">{b.serviceName}</div>}
                  <div className="text-xs opacity-60">{timeStr}{b.staffName ? ` · ${b.staffName}` : ""}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
