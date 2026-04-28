"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ServiceInitial = {
  name?: string;
  category?: string | null;
  price_won?: number;
  duration_min?: number;
  description?: string | null;
  is_active?: boolean;
  display_order?: number;
};

export function ServiceForm({
  initial,
  submit,
  submitLabel,
  onDelete,
}: {
  initial?: ServiceInitial;
  submit: (formData: FormData) => Promise<{ error?: string }>;
  submitLabel: string;
  onDelete?: () => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [priceDisplay, setPriceDisplay] = useState(
    initial?.price_won != null ? initial.price_won.toLocaleString() : "",
  );

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const r = await submit(formData);
      if (r?.error) setError(r.error);
    });
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (!confirm("이 시술을 삭제하시겠어요? 되돌릴 수 없습니다.")) return;
    setError(null);
    startTransition(async () => {
      const r = await onDelete();
      if (r?.error) setError(r.error);
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <Field
        label="시술명"
        name="name"
        required
        defaultValue={initial?.name ?? ""}
        placeholder="예: 베이직 헤어컷"
      />
      <Field
        label="카테고리 (선택)"
        name="category"
        defaultValue={initial?.category ?? ""}
        placeholder="예: 헤어, 네일, 메이크업"
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          가격 (원)
        </label>
        <input
          name="price_won"
          required
          inputMode="numeric"
          value={priceDisplay}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            setPriceDisplay(digits ? Number(digits).toLocaleString() : "");
          }}
          placeholder="30,000"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      <Field
        label="소요 시간 (분)"
        name="duration_min"
        type="number"
        defaultValue={String(initial?.duration_min ?? 60)}
        min={5}
        step={5}
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          설명 (선택)
        </label>
        <textarea
          name="description"
          defaultValue={initial?.description ?? ""}
          rows={3}
          placeholder="시술 설명, 포함 항목 등"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      <Field
        label="표시 순서 (작을수록 위)"
        name="display_order"
        type="number"
        defaultValue={String(initial?.display_order ?? 0)}
        hint="0 이 가장 위. 같은 값이면 최근 등록 순"
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={initial?.is_active ?? true}
          className="h-4 w-4 rounded border-gray-300"
        />
        <span>공개 (체크 해제 시 비공개 — 예약 페이지에 노출 X)</span>
      </label>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      <div className="flex items-center justify-between pt-4">
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
          >
            {isPending ? "저장 중..." : submitLabel}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/services")}
            className="rounded-md border border-gray-300 px-5 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
        </div>
        {onDelete && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            삭제
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  ...props
}: {
  label: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        {...props}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
      />
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}
