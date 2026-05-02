"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useRef, useEffect } from "react";
import { formatPhone } from "@/lib/format";

type Service = { id: string; name: string; category: string | null; price_won: number; duration_min: number };
type Customer = { id: string; name: string; phone: string | null };
type Staff = { id: string; name: string; display_color: string; position: string | null };

export function BookingForm({
  services,
  customers,
  staff,
  submit,
}: {
  services: Service[];
  customers: Customer[];
  staff: Staff[];
  submit: (formData: FormData) => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<"existing" | "guest">(
    customers.length > 0 ? "existing" : "guest",
  );
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

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

  // 카테고리 목록 (카테고리 없는 시술은 "기타"로 묶음)
  const categories = [
    ...new Set(services.map((s) => s.category?.trim() || "기타")),
  ];
  const hasCategories = categories.length > 1 || (categories.length === 1 && categories[0] !== "기타");

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [serviceId, setServiceId] = useState("");
  const [priceDisplay, setPriceDisplay] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  // 카테고리 필터링된 시술 목록
  const filteredServices = selectedCategory
    ? services.filter((s) => (s.category?.trim() || "기타") === selectedCategory)
    : services;

  const selectedService = services.find((s) => s.id === serviceId);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    if (mode === "existing" && !selectedCustomer) {
      setError("고객을 선택해주세요.");
      return;
    }
    startTransition(async () => {
      const r = await submit(formData);
      if (r?.error) setError(r.error);
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="flex gap-2 rounded-md bg-gray-100 p-1">
        <ModeButton active={mode === "existing"} onClick={() => setMode("existing")}>
          기존 고객
        </ModeButton>
        <ModeButton active={mode === "guest"} onClick={() => setMode("guest")}>
          게스트 신규
        </ModeButton>
      </div>

      {mode === "existing" ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">고객</label>
          <input type="hidden" name="customer_id" value={selectedCustomer?.id ?? ""} />
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
              <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
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
                        {c.phone && <span className="text-xs text-gray-400">{c.phone}</span>}
                      </button>
                    </li>
                  ))
                )}
                {!customerQuery && customers.length > 30 && (
                  <li className="px-3 py-1.5 text-center text-xs text-gray-400">
                    이름/번호 입력으로 검색하세요 (전체 {customers.length}명)
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="이름" name="guest_name" required placeholder="고객명" />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              연락처
            </label>
            <input
              type="tel"
              name="guest_phone"
              inputMode="numeric"
              value={guestPhone}
              onChange={(e) => setGuestPhone(formatPhone(e.target.value))}
              placeholder="010-0000-0000"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {staff.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">담당 스태프 (선택)</label>
          <select
            name="staff_id"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          >
            <option value="">— 선택 안 함 —</option>
            {staff.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
                {st.position ? ` (${st.position})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 시술 선택 — 카테고리가 여러 개면 2단계 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">시술</label>

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
            <option value="">— 카테고리 선택 —</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}

        <select
          name="service_id"
          required
          value={serviceId}
          disabled={hasCategories && !selectedCategory}
          onChange={(e) => {
            setServiceId(e.target.value);
            const svc = services.find((s) => s.id === e.target.value);
            if (svc) setPriceDisplay(svc.price_won.toLocaleString());
          }}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="">
            {hasCategories && !selectedCategory ? "← 카테고리를 먼저 선택하세요" : "— 시술 선택 —"}
          </option>
          {filteredServices.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.duration_min}분, {s.price_won.toLocaleString()}원)
            </option>
          ))}
        </select>

        {services.length === 0 && (
          <p className="text-xs text-amber-700">
            ⚠️ 등록된 시술 메뉴가 없습니다. 먼저 시술 메뉴를 등록해주세요.
          </p>
        )}
      </div>

      <Field
        label="시작 시간"
        name="start_at"
        type="datetime-local"
        required
        defaultValue={defaultStartAt()}
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          가격 (원)
        </label>
        <input
          name="price_won"
          inputMode="numeric"
          value={priceDisplay}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "");
            setPriceDisplay(d ? Number(d).toLocaleString() : "");
          }}
          placeholder="시술 기본 가격"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-500">
          시술 선택 시 기본 가격 자동 입력. 할인/추가 시 수정 가능.
          {selectedService && (
            <> 종료: {selectedService.duration_min}분 후 자동 계산.</>
          )}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          매장 메모 (선택)
        </label>
        <textarea
          name="shop_note"
          rows={2}
          placeholder="내부 메모 (고객에게 보이지 않음)"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={isPending || services.length === 0}
          className="rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          {isPending ? "등록 중..." : "예약 등록 (확정)"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/bookings")}
          className="rounded-md border border-gray-300 px-5 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          취소
        </button>
      </div>
    </form>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex-1 rounded px-3 py-1.5 text-sm font-medium transition " +
        (active ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900")
      }
    >
      {children}
    </button>
  );
}

function Field({
  label,
  ...props
}: {
  label: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        {...props}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
      />
    </label>
  );
}

function defaultStartAt() {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  // datetime-local format: YYYY-MM-DDTHH:MM
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
