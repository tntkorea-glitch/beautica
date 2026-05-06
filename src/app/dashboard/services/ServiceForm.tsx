"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useRef, useEffect } from "react";
import { uploadServicePhoto } from "./actions";

const BASE_PRESETS = [
  "헤어",
  "네일",
  "눈썹",
  "속눈썹",
  "피부",
  "에스테틱",
  "왁싱",
  "메이크업",
  "발관리",
  "기타",
];

type ServiceInitial = {
  name?: string;
  category?: string | null;
  price_won?: number;
  duration_min?: number;
  description?: string | null;
  is_active?: boolean;
  display_order?: number;
  photo_url?: string | null;
  price_note?: string | null;
  promotion_active?: boolean | null;
  promotion_price_won?: number | null;
  promotion_start_at?: string | null;
  promotion_end_at?: string | null;
};

type CatStorage = {
  added: string[];
  removed: string[];
};

function storageKey(shopId: string) {
  return `beautica_cats_${shopId}`;
}
function loadStorage(shopId: string): CatStorage {
  try {
    const raw = localStorage.getItem(storageKey(shopId));
    if (raw) return JSON.parse(raw) as CatStorage;
  } catch {}
  return { added: [], removed: [] };
}
function saveStorage(shopId: string, data: CatStorage) {
  try {
    localStorage.setItem(storageKey(shopId), JSON.stringify(data));
  } catch {}
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function plusMonth(date: string, months: number) {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(y, m - 1 + months, d);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

export function ServiceForm({
  initial,
  submit,
  submitLabel,
  onDelete,
  shopCategories = [],
  shopId = "",
}: {
  initial?: ServiceInitial;
  submit: (formData: FormData) => Promise<{ error?: string }>;
  submitLabel: string;
  onDelete?: () => Promise<{ error?: string }>;
  shopCategories?: string[];
  shopId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ── 가격
  const [priceDisplay, setPriceDisplay] = useState(
    initial?.price_won != null ? initial.price_won.toLocaleString() : "",
  );
  const [priceNote, setPriceNote] = useState(initial?.price_note ?? "");

  // ── 프로모션
  const [promoActive, setPromoActive] = useState(initial?.promotion_active ?? false);
  const [promoPrice, setPromoPrice] = useState(
    initial?.promotion_price_won != null
      ? initial.promotion_price_won.toLocaleString()
      : "",
  );
  const [promoStart, setPromoStart] = useState(
    initial?.promotion_start_at ?? todayStr(),
  );
  const [promoEnd, setPromoEnd] = useState(
    initial?.promotion_end_at ?? plusMonth(todayStr(), 1),
  );

  // ── 사진
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial?.photo_url ?? null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setPhotoError(null);
    const fd = new FormData();
    fd.append("file", file);
    const result = await uploadServicePhoto(fd);
    setPhotoUploading(false);
    if (result.error) setPhotoError(result.error);
    else if (result.url) setPhotoUrl(result.url);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  // ── 카테고리
  const buildChips = (stored: CatStorage) => {
    const all: string[] = [];
    for (const p of BASE_PRESETS) {
      if (!stored.removed.includes(p)) all.push(p);
    }
    for (const c of shopCategories) {
      if (!all.includes(c) && !stored.removed.includes(c)) all.push(c);
    }
    for (const a of stored.added) {
      if (!all.includes(a)) all.push(a);
    }
    return all;
  };

  const [stored, setStored] = useState<CatStorage>({ added: [], removed: [] });
  const [chips, setChips] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>(initial?.category?.trim() ?? "");
  const [customInput, setCustomInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = loadStorage(shopId);
    setStored(s);
    setChips(buildChips(s));
    const initCat = initial?.category?.trim() ?? "";
    if (initCat && !buildChips(s).includes(initCat)) {
      const next = { ...s, added: [...s.added, initCat] };
      saveStorage(shopId, next);
      setStored(next);
      setChips(buildChips(next));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const persistAndSet = (next: CatStorage) => {
    saveStorage(shopId, next);
    setStored(next);
    setChips(buildChips(next));
  };

  const addChip = () => {
    const val = customInput.trim();
    if (!val) {
      setShowInput(false);
      return;
    }
    const next: CatStorage = {
      added: stored.added.includes(val) ? stored.added : [...stored.added, val],
      removed: stored.removed.filter((r) => r !== val),
    };
    persistAndSet(next);
    setSelected(val);
    setCustomInput("");
    setShowInput(false);
  };

  const removeChip = (chip: string) => {
    const next: CatStorage = {
      added: stored.added.filter((a) => a !== chip),
      removed: stored.removed.includes(chip) ? stored.removed : [...stored.removed, chip],
    };
    persistAndSet(next);
    if (selected === chip) setSelected("");
  };

  // ── 소요시간 (시간/분 분리)
  const initDuration = initial?.duration_min ?? 60;
  const [durHour, setDurHour] = useState(Math.floor(initDuration / 60));
  const [durMin, setDurMin] = useState(initDuration % 60);

  const handleSubmit = (formData: FormData) => {
    formData.set("category", selected);
    formData.set("duration_min", String(durHour * 60 + durMin));
    if (photoUrl) formData.set("photo_url", photoUrl);
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
    <form action={handleSubmit} className="space-y-8">
      {/* ─────── 정보 ─────── */}
      <Section title="정보" required>
        <FieldRow label="카테고리">
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <div key={chip} className="group relative">
                <button
                  type="button"
                  onClick={() => setSelected(selected === chip ? "" : chip)}
                  className={`rounded-full border px-3 py-1.5 pr-6 text-sm font-medium transition ${
                    selected === chip
                      ? "border-rose-gold-400 bg-rose-gold-50 text-rose-gold-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                >
                  {chip}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeChip(chip);
                  }}
                  title="카테고리 삭제"
                  className="absolute -right-0.5 -top-0.5 hidden h-4 w-4 items-center justify-center rounded-full bg-gray-400 text-[10px] leading-none text-white hover:bg-red-500 group-hover:flex"
                >
                  ×
                </button>
              </div>
            ))}
            {!showInput ? (
              <button
                type="button"
                onClick={() => {
                  setShowInput(true);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-gray-400 hover:bg-gray-50"
              >
                + 직접 입력
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addChip();
                    }
                    if (e.key === "Escape") {
                      setShowInput(false);
                      setCustomInput("");
                    }
                  }}
                  placeholder="카테고리명"
                  className="w-28 rounded-full border border-rose-gold-300 px-3 py-1.5 text-sm outline-none focus:border-rose-gold-400"
                />
                <button
                  type="button"
                  onClick={addChip}
                  className="rounded-full bg-rose-gold-100 px-2.5 py-1.5 text-xs font-semibold text-rose-gold-700 hover:bg-rose-gold-200"
                >
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInput(false);
                    setCustomInput("");
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  취소
                </button>
              </div>
            )}
          </div>
        </FieldRow>

        <FieldRow label="시술명" required>
          <input
            type="text"
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            placeholder="예: 베이직 헤어컷"
            maxLength={30}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-rose-gold-400 focus:outline-none"
          />
        </FieldRow>

        <FieldRow label="소요시간">
          <div className="flex items-center gap-2 text-sm">
            <input
              type="number"
              min={0}
              max={12}
              value={durHour}
              onChange={(e) =>
                setDurHour(Math.max(0, Math.min(12, Number(e.target.value) || 0)))
              }
              className="w-16 rounded-md border border-gray-300 px-2 py-2 text-center text-sm focus:border-rose-gold-400 focus:outline-none"
            />
            <span className="text-gray-500">시간</span>
            <input
              type="number"
              min={0}
              max={59}
              step={5}
              value={durMin}
              onChange={(e) =>
                setDurMin(Math.max(0, Math.min(59, Number(e.target.value) || 0)))
              }
              className="w-16 rounded-md border border-gray-300 px-2 py-2 text-center text-sm focus:border-rose-gold-400 focus:outline-none"
            />
            <span className="text-gray-500">분 소요</span>
          </div>
        </FieldRow>

        <FieldRow label="시술 설명">
          <textarea
            name="description"
            defaultValue={initial?.description ?? ""}
            rows={3}
            placeholder="시술 설명, 포함 항목 등"
            maxLength={300}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-rose-gold-400 focus:outline-none"
          />
        </FieldRow>

        <FieldRow label="시술 사진">
          {photoUrl ? (
            <div className="relative w-40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt="시술 사진"
                className="h-28 w-40 rounded-lg border border-gray-200 object-cover"
              />
              <button
                type="button"
                onClick={() => setPhotoUrl(null)}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-600 text-[11px] text-white hover:bg-red-500"
                title="사진 삭제"
              >
                ×
              </button>
            </div>
          ) : (
            <label
              className={`flex h-28 w-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400 hover:border-gray-400 hover:bg-gray-100 ${
                photoUploading ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {photoUploading ? (
                <span>업로드 중...</span>
              ) : (
                <>
                  <span className="text-2xl">📷</span>
                  <span className="mt-1">사진 추가</span>
                  <span className="mt-0.5 text-[10px]">JPG·PNG·WebP · 5MB 이하</span>
                </>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </label>
          )}
          {photoError && <p className="mt-1 text-xs text-red-500">{photoError}</p>}
        </FieldRow>
      </Section>

      {/* ─────── 가격 ─────── */}
      <Section title="가격" required>
        <FieldRow label="정가" required>
          <div className="flex items-center gap-2">
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
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-rose-gold-400 focus:outline-none"
            />
            <span className="shrink-0 text-sm text-gray-500">원</span>
          </div>
        </FieldRow>

        <FieldRow label="가격 부가설명">
          <textarea
            name="price_note"
            value={priceNote}
            onChange={(e) => setPriceNote(e.target.value)}
            rows={2}
            placeholder="예: 1인 기준 / 길이 추가비 별도"
            maxLength={96}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-rose-gold-400 focus:outline-none"
          />
          <p className="mt-1 text-right text-xs text-gray-400">{priceNote.length} / 96자</p>
        </FieldRow>
      </Section>

      {/* ─────── 프로모션 ─────── */}
      <Section
        title="프로모션"
        toggle={
          <Toggle
            checked={promoActive}
            onChange={setPromoActive}
            name="promotion_active"
          />
        }
      >
        {!promoActive ? (
          <p className="text-xs text-gray-400">
            토글을 켜면 프로모션 가격과 적용 기간을 설정할 수 있어요.
          </p>
        ) : (
          <>
            <FieldRow label="프로모션 가격" required>
              <div className="flex items-center gap-2">
                <input
                  name="promotion_price_won"
                  inputMode="numeric"
                  value={promoPrice}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setPromoPrice(digits ? Number(digits).toLocaleString() : "");
                  }}
                  placeholder="할인된 가격"
                  className="block w-full rounded-md border border-rose-gold-300 px-3 py-2 text-sm focus:border-rose-gold-500 focus:outline-none"
                />
                <span className="shrink-0 text-sm text-gray-500">원</span>
              </div>
              {priceDisplay && promoPrice && (
                <p className="mt-1 text-xs text-rose-gold-700">
                  {Number(priceDisplay.replace(/,/g, "")) > Number(promoPrice.replace(/,/g, ""))
                    ? `${Math.round(
                        ((Number(priceDisplay.replace(/,/g, "")) -
                          Number(promoPrice.replace(/,/g, ""))) /
                          Number(priceDisplay.replace(/,/g, ""))) *
                          100,
                      )}% 할인`
                    : "프로모션가가 정가보다 낮아야 합니다."}
                </p>
              )}
            </FieldRow>

            <FieldRow label="적용 기간">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="date"
                  name="promotion_start_at"
                  value={promoStart}
                  onChange={(e) => setPromoStart(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-rose-gold-400 focus:outline-none"
                />
                <span className="text-xs text-gray-400">→</span>
                <input
                  type="date"
                  name="promotion_end_at"
                  value={promoEnd}
                  min={promoStart}
                  onChange={(e) => setPromoEnd(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-rose-gold-400 focus:outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                기간이 지나면 자동으로 정가로 돌아갑니다.
              </p>
            </FieldRow>
          </>
        )}
      </Section>

      {/* ─────── 공개 설정 ─────── */}
      <Section title="공개 설정">
        <FieldRow label="표시 순서">
          <input
            type="number"
            name="display_order"
            defaultValue={String(initial?.display_order ?? 0)}
            className="block w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-rose-gold-400 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">0이 가장 위. 같은 값이면 최근 등록 순.</p>
        </FieldRow>

        <FieldRow label="공개">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={initial?.is_active ?? true}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span>공개 (체크 해제 시 예약 페이지에 노출되지 않음)</span>
          </label>
        </FieldRow>
      </Section>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      <div className="flex items-center justify-between border-t pt-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard/services")}
            className="rounded-md border border-gray-300 px-5 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
          >
            {isPending ? "저장 중..." : submitLabel}
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

function Section({
  title,
  required,
  toggle,
  children,
}: {
  title: string;
  required?: boolean;
  toggle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-gray-100 pb-6 last:border-b-0">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <div className="flex items-center gap-3">
          {required && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <span className="text-emerald-500">✓</span> 필수입력
            </span>
          )}
          {toggle}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function FieldRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-gray-700">
        {required && <span className="text-emerald-500">✓</span>}
        {label}
      </label>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  name,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  name?: string;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-sm font-medium text-emerald-600">{checked ? "설정" : "미설정"}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "bg-emerald-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
      {name && (
        <input
          type="checkbox"
          name={name}
          checked={checked}
          readOnly
          className="hidden"
        />
      )}
    </label>
  );
}
