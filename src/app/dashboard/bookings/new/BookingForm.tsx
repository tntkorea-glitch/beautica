"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatPhone } from "@/lib/format";

type Service = { id: string; name: string; price_won: number; duration_min: number };
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
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [priceDisplay, setPriceDisplay] = useState(
    services[0]?.price_won.toLocaleString() ?? "",
  );
  const [guestPhone, setGuestPhone] = useState("");

  const selectedService = services.find((s) => s.id === serviceId);

  const handleSubmit = (formData: FormData) => {
    setError(null);
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
          <select
            name="customer_id"
            required
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          >
            <option value="">— 선택 —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ""}
              </option>
            ))}
          </select>
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

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">시술</label>
        <select
          name="service_id"
          required
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            const svc = services.find((s) => s.id === e.target.value);
            if (svc) setPriceDisplay(svc.price_won.toLocaleString());
          }}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        >
          <option value="">— 선택 —</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.duration_min}분, {s.price_won.toLocaleString()}원)
            </option>
          ))}
        </select>
        {services.length === 0 && (
          <p className="mt-1 text-xs text-amber-700">
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
