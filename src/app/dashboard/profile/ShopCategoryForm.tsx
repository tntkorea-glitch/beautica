"use client";

import { useState, useTransition } from "react";
import { BASE_CATEGORY_PRESETS } from "@/lib/categories";
import { updateShopCategories } from "./actions";

export function ShopCategoryForm({
  initial,
}: {
  initial: string[] | null; // null = 첫 진입 (전체 표시 중)
}) {
  const [isPending, startTransition] = useTransition();
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 첫 진입(NULL)이면 전체 프리셋이 노출되고 있는 셈이므로 전체 체크 상태로 시작
  const initSet =
    initial === null ? new Set<string>(BASE_CATEGORY_PRESETS) : new Set<string>(initial);
  const [checked, setChecked] = useState<Set<string>>(initSet);

  function toggle(cat: string) {
    setSavedMsg(null);
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function selectAll() {
    setSavedMsg(null);
    setChecked(new Set(BASE_CATEGORY_PRESETS));
  }
  function selectNone() {
    setSavedMsg(null);
    setChecked(new Set());
  }

  function save() {
    setError(null);
    setSavedMsg(null);
    startTransition(async () => {
      const r = await updateShopCategories(Array.from(checked));
      if (r.error) setError(r.error);
      else setSavedMsg("저장되었습니다.");
    });
  }

  return (
    <div>
      <p className="mb-3 text-sm text-gray-500">
        시술 메뉴를 등록할 때 카테고리 칩에 노출할 항목을 선택하세요. 체크하지 않은
        카테고리는 등록 화면에 보이지 않습니다.
      </p>

      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={selectAll}
          className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          전체 선택
        </button>
        <button
          type="button"
          onClick={selectNone}
          className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          전체 해제
        </button>
        <span className="ml-auto text-xs text-gray-400">
          {checked.size} / {BASE_CATEGORY_PRESETS.length} 선택됨
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BASE_CATEGORY_PRESETS.map((cat) => {
          const on = checked.has(cat);
          return (
            <label
              key={cat}
              className={
                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition " +
                (on
                  ? "border-rose-gold-300 bg-rose-gold-50 text-rose-gold-800"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50")
              }
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(cat)}
                className="h-4 w-4 rounded border-gray-300 accent-rose-500"
              />
              <span>{cat}</span>
            </label>
          );
        })}
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}
      {savedMsg && (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {savedMsg}
        </p>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
