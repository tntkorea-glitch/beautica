"use client";

import { useEffect, useRef, useState } from "react";
import { searchCustomers, type CustomerHit } from "./actions";

export function CustomerSearchInput({
  selected,
  onSelect,
  onClear,
}: {
  selected: CustomerHit | null;
  onSelect: (c: CustomerHit) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerHit[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (v: string) => {
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    if (!v.trim()) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const hits = await searchCustomers(v);
      setResults(hits);
      setOpen(true);
    }, 280);
  };

  const pick = (c: CustomerHit) => {
    onSelect(c);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  if (selected) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-rose-gold-200 bg-rose-gold-50 px-3 py-2 text-sm">
        <span className="text-rose-gold-600">👤</span>
        <span className="font-semibold text-rose-gold-800">{selected.name}</span>
        {selected.phone && <span className="text-xs text-rose-gold-500">{selected.phone}</span>}
        <button
          type="button"
          onClick={onClear}
          className="ml-auto text-xs text-gray-400 hover:text-gray-700"
        >
          ✕ 변경
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => query && setOpen(true)}
        placeholder="고객 이름으로 검색..."
        className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-rose-gold-300 focus:outline-none"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => pick(c)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-rose-gold-50"
              >
                <span className="font-medium text-gray-900">{c.name}</span>
                {c.phone && <span className="text-xs text-gray-400">{c.phone}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400 shadow-lg">
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  );
}
