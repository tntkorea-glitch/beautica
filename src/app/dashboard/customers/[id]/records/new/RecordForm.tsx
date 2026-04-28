"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { createServiceRecord } from "../actions";

type ServiceLite = { id: string; name: string };
type StaffLite = { id: string; name: string };

type Photo = { path: string; previewUrl: string };

export function RecordForm({
  shopId,
  customerId,
  services,
  staff,
}: {
  shopId: string;
  customerId: string;
  services: ServiceLite[];
  staff: StaffLite[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [beforePhotos, setBeforePhotos] = useState<Photo[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<Photo[]>([]);

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
      const previewUrl = URL.createObjectURL(file);
      newPhotos.push({ path, previewUrl });
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

  const handleSubmit = (formData: FormData) => {
    setError(null);
    if (uploading) {
      setError("사진 업로드가 끝날 때까지 기다려주세요.");
      return;
    }
    formData.set("before_photo_urls", beforePhotos.map((p) => p.path).join(","));
    formData.set("after_photo_urls", afterPhotos.map((p) => p.path).join(","));
    startTransition(async () => {
      const r = await createServiceRecord(customerId, formData);
      if (r?.error) setError(r.error);
      else router.push(`/dashboard/customers/${customerId}/records`);
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">시술</label>
          <select
            name="service_id"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          >
            <option value="">— 선택 —</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">담당</label>
          <select
            name="staff_id"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          >
            <option value="">— 선택 —</option>
            {staff.map((st) => (
              <option key={st.id} value={st.id}>{st.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">시술 일시</label>
        <input
          type="datetime-local"
          name="performed_at"
          defaultValue={defaultNow()}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      {/* 시술 전 사진 */}
      <PhotoSection
        label="시술 전 사진"
        photos={beforePhotos}
        onUpload={(e) => handleUpload(e, "before")}
        onRemove={(p) => removePhoto(p, "before")}
        uploading={uploading}
      />

      {/* 시술 후 사진 */}
      <PhotoSection
        label="시술 후 사진"
        photos={afterPhotos}
        onUpload={(e) => handleUpload(e, "after")}
        onRemove={(p) => removePhoto(p, "after")}
        uploading={uploading}
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          배합 / 색조합 (선택)
        </label>
        <input
          name="formula"
          placeholder="예: 헤이즐 30% + 카키 20%, 니들 1RL"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-500">
          반영구/염색 시 다음 시술 재현용. 자유 형식.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          기법 (선택)
        </label>
        <input
          name="techniques"
          placeholder="예: 옴브레 → 그라데이션, 마이크로블레이딩"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">메모 (선택)</label>
        <textarea
          name="notes"
          rows={3}
          placeholder="고객 반응, 다음 시술 계획, 주의사항 등"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending || uploading}
          className="rounded-md bg-rose-gold-600 px-5 py-2 text-sm font-medium text-white hover:bg-rose-gold-700 disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "기록 저장"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/customers/${customerId}/records`)}
          className="rounded-md border border-gray-300 px-5 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          취소
        </button>
      </div>
    </form>
  );
}

function PhotoSection({
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
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={onUpload}
        disabled={uploading}
        className="block w-full text-xs text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-rose-gold-100 file:px-3 file:py-2 file:text-xs file:text-rose-gold-700 hover:file:bg-rose-gold-200 disabled:opacity-50"
      />
      {photos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {photos.map((p) => (
            <div key={p.path} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.previewUrl}
                alt=""
                className="h-20 w-20 rounded-md object-cover ring-1 ring-rose-gold-100"
              />
              <button
                type="button"
                onClick={() => onRemove(p.path)}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-xs text-white hover:bg-red-600"
                title="삭제"
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

function defaultNow() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
