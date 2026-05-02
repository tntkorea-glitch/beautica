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
};

type CatStorage = {
  added: string[];   // 직접 추가한 커스텀 카테고리
  removed: string[]; // 삭제한 카테고리 (프리셋 포함)
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
  const [priceDisplay, setPriceDisplay] = useState(
    initial?.price_won != null ? initial.price_won.toLocaleString() : "",
  );
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
    if (result.error) {
      setPhotoError(result.error);
    } else if (result.url) {
      setPhotoUrl(result.url);
    }
    // reset file input
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  // 초기 칩 목록 계산 (localStorage + DB 카테고리 병합)
  const buildChips = (stored: CatStorage) => {
    const all: string[] = [];
    // 프리셋 (삭제된 것 제외)
    for (const p of BASE_PRESETS) {
      if (!stored.removed.includes(p)) all.push(p);
    }
    // DB에서 불러온 기존 카테고리 (삭제된 것 제외)
    for (const c of shopCategories) {
      if (!all.includes(c) && !stored.removed.includes(c)) all.push(c);
    }
    // 직접 추가한 카테고리
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

  // localStorage는 클라이언트에서만 접근 가능
  useEffect(() => {
    const s = loadStorage(shopId);
    setStored(s);
    setChips(buildChips(s));
    // 편집 시 현재 카테고리가 목록에 없으면 추가
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
    if (!val) { setShowInput(false); return; }
    const next: CatStorage = {
      added: stored.added.includes(val) ? stored.added : [...stored.added, val],
      removed: stored.removed.filter((r) => r !== val), // 삭제됐던 거면 복원
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

  const handleSubmit = (formData: FormData) => {
    formData.set("category", selected);
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
    <form action={handleSubmit} className="space-y-4">
      <Field
        label="시술명"
        name="name"
        required
        defaultValue={initial?.name ?? ""}
        placeholder="예: 베이직 헤어컷"
      />

      {/* 카테고리 칩 관리 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">카테고리</label>
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
              {/* hover 시 삭제 버튼 */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeChip(chip); }}
                title="카테고리 삭제"
                className="absolute -right-0.5 -top-0.5 hidden h-4 w-4 items-center justify-center rounded-full bg-gray-400 text-[10px] leading-none text-white hover:bg-red-500 group-hover:flex"
              >
                ×
              </button>
            </div>
          ))}

          {/* 직접 입력 */}
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
                  if (e.key === "Enter") { e.preventDefault(); addChip(); }
                  if (e.key === "Escape") { setShowInput(false); setCustomInput(""); }
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
                onClick={() => { setShowInput(false); setCustomInput(""); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                취소
              </button>
            </div>
          )}
        </div>

        {selected && (
          <p className="mt-1.5 text-xs text-gray-500">
            선택됨:{" "}
            <span className="rounded bg-rose-gold-50 px-1.5 py-0.5 font-medium text-rose-gold-700">
              {selected}
            </span>
            <button
              type="button"
              onClick={() => setSelected("")}
              className="ml-1.5 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </p>
        )}

        <input type="hidden" name="category" value={selected} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">가격 (원)</label>
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

      {/* 사진 업로드 */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">시술 사진 (선택)</label>
        {photoUrl ? (
          <div className="relative w-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt="시술 사진"
              className="h-28 w-40 rounded-lg object-cover border border-gray-200"
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
          <label className={`flex h-28 w-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400 hover:border-gray-400 hover:bg-gray-100 ${photoUploading ? "pointer-events-none opacity-60" : ""}`}>
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
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">설명 (선택)</label>
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
