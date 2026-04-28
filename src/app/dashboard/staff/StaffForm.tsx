"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type StaffInitial = {
  name?: string;
  display_color?: string;
  position?: string | null;
  commission_rate?: number | null;
  is_active?: boolean;
  display_order?: number;
};

const COLOR_PALETTE = [
  "#b76e79", // rose gold
  "#84a59d", // sage
  "#c8a8b8", // mauve
  "#d4a373", // honey
  "#a8b5b2", // misty sage
  "#e6b8a2", // peach
  "#9b8aa3", // dusty purple
  "#6c757d", // slate
];

export function StaffForm({
  initial,
  submit,
  submitLabel,
  onDelete,
}: {
  initial?: StaffInitial;
  submit: (formData: FormData) => Promise<{ error?: string }>;
  submitLabel: string;
  onDelete?: () => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [color, setColor] = useState(initial?.display_color ?? COLOR_PALETTE[0]);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const r = await submit(formData);
      if (r?.error) setError(r.error);
    });
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (!confirm("이 스태프를 삭제하시겠어요? 기존 예약/매출 기록의 담당자는 비워집니다.")) return;
    setError(null);
    startTransition(async () => {
      const r = await onDelete();
      if (r?.error) setError(r.error);
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <Field label="이름" name="name" required defaultValue={initial?.name ?? ""} placeholder="홍길동" />
      <Field
        label="직책 (선택)"
        name="position"
        defaultValue={initial?.position ?? ""}
        placeholder="예: 원장 / 부원장 / 스탭"
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          캘린더 색상
        </label>
        <input type="hidden" name="display_color" value={color} />
        <div className="flex flex-wrap gap-2">
          {COLOR_PALETTE.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              className={
                "h-9 w-9 rounded-full border-2 transition " +
                (color === c ? "border-gray-900 scale-110" : "border-gray-200 hover:border-gray-400")
              }
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      <Field
        label="기본 커미션율 % (선택)"
        name="commission_rate"
        type="number"
        defaultValue={initial?.commission_rate != null ? String(initial.commission_rate) : ""}
        min={0}
        max={100}
        step={0.1}
        placeholder="예: 30"
        hint="시술별로 다르게 설정도 가능 (Phase 4 기능)"
      />

      <Field
        label="표시 순서 (작을수록 위)"
        name="display_order"
        type="number"
        defaultValue={String(initial?.display_order ?? 0)}
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={initial?.is_active ?? true}
          className="h-4 w-4 rounded border-gray-300"
        />
        <span>활성 (체크 해제 시 새 예약에서 선택 불가)</span>
      </label>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      <div className="flex items-center justify-between pt-4">
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-rose-gold-600 px-5 py-2 text-sm font-medium text-white hover:bg-rose-gold-700 disabled:opacity-50"
          >
            {isPending ? "저장 중..." : submitLabel}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/staff")}
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
