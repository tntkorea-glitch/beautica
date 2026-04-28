"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CHART_TEMPLATES,
  type ChartField,
  type ChartTemplate,
} from "@/lib/consultation-templates";
import { saveConsultationChart } from "@/app/dashboard/bookings/[id]/actions";

type ExistingChart = {
  skin_type: string | null;
  allergies: string | null;
  medical_history: string | null;
  medications: string | null;
  previous_treatments: string | null;
  desired_design: string | null;
  shop_assessment: string | null;
  notes: string | null;
};

export function ConsultationChartSection({
  bookingId,
  customerId,
  existing,
}: {
  bookingId: string;
  customerId: string;
  existing: ExistingChart | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [templateKey, setTemplateKey] = useState<string>("EYE_BROW");
  const [values, setValues] = useState<Record<string, string>>(() =>
    existingToValues(existing),
  );

  const template: ChartTemplate =
    CHART_TEMPLATES.find((t) => t.key === templateKey) ?? CHART_TEMPLATES[0];

  const setField = (key: string, v: string) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const handleSave = () => {
    setError(null);
    setSavedAt(null);
    startTransition(async () => {
      const r = await saveConsultationChart(
        bookingId,
        customerId,
        templateKey,
        values,
        template.fields,
      );
      if (r?.error) setError(r.error);
      else {
        setSavedAt(new Date());
        router.refresh();
      }
    });
  };

  return (
    <section className="rounded-lg border border-rose-gold-100 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">📋 상담차트</h3>
        {existing && (
          <span className="text-xs text-gray-500">기존 작성됨 — 수정 후 저장</span>
        )}
      </div>

      {/* 시술 카테고리 선택 (반반노트 패턴) */}
      <div className="mb-4">
        <div className="mb-2 text-xs font-medium text-gray-600">시술 카테고리</div>
        <div className="flex flex-wrap gap-1.5">
          {CHART_TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTemplateKey(t.key)}
              className={
                templateKey === t.key
                  ? "rounded-full bg-rose-gold-600 px-3 py-1.5 text-xs font-medium text-white"
                  : "rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              }
              title={t.description}
            >
              <span className="mr-1">{t.emoji}</span>
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* 동적 필드 */}
      <div className="space-y-3">
        {template.fields.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            value={values[field.key] ?? ""}
            onChange={(v) => setField(field.key, v)}
          />
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="rounded-md bg-rose-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-gold-700 disabled:opacity-50"
        >
          {isPending ? "저장 중..." : existing ? "차트 업데이트" : "차트 저장"}
        </button>
        {savedAt && (
          <span className="text-xs text-green-700">
            ✅ 저장됨 ({savedAt.toLocaleTimeString("ko-KR")})
          </span>
        )}
      </div>
    </section>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ChartField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === "yesno") {
    return (
      <div>
        <label className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700">
          <span>{field.label}</span>
          <div className="flex gap-1">
            {["없음", "있음"].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt === "없음" ? "" : "있음")}
                className={
                  (opt === "있음" && value) || (opt === "없음" && !value)
                    ? "rounded-md bg-rose-gold-600 px-3 py-1 text-xs font-medium text-white"
                    : "rounded-md border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                }
              >
                {opt}
              </button>
            ))}
          </div>
        </label>
        {value && (
          <input
            value={value === "있음" ? "" : value}
            onChange={(e) => onChange(e.target.value || "있음")}
            placeholder={field.hint ?? "내용 입력 (선택)"}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
          />
        )}
      </div>
    );
  }

  if (field.type === "radio" && field.options) {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {field.label}
        </label>
        <div className="flex flex-wrap gap-1">
          {field.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(value === opt ? "" : opt)}
              className={
                value === opt
                  ? "rounded-md bg-rose-gold-600 px-3 py-1.5 text-xs font-medium text-white"
                  : "rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              }
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {field.label}
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder={field.hint}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{field.label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.hint}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
      />
    </div>
  );
}

function existingToValues(e: ExistingChart | null): Record<string, string> {
  if (!e) return {};
  const v: Record<string, string> = {};
  for (const k of [
    "skin_type",
    "allergies",
    "medical_history",
    "medications",
    "previous_treatments",
    "desired_design",
    "shop_assessment",
    "notes",
  ] as const) {
    if (e[k]) v[k] = e[k] as string;
  }
  return v;
}
