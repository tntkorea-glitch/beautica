"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatPhone } from "@/lib/format";
import { submitPublicBooking } from "./actions";

type Service = { id: string; name: string; price_won: number; duration_min: number };

export function PublicBookingForm({
  shopId,
  shopSlug,
  services,
  initialServiceId,
}: {
  shopId: string;
  shopSlug: string;
  services: Service[];
  initialServiceId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState(initialServiceId || services[0]?.id || "");

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.set("shop_id", shopId);
    startTransition(async () => {
      const r = await submitPublicBooking(formData);
      if (r.error) {
        setError(r.error);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push(`/${shopSlug}`), 2500);
    });
  };

  if (success) {
    return (
      <div className="py-8 text-center">
        <div className="mb-2 text-3xl">✅</div>
        <p className="text-sm font-medium text-gray-900">예약 신청이 접수되었습니다.</p>
        <p className="mt-1 text-xs text-gray-500">
          매장에서 확인 후 확정 안내드립니다. 잠시 후 매장 페이지로 이동합니다.
        </p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <Field label="이름" name="guest_name" required placeholder="홍길동" />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">연락처</label>
        <input
          type="tel"
          name="guest_phone"
          required
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="010-0000-0000"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">시술</label>
        <select
          name="service_id"
          required
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        >
          <option value="">— 선택 —</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.duration_min}분, {s.price_won.toLocaleString()}원)
            </option>
          ))}
        </select>
      </div>

      <Field
        label="희망 일시"
        name="start_at"
        type="datetime-local"
        required
        defaultValue={defaultStartAt()}
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          요청사항 (선택)
        </label>
        <textarea
          name="customer_note"
          rows={3}
          placeholder="원하시는 스타일, 알러지, 기타 요청사항"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending || services.length === 0}
        className="h-12 w-full rounded-lg bg-gray-900 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
      >
        {isPending ? "신청 중..." : "예약 신청"}
      </button>
    </form>
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
  now.setHours(now.getHours() + 24);
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
