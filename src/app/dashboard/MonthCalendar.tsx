"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookingPersonalModal,
  type ModalService,
  type ModalCustomer,
  type ModalStaff,
} from "./BookingPersonalModal";

type MonthBooking = {
  id: string;
  start_at: string;
  status: string;
  customerName: string;
  serviceName: string | null;
};

type MonthEvent = {
  id: string;
  title: string;
  start_at: string;
  color: string;
};

const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-amber-400",
  CONFIRMED: "bg-blue-400",
  COMPLETED: "bg-green-400",
  CANCELLED: "bg-gray-300",
  NO_SHOW: "bg-red-400",
  PAYMENT_PENDING: "bg-purple-400",
};

function formatYmd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toKSTDate(iso: string) {
  return new Date(new Date(iso).toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}

export function MonthCalendar({
  year,
  month, // 1~12
  bookings,
  events,
  services,
  customers,
  staff,
}: {
  year: number;
  month: number;
  bookings: MonthBooking[];
  events: MonthEvent[];
  services: ModalService[];
  customers: ModalCustomer[];
  staff: ModalStaff[];
}) {
  const [picked, setPicked] = useState<{ date: string; hour?: number } | null>(null);
  const [cursor, setCursor] = useState<{ y: number; m: number }>({ y: year, m: month });

  const first = new Date(cursor.y, cursor.m - 1, 1);
  const last = new Date(cursor.y, cursor.m, 0);
  // 주 시작 = 월요일
  const firstDow = (first.getDay() + 6) % 7; // mon=0
  const totalDays = last.getDate();
  const totalCells = Math.ceil((firstDow + totalDays) / 7) * 7;

  const today = new Date();
  const todayStr = formatYmd(today);

  function shift(delta: number) {
    let m = cursor.m + delta;
    let y = cursor.y;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setCursor({ y, m });
  }

  // 날짜별 그룹
  const bookingByDay = new Map<string, MonthBooking[]>();
  bookings.forEach((b) => {
    const key = formatYmd(toKSTDate(b.start_at));
    if (!bookingByDay.has(key)) bookingByDay.set(key, []);
    bookingByDay.get(key)!.push(b);
  });
  const eventByDay = new Map<string, MonthEvent[]>();
  events.forEach((e) => {
    const key = formatYmd(toKSTDate(e.start_at));
    if (!eventByDay.has(key)) eventByDay.set(key, []);
    eventByDay.get(key)!.push(e);
  });

  const cells: { date: Date | null; ymd: string | null; isOtherMonth: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - firstDow + 1;
    if (dayNum < 1 || dayNum > totalDays) {
      cells.push({ date: null, ymd: null, isOtherMonth: true });
    } else {
      const d = new Date(cursor.y, cursor.m - 1, dayNum);
      cells.push({ date: d, ymd: formatYmd(d), isOtherMonth: false });
    }
  }

  const DOW_LABEL = ["월", "화", "수", "목", "금", "토", "일"];

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {picked && (
        <BookingPersonalModal
          defaultDate={picked.date}
          defaultHour={picked.hour}
          services={services}
          customers={customers}
          staff={staff}
          onClose={() => setPicked(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shift(-1)}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            ← 이전
          </button>
          <span className="text-base font-semibold text-gray-800">
            {cursor.y}년 {cursor.m}월
          </span>
          <button
            onClick={() => shift(1)}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            다음 →
          </button>
          <button
            onClick={() => setCursor({ y: today.getFullYear(), m: today.getMonth() + 1 })}
            className="ml-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
          >
            오늘
          </button>
        </div>
        <Link
          href="/dashboard/bookings/calendar"
          className="text-xs text-rose-700 hover:underline"
        >
          주간/일간 보기 →
        </Link>
      </div>

      {/* DOW row */}
      <div className="grid grid-cols-7 border-b border-gray-100 text-center text-xs font-semibold text-gray-500">
        {DOW_LABEL.map((d, i) => (
          <div
            key={d}
            className={`py-1.5 ${i === 5 ? "text-blue-500" : i === 6 ? "text-rose-500" : ""}`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const dow = idx % 7;
          if (cell.isOtherMonth) {
            return (
              <div
                key={idx}
                className="min-h-[88px] border-b border-r border-gray-100 bg-gray-50/40"
              />
            );
          }
          const dayBookings = bookingByDay.get(cell.ymd!) ?? [];
          const dayEvents = eventByDay.get(cell.ymd!) ?? [];
          const isToday = cell.ymd === todayStr;
          const total = dayBookings.length + dayEvents.length;

          return (
            <button
              key={idx}
              onClick={() => setPicked({ date: cell.ymd!, hour: 10 })}
              className={
                "min-h-[88px] cursor-pointer border-b border-r border-gray-100 p-1.5 text-left transition hover:bg-rose-50/40 " +
                (isToday ? "bg-rose-50" : "bg-white")
              }
            >
              <div
                className={
                  "mb-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-xs " +
                  (isToday
                    ? "bg-rose-500 font-bold text-white"
                    : dow === 5
                      ? "text-blue-500"
                      : dow === 6
                        ? "text-rose-500"
                        : "text-gray-700")
                }
              >
                {cell.date!.getDate()}
              </div>

              <div className="space-y-0.5">
                {dayBookings.slice(0, 2).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-1 truncate text-[11px] text-gray-700"
                  >
                    <span
                      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[b.status] ?? "bg-gray-400"}`}
                    />
                    <span className="truncate">{b.customerName}</span>
                  </div>
                ))}
                {dayEvents.slice(0, 1).map((e) => (
                  <div
                    key={e.id}
                    className="truncate text-[11px]"
                    style={{ color: e.color }}
                  >
                    • {e.title}
                  </div>
                ))}
                {total > 3 && (
                  <div className="text-[10px] text-gray-400">+{total - 3}건</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
