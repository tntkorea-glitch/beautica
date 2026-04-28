"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatPhone } from "@/lib/format";
import { submitPublicConsult } from "./actions";

export function PublicConsultForm({
  shopId,
  shopSlug,
}: {
  shopId: string;
  shopSlug: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [phone, setPhone] = useState("");

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.set("shop_id", shopId);
    startTransition(async () => {
      const r = await submitPublicConsult(formData);
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
        <p className="text-sm font-medium text-gray-900">
          상담 문의가 접수되었습니다.
        </p>
        <p className="mt-1 text-xs text-gray-500">
          답변이 등록되면 연락드립니다.
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
      <Field label="카테고리 (선택)" name="category" placeholder="예: 시술 문의, 가격 문의" />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          문의 내용
        </label>
        <textarea
          name="message"
          required
          rows={5}
          placeholder="궁금하신 점을 자세히 적어주세요"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="h-12 w-full rounded-lg bg-gray-900 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
      >
        {isPending ? "전송 중..." : "상담 신청"}
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
