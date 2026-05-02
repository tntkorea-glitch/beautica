"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteServiceRecord } from "./actions";
import { formatKSTFullDate, formatKSTTime } from "@/lib/format";

type Record = {
  id: string;
  performed_at: string;
  formula: string | null;
  techniques: string | null;
  notes: string | null;
  before_photo_urls: string[];
  after_photo_urls: string[];
  staff: { name: string; display_color: string } | null;
  service: { name: string } | null;
};

export function RecordCard({
  customerId,
  record: r,
  signedUrls,
}: {
  customerId: string;
  record: Record;
  signedUrls: Map<string, string>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("이 시술 기록을 삭제하시겠어요? 사진도 함께 사라집니다.")) return;
    startTransition(async () => {
      await deleteServiceRecord(customerId, r.id);
      router.refresh();
    });
  };

  return (
    <div className="rounded-lg border border-rose-gold-100 bg-white p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <span className="text-base font-semibold text-gray-900">
            {formatKSTFullDate(r.performed_at)}
          </span>
          <span className="ml-2 text-sm text-gray-500">
            {formatKSTTime(r.performed_at)}
          </span>
          {r.service && (
            <>
              <span className="mx-2 text-gray-300">|</span>
              <span className="text-sm text-gray-700">{r.service.name}</span>
            </>
          )}
          {r.staff && (
            <span className="ml-3 inline-flex items-center gap-1 text-xs text-gray-600">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: r.staff.display_color }}
              />
              {r.staff.name}
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={handleDelete}
          className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
        >
          삭제
        </button>
      </div>

      <PhotoStrip
        label="시술 전"
        paths={r.before_photo_urls}
        signedUrls={signedUrls}
      />
      <PhotoStrip
        label="시술 후"
        paths={r.after_photo_urls}
        signedUrls={signedUrls}
      />

      {(r.formula || r.techniques || r.notes) && (
        <div className="mt-3 space-y-1 rounded-md bg-gray-50 p-3 text-sm">
          {r.formula && <Detail label="배합" value={r.formula} mono />}
          {r.techniques && <Detail label="기법" value={r.techniques} />}
          {r.notes && <Detail label="메모" value={r.notes} />}
        </div>
      )}
    </div>
  );
}

function PhotoStrip({
  label,
  paths,
  signedUrls,
}: {
  label: string;
  paths: string[];
  signedUrls: Map<string, string>;
}) {
  if (!paths || paths.length === 0) return null;
  return (
    <div className="mb-2">
      <div className="mb-1 text-xs font-medium text-gray-500">{label}</div>
      <div className="flex flex-wrap gap-2">
        {paths.map((p) => {
          const url = signedUrls.get(p);
          return url ? (
            <a key={p} href={url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-24 w-24 rounded-md object-cover ring-1 ring-rose-gold-100"
              />
            </a>
          ) : (
            <div
              key={p}
              className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed text-xs text-gray-400"
            >
              ?
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex">
      <span className="w-12 shrink-0 text-xs text-gray-500">{label}</span>
      <span className={`text-sm text-gray-800 ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
