"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createServiceRecord } from "@/app/dashboard/customers/[id]/records/actions";

type ServiceLite = { id: string; name: string };
type StaffLite = { id: string; name: string; display_color: string };

type ExistingRecord = {
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

type Photo = { path: string; previewUrl: string };

export function ServiceRecordSection({
  bookingId,
  customerId,
  shopId,
  defaultServiceId,
  defaultStaffId,
  services,
  staff,
  existingRecords,
  signedUrls,
}: {
  bookingId: string;
  customerId: string;
  shopId: string;
  defaultServiceId: string | null;
  defaultStaffId: string | null;
  services: ServiceLite[];
  staff: StaffLite[];
  existingRecords: ExistingRecord[];
  signedUrls: Map<string, string>;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(existingRecords.length === 0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [beforePhotos, setBeforePhotos] = useState<Photo[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<Photo[]>([]);
  const [formula, setFormula] = useState("");
  const [techniques, setTechniques] = useState("");
  const [notes, setNotes] = useState("");
  const [serviceId, setServiceId] = useState(defaultServiceId ?? "");
  const [staffId, setStaffId] = useState(defaultStaffId ?? "");

  const reset = () => {
    setBeforePhotos([]);
    setAfterPhotos([]);
    setFormula("");
    setTechniques("");
    setNotes("");
    setError(null);
    setShowForm(false);
  };

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "before" | "after",
  ) => {
    const files = Array.from(e.currentTarget.files ?? []);
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    const supabase = createClient();
    const newPhotos: Photo[] = [];
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        setError(`${file.name}: 20MB 초과 — 스킵`);
        continue;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${shopId}/${customerId}/${Date.now()}-${kind}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("customer-photos")
        .upload(path, file, { contentType: file.type });
      if (upErr) {
        setError(`업로드 실패: ${upErr.message}`);
        continue;
      }
      newPhotos.push({ path, previewUrl: URL.createObjectURL(file) });
    }
    if (kind === "before") setBeforePhotos((p) => [...p, ...newPhotos]);
    else setAfterPhotos((p) => [...p, ...newPhotos]);
    setUploading(false);
    e.target.value = "";
  };

  const removePhoto = async (path: string, kind: "before" | "after") => {
    const supabase = createClient();
    await supabase.storage.from("customer-photos").remove([path]);
    if (kind === "before") setBeforePhotos((p) => p.filter((x) => x.path !== path));
    else setAfterPhotos((p) => p.filter((x) => x.path !== path));
  };

  const handleSave = () => {
    setError(null);
    if (uploading) {
      setError("사진 업로드가 끝날 때까지 기다려주세요.");
      return;
    }
    const fd = new FormData();
    fd.set("booking_id", bookingId);
    fd.set("service_id", serviceId);
    fd.set("staff_id", staffId);
    fd.set("formula", formula);
    fd.set("techniques", techniques);
    fd.set("notes", notes);
    fd.set("before_photo_urls", beforePhotos.map((p) => p.path).join(","));
    fd.set("after_photo_urls", afterPhotos.map((p) => p.path).join(","));
    startTransition(async () => {
      const r = await createServiceRecord(customerId, fd);
      if (r?.error) setError(r.error);
      else {
        reset();
        router.refresh();
      }
    });
  };

  return (
    <section className="rounded-lg border border-rose-gold-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          📷 시술 기록 (Before / After)
        </h3>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md bg-rose-gold-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-gold-700"
          >
            + 시술 기록 추가
          </button>
        )}
      </div>

      {/* 기존 기록 (이 예약과 연결된 것) */}
      {existingRecords.length > 0 && (
        <div className="mb-4 space-y-3">
          {existingRecords.map((r) => (
            <ExistingRecordView key={r.id} record={r} signedUrls={signedUrls} />
          ))}
        </div>
      )}

      {/* 새 기록 폼 */}
      {showForm && (
        <div className="space-y-3 border-t pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">시술</label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
              >
                <option value="">— 선택 —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">담당</label>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
              >
                <option value="">— 선택 —</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <PhotoSlot
            label="시술 전"
            photos={beforePhotos}
            onUpload={(e) => handleUpload(e, "before")}
            onRemove={(p) => removePhoto(p, "before")}
            uploading={uploading}
          />
          <PhotoSlot
            label="시술 후"
            photos={afterPhotos}
            onUpload={(e) => handleUpload(e, "after")}
            onRemove={(p) => removePhoto(p, "after")}
            uploading={uploading}
          />

          <input
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="배합 / 색조합 (예: 헤이즐 30% + 카키 20%, 니들 1RL)"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
          <input
            value={techniques}
            onChange={(e) => setTechniques(e.target.value)}
            placeholder="기법 (예: 옴브레 그라데이션, 마이크로블레이딩)"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="메모 (고객 반응, 다음 시술 계획, 주의사항)"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending || uploading}
              onClick={handleSave}
              className="rounded-md bg-rose-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-gold-700 disabled:opacity-50"
            >
              {isPending ? "저장 중..." : "기록 저장"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {!showForm && existingRecords.length === 0 && (
        <p className="rounded-md border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500">
          이 예약의 시술 기록 없음.
        </p>
      )}
    </section>
  );
}

function ExistingRecordView({
  record: r,
  signedUrls,
}: {
  record: ExistingRecord;
  signedUrls: Map<string, string>;
}) {
  return (
    <div className="rounded-md border bg-gray-50 p-3">
      <div className="mb-2 text-xs text-gray-600">
        {new Date(r.performed_at).toLocaleString("ko-KR")}
        {r.staff && (
          <span className="ml-2 inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: r.staff.display_color }}
            />
            {r.staff.name}
          </span>
        )}
      </div>
      <PhotoStrip label="전" paths={r.before_photo_urls} signedUrls={signedUrls} />
      <PhotoStrip label="후" paths={r.after_photo_urls} signedUrls={signedUrls} />
      {(r.formula || r.techniques || r.notes) && (
        <div className="mt-2 space-y-0.5 text-xs text-gray-700">
          {r.formula && <div><span className="text-gray-500">배합:</span> <span className="font-mono">{r.formula}</span></div>}
          {r.techniques && <div><span className="text-gray-500">기법:</span> {r.techniques}</div>}
          {r.notes && <div><span className="text-gray-500">메모:</span> {r.notes}</div>}
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
    <div className="mb-1 flex items-center gap-2">
      <span className="text-xs text-gray-500 w-6">{label}</span>
      <div className="flex flex-wrap gap-1">
        {paths.map((p) => {
          const url = signedUrls.get(p);
          return url ? (
            <a key={p} href={url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-16 w-16 rounded object-cover ring-1 ring-rose-gold-100"
              />
            </a>
          ) : (
            <div key={p} className="h-16 w-16 rounded bg-gray-100" />
          );
        })}
      </div>
    </div>
  );
}

function PhotoSlot({
  label,
  photos,
  onUpload,
  onRemove,
  uploading,
}: {
  label: string;
  photos: Photo[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (path: string) => void;
  uploading: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label} 사진</label>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={onUpload}
        disabled={uploading}
        className="block w-full text-xs text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-rose-gold-100 file:px-3 file:py-1.5 file:text-xs file:text-rose-gold-700 hover:file:bg-rose-gold-200 disabled:opacity-50"
      />
      {photos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {photos.map((p) => (
            <div key={p.path} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.previewUrl}
                alt=""
                className="h-16 w-16 rounded object-cover ring-1 ring-rose-gold-100"
              />
              <button
                type="button"
                onClick={() => onRemove(p.path)}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 text-[10px] text-white hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
