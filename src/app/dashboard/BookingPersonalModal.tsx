"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { formatPhone } from "@/lib/format";
import {
  createPersonalEvent,
  createBookingFromCalendar,
} from "./bookings/calendar/actions";

export type ModalService = {
  id: string;
  name: string;
  category: string | null;
  price_won: number;
  duration_min: number;
};
export type ModalCustomer = { id: string; name: string; phone: string | null };
export type ModalStaff = { id: string; name: string; display_color: string; position: string | null };

const PRESET_COLORS = [
  "#9ca3af", "#f87171", "#fb923c", "#facc15",
  "#4ade80", "#60a5fa", "#a78bfa", "#f472b6",
];

type Tab = "booking" | "personal";

export function BookingPersonalModal({
  defaultDate,
  defaultHour,
  services,
  customers,
  staff,
  onClose,
}: {
  defaultDate: string; // YYYY-MM-DD
  defaultHour?: number;
  services: ModalService[];
  customers: ModalCustomer[];
  staff: ModalStaff[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("booking");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ========== booking state ==========
  const [bMode, setBMode] = useState<"existing" | "guest">(
    customers.length > 0 ? "existing" : "guest",
  );
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<ModalCustomer | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [staffId, setStaffId] = useState("");

  const categories = [
    ...new Set(services.map((s) => s.category?.trim() || "기타")),
  ];
  const hasCategories =
    categories.length > 1 || (categories.length === 1 && categories[0] !== "기타");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [priceDisplay, setPriceDisplay] = useState("");
  const filteredServices = selectedCategory
    ? services.filter((s) => (s.category?.trim() || "기타") === selectedCategory)
    : services;

  const initHour = defaultHour ?? 10;
  const [bookingTime, setBookingTime] = useState(`${defaultDate}T${String(initHour).padStart(2, "0")}:00`);
  const [shopNote, setShopNote] = useState("");

  const filteredCustomers = customerQuery.trim()
    ? customers.filter((c) => {
        const q = customerQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.phone ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, ""))
        );
      })
    : customers.slice(0, 30);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ========== personal event state ==========
  const [pTitle, setPTitle] = useState("");
  const [pStart, setPStart] = useState(`${String(initHour).padStart(2, "0")}:00`);
  const [pEnd, setPEnd] = useState(`${String(Math.min(initHour + 1, 22)).padStart(2, "0")}:00`);
  const [pColor, setPColor] = useState("#60a5fa");
  const [pNote, setPNote] = useState("");

  function handleSubmit() {
    setError(null);

    if (tab === "booking") {
      if (bMode === "existing" && !selectedCustomer) {
        setError("고객을 선택해주세요.");
        return;
      }
      if (bMode === "guest" && !guestName.trim()) {
        setError("게스트 이름을 입력해주세요.");
        return;
      }
      if (!serviceId) {
        setError("시술을 선택해주세요.");
        return;
      }

      const priceNum = priceDisplay
        ? Number(priceDisplay.replace(/\D/g, ""))
        : null;

      startTransition(async () => {
        const r = await createBookingFromCalendar({
          customer_id: bMode === "existing" ? (selectedCustomer?.id ?? null) : null,
          service_id: serviceId,
          staff_id: staffId || null,
          guest_name: bMode === "guest" ? guestName.trim() : null,
          guest_phone: bMode === "guest" ? guestPhone.trim() || null : null,
          start_at: new Date(bookingTime).toISOString(),
          price_won: priceNum,
          shop_note: shopNote.trim() || null,
        });
        if (r.error) setError(r.error);
        else onClose();
      });
    } else {
      if (!pTitle.trim()) {
        setError("일정 제목을 입력해주세요.");
        return;
      }
      startTransition(async () => {
        try {
          await createPersonalEvent({
            title: pTitle,
            start_at: `${defaultDate}T${pStart}:00+09:00`,
            end_at: `${defaultDate}T${pEnd}:00+09:00`,
            color: pColor,
            note: pNote || undefined,
          });
          onClose();
        } catch (e) {
          setError(e instanceof Error ? e.message : "저장 실패");
        }
      });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tabs */}
        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setTab("booking")}
            className={
              "flex-1 px-4 py-3 text-sm font-semibold transition " +
              (tab === "booking"
                ? "border-b-2 border-rose-500 text-rose-600"
                : "text-gray-500 hover:bg-gray-50")
            }
          >
            📅 예약 등록
          </button>
          <button
            type="button"
            onClick={() => setTab("personal")}
            className={
              "flex-1 px-4 py-3 text-sm font-semibold transition " +
              (tab === "personal"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:bg-gray-50")
            }
          >
            🗒 개인 일정
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="mb-3 text-xs text-gray-500">{defaultDate}</p>

          {tab === "booking" ? (
            <div className="space-y-3">
              {/* mode toggle */}
              <div className="flex gap-1 rounded-md bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setBMode("existing")}
                  className={
                    "flex-1 rounded px-3 py-1.5 text-xs font-medium transition " +
                    (bMode === "existing"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600")
                  }
                >
                  기존 고객
                </button>
                <button
                  type="button"
                  onClick={() => setBMode("guest")}
                  className={
                    "flex-1 rounded px-3 py-1.5 text-xs font-medium transition " +
                    (bMode === "guest"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600")
                  }
                >
                  게스트 신규
                </button>
              </div>

              {bMode === "existing" ? (
                <div ref={comboRef} className="relative">
                  {selectedCustomer ? (
                    <div className="flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                      <span>
                        <span className="font-medium">{selectedCustomer.name}</span>
                        {selectedCustomer.phone && (
                          <span className="ml-2 text-gray-500">{selectedCustomer.phone}</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setSelectedCustomer(null); setCustomerQuery(""); }}
                        className="ml-2 text-gray-400 hover:text-gray-700"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={customerQuery}
                      onChange={(e) => { setCustomerQuery(e.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="이름 또는 전화번호로 검색..."
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                      autoComplete="off"
                    />
                  )}
                  {showDropdown && !selectedCustomer && (
                    <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                      {filteredCustomers.length === 0 ? (
                        <li className="px-3 py-2 text-xs text-gray-400">검색 결과 없음</li>
                      ) : (
                        filteredCustomers.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onMouseDown={() => {
                                setSelectedCustomer(c);
                                setCustomerQuery("");
                                setShowDropdown(false);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-rose-50"
                            >
                              <span className="font-medium text-gray-900">{c.name}</span>
                              {c.phone && (
                                <span className="text-xs text-gray-400">{c.phone}</span>
                              )}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="고객명"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                  />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(formatPhone(e.target.value))}
                    placeholder="010-0000-0000"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                  />
                </div>
              )}

              {/* 시술 */}
              <div className="space-y-2">
                {hasCategories && (
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setServiceId("");
                      setPriceDisplay("");
                    }}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                  >
                    <option value="">전체 카테고리</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
                <select
                  value={serviceId}
                  onChange={(e) => {
                    setServiceId(e.target.value);
                    const svc = services.find((s) => s.id === e.target.value);
                    if (svc) setPriceDisplay(svc.price_won.toLocaleString());
                  }}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                >
                  <option value="">— 시술 선택 —</option>
                  {filteredServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {hasCategories && !selectedCategory && s.category
                        ? `[${s.category}] ${s.name} (${s.duration_min}분, ${s.price_won.toLocaleString()}원)`
                        : `${s.name} (${s.duration_min}분, ${s.price_won.toLocaleString()}원)`}
                    </option>
                  ))}
                </select>
                {services.length === 0 && (
                  <p className="text-xs text-amber-700">
                    ⚠️ 등록된 시술 메뉴가 없습니다.
                  </p>
                )}
              </div>

              {/* 스태프 */}
              {staff.length > 0 && (
                <select
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                >
                  <option value="">담당 스태프 선택 안 함</option>
                  {staff.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}{st.position ? ` (${st.position})` : ""}
                    </option>
                  ))}
                </select>
              )}

              {/* 시작 시간 */}
              <div>
                <label className="mb-1 block text-xs text-gray-500">시작 시간</label>
                <input
                  type="datetime-local"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                />
              </div>

              {/* 가격 */}
              <div>
                <label className="mb-1 block text-xs text-gray-500">가격 (원)</label>
                <input
                  inputMode="numeric"
                  value={priceDisplay}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, "");
                    setPriceDisplay(d ? Number(d).toLocaleString() : "");
                  }}
                  placeholder="시술 기본 가격 자동 입력"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                />
              </div>

              {/* 메모 */}
              <textarea
                value={shopNote}
                onChange={(e) => setShopNote(e.target.value)}
                rows={2}
                placeholder="매장 메모 (선택)"
                className="block w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
            </div>
          ) : (
            // ============ 개인 일정 ============
            <div className="space-y-3">
              <input
                autoFocus
                type="text"
                placeholder="일정 제목 *"
                value={pTitle}
                onChange={(e) => setPTitle(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-gray-500">시작</label>
                  <input
                    type="time"
                    value={pStart}
                    onChange={(e) => setPStart(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-gray-500">종료</label>
                  <input
                    type="time"
                    value={pEnd}
                    onChange={(e) => setPEnd(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-gray-500">색상</label>
                <div className="flex gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPColor(c)}
                      className={`h-7 w-7 rounded-full border-2 transition-transform ${
                        pColor === c ? "scale-110 border-gray-700" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <textarea
                value={pNote}
                onChange={(e) => setPNote(e.target.value)}
                rows={2}
                placeholder="메모 (선택)"
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className={
                "flex-1 rounded-md py-2 text-sm font-semibold text-white disabled:opacity-50 " +
                (tab === "booking" ? "bg-rose-500 hover:bg-rose-600" : "bg-blue-500 hover:bg-blue-600")
              }
            >
              {isPending ? "저장 중..." : tab === "booking" ? "예약 등록" : "일정 저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
