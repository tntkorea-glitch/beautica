"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { convertGuestToCustomer } from "../actions";
import { formatPhone } from "@/lib/format";

export function GuestToCustomerPanel({
  bookingId,
  initialName,
  initialPhone,
}: {
  bookingId: string;
  initialName: string;
  initialPhone: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(formatPhone(initialPhone));
  const [email, setEmail] = useState("");
  const [linkOthers, setLinkOthers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const r = await convertGuestToCustomer({
        bookingId,
        name,
        phone,
        email: email.trim() || null,
        linkOtherGuestBookings: linkOthers,
      });
      if (r.error) {
        setError(r.error);
        return;
      }
      // 매칭된 기존 고객이 있으면 명시 — 사용자가 신규 등록한 줄 알고 혼동하는 것 방지
      if (r.matchedExisting && r.existingCustomerName) {
        window.alert(
          `같은 휴대폰 번호로 등록된 기존 고객 "${r.existingCustomerName}" 카드에 연결했습니다.`,
        );
      }
      router.refresh();
    });
  };

  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="text-base font-semibold text-gray-900">게스트 → 고객 등록</h3>
      <p className="mt-1 text-xs text-gray-600">
        고객 카드로 등록하면 상담차트/시술기록/동의서/회수권/패스 작성이 가능해집니다. 같은 매장에
        같은 휴대폰 번호 고객이 이미 있으면 자동으로 그 카드에 연결됩니다.
      </p>

      <div className="mt-4 grid gap-3">
        <Field label="이름">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </Field>
        <Field label="휴대폰">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="010-0000-0000"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </Field>
        <Field label="이메일 (선택)">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@example.com"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={linkOthers}
            onChange={(e) => setLinkOthers(e.target.checked)}
          />
          같은 휴대폰 번호로 잡힌 다른 게스트 예약도 함께 연결
        </label>
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="rounded-md bg-rose-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-gold-700 disabled:opacity-50"
        >
          {pending ? "처리 중..." : "고객으로 등록"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
