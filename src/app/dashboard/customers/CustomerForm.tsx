"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatPhone } from "@/lib/format";

type CustomerInitial = {
  name?: string;
  phone?: string | null;
  email?: string | null;
  birthday?: string | null;
  gender?: string | null;
  notes?: string | null;
  tags?: string[] | null;
};

export function CustomerForm({
  initial,
  submit,
  submitLabel,
  onDelete,
}: {
  initial?: CustomerInitial;
  submit: (formData: FormData) => Promise<{ error?: string }>;
  submitLabel: string;
  onDelete?: () => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState(initial?.phone ?? "");

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const r = await submit(formData);
      if (r?.error) setError(r.error);
    });
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (!confirm("이 고객을 삭제하시겠어요? 시술 이력 메모도 함께 삭제됩니다.")) return;
    setError(null);
    startTransition(async () => {
      const r = await onDelete();
      if (r?.error) setError(r.error);
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <Field label="이름" name="name" required defaultValue={initial?.name ?? ""} />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">연락처</label>
        <input
          type="tel"
          name="phone"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="010-0000-0000"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      <Field
        label="이메일 (선택)"
        name="email"
        type="email"
        defaultValue={initial?.email ?? ""}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="생년월일 (선택)"
          name="birthday"
          type="date"
          defaultValue={initial?.birthday ?? ""}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            성별 (선택)
          </label>
          <select
            name="gender"
            defaultValue={initial?.gender ?? ""}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          >
            <option value="">선택 안 함</option>
            <option value="FEMALE">여성</option>
            <option value="MALE">남성</option>
            <option value="OTHER">기타</option>
          </select>
        </div>
      </div>

      <Field
        label="태그 (콤마 구분)"
        name="tags"
        defaultValue={(initial?.tags ?? []).join(", ")}
        placeholder="예: 단골, VIP, 알러지주의"
        hint="여러 개는 콤마(,)나 공백으로 구분"
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          메모 / 주의사항 (선택)
        </label>
        <textarea
          name="notes"
          defaultValue={initial?.notes ?? ""}
          rows={4}
          placeholder="알러지, 선호 시술, 시술 이력 메모 등"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

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
            onClick={() => router.back()}
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
