"use client";

import { useState, useTransition } from "react";
import { upsertProfile, requestAccountDeletion, cancelAccountDeletion } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { formatKST, formatPhone } from "@/lib/format";

type NotificationChannels = { email: boolean; kakao: boolean; push: boolean };
type NotificationTypes = {
  booking: boolean;
  consultation: boolean;
  upgrade: boolean;
  order: boolean;
};

type ImageState =
  | { status: "idle"; path: string | null; previewUrl: string | null }
  | { status: "uploading" }
  | { status: "uploaded"; path: string; previewUrl: string }
  | { status: "error"; message: string; path: string | null; previewUrl: string | null };

export function ProfileForm({
  userId,
  email,
  joinedAt,
  identityProviders,
  initial,
}: {
  userId: string;
  email: string;
  joinedAt: string;
  identityProviders: string[];
  initial: {
    displayName: string;
    personalPhone: string;
    profileImagePath: string | null;
    profileImageUrl: string | null;
    notificationChannels: NotificationChannels;
    notificationTypes: NotificationTypes;
    deletionRequestedAt: string | null;
    deletionReason: string | null;
  };
}) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [personalPhone, setPersonalPhone] = useState(initial.personalPhone);
  const [channels, setChannels] = useState<NotificationChannels>(initial.notificationChannels);
  const [types, setTypes] = useState<NotificationTypes>(initial.notificationTypes);
  const [image, setImage] = useState<ImageState>({
    status: "idle",
    path: initial.profileImagePath,
    previewUrl: initial.profileImageUrl,
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [deletionReason, setDeletionReason] = useState(initial.deletionReason ?? "");
  const [deletionPending, setDeletionPending] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setImage((prev) => {
        const prevPath =
          prev.status === "idle" || prev.status === "error"
            ? prev.path
            : prev.status === "uploaded"
            ? prev.path
            : null;
        const prevUrl =
          prev.status === "idle" || prev.status === "error"
            ? prev.previewUrl
            : prev.status === "uploaded"
            ? prev.previewUrl
            : null;
        return {
          status: "error",
          message: "5MB 이하 이미지만 가능합니다.",
          path: prevPath,
          previewUrl: prevUrl,
        };
      });
      return;
    }

    setImage({ status: "uploading" });
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("profile-images")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      setImage({
        status: "error",
        message: `업로드 실패: ${error.message}`,
        path: null,
        previewUrl: null,
      });
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setImage({ status: "uploaded", path, previewUrl });
  };

  const handleSave = () => {
    setSaveError(null);
    setSavedAt(null);
    if (image.status === "uploading") {
      setSaveError("이미지 업로드가 끝날 때까지 기다려주세요.");
      return;
    }
    startTransition(async () => {
      const path =
        image.status === "uploaded"
          ? image.path
          : image.status === "idle" || image.status === "error"
          ? image.path
          : null;
      const res = await upsertProfile({
        displayName,
        personalPhone,
        profileImagePath: path,
        notificationChannels: channels,
        notificationTypes: types,
      });
      if (res.error) setSaveError(res.error);
      else setSavedAt(new Date().toLocaleTimeString("ko-KR"));
    });
  };

  const handleRequestDeletion = async () => {
    if (!window.confirm("정말 탈퇴를 신청하시겠습니까?\n관리자 검토 후 매장 데이터와 함께 처리됩니다.")) return;
    setDeletionPending(true);
    setDeletionError(null);
    const res = await requestAccountDeletion(deletionReason);
    setDeletionPending(false);
    if (res.error) setDeletionError(res.error);
    else window.location.reload();
  };

  const handleCancelDeletion = async () => {
    setDeletionPending(true);
    setDeletionError(null);
    const res = await cancelAccountDeletion();
    setDeletionPending(false);
    if (res.error) setDeletionError(res.error);
    else window.location.reload();
  };

  const previewSrc =
    image.status === "uploaded" || image.status === "idle" || image.status === "error"
      ? image.previewUrl
      : null;

  const deletionPending2 = !!initial.deletionRequestedAt;

  return (
    <div className="space-y-8">
      {/* 1. 계정 */}
      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">계정</h2>
        <div className="grid gap-5 md:grid-cols-[120px_1fr] md:items-start">
          {/* 프로필 사진 */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-24 w-24 overflow-hidden rounded-full border bg-gray-100">
              {previewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewSrc} alt="profile" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl text-gray-400">
                  {(displayName || email).slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <label className="cursor-pointer text-xs text-blue-600 hover:underline">
              {image.status === "uploading" ? "업로드 중…" : "사진 변경"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
                disabled={image.status === "uploading"}
              />
            </label>
            {image.status === "error" && (
              <span className="text-[10px] text-red-600">{image.message}</span>
            )}
          </div>

          {/* 입력 필드 */}
          <div className="grid gap-3">
            <Field label="이름">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="홍길동"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
            </Field>
            <Field label="이메일">
              <input
                type="text"
                value={email}
                disabled
                className="w-full cursor-not-allowed rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
              />
            </Field>
            <Field label="개인 휴대폰">
              <input
                type="tel"
                value={personalPhone}
                onChange={(e) => setPersonalPhone(formatPhone(e.target.value))}
                placeholder="010-0000-0000"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                매장 대표번호와 별개로, 본인 알림 수신용.
              </p>
            </Field>
          </div>
        </div>
      </section>

      {/* 2. 알림 설정 */}
      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-gray-900">알림 설정</h2>
        <p className="mb-4 text-xs text-gray-500">
          실 발송은 Phase 3 부터 적용됩니다. 지금은 설정만 저장.
        </p>
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-xs font-medium text-gray-700">채널</h3>
            <div className="flex flex-wrap gap-2">
              <Toggle
                label="이메일"
                checked={channels.email}
                onChange={(v) => setChannels({ ...channels, email: v })}
              />
              <Toggle
                label="카카오"
                checked={channels.kakao}
                onChange={(v) => setChannels({ ...channels, kakao: v })}
              />
              <Toggle
                label="웹푸시"
                checked={channels.push}
                onChange={(v) => setChannels({ ...channels, push: v })}
              />
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium text-gray-700">알림 종류</h3>
            <div className="flex flex-wrap gap-2">
              <Toggle
                label="예약"
                checked={types.booking}
                onChange={(v) => setTypes({ ...types, booking: v })}
              />
              <Toggle
                label="상담"
                checked={types.consultation}
                onChange={(v) => setTypes({ ...types, consultation: v })}
              />
              <Toggle
                label="등업"
                checked={types.upgrade}
                onChange={(v) => setTypes({ ...types, upgrade: v })}
              />
              <Toggle
                label="주문"
                checked={types.order}
                onChange={(v) => setTypes({ ...types, order: v })}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 저장 */}
      <div className="flex items-center justify-end gap-3">
        {saveError && <span className="text-xs text-red-600">{saveError}</span>}
        {savedAt && !saveError && (
          <span className="text-xs text-green-700">저장됨 ({savedAt})</span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || image.status === "uploading"}
          className="rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
      </div>

      {/* 3. 계정 관리 */}
      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">계정 관리</h2>
        <dl className="space-y-2 text-sm">
          <Row label="가입일" value={formatKST(joinedAt, false)} />
          <Row
            label="연결 계정"
            value={
              identityProviders.length > 0
                ? identityProviders.map((p) => providerLabel(p)).join(", ")
                : "—"
            }
          />
        </dl>

        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-semibold text-red-900">회원 탈퇴</h3>
          {deletionPending2 ? (
            <>
              <p className="mt-1 text-xs text-red-700">
                탈퇴 신청 접수됨 ({formatKST(initial.deletionRequestedAt!)}).
                관리자 검토 후 매장 데이터와 함께 처리됩니다.
              </p>
              {initial.deletionReason && (
                <p className="mt-1 text-xs text-red-700">사유: {initial.deletionReason}</p>
              )}
              <button
                type="button"
                onClick={handleCancelDeletion}
                disabled={deletionPending}
                className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                {deletionPending ? "처리 중…" : "탈퇴 신청 취소"}
              </button>
            </>
          ) : (
            <>
              <p className="mt-1 text-xs text-red-700">
                탈퇴 신청은 관리자 검토 후 처리됩니다. 매장 데이터(고객/예약/주문 등)는 즉시 삭제되지 않으며 별도 안내됩니다.
              </p>
              <textarea
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="(선택) 탈퇴 사유"
                rows={2}
                className="mt-3 w-full rounded-md border border-red-200 bg-white px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={handleRequestDeletion}
                disabled={deletionPending}
                className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletionPending ? "처리 중…" : "탈퇴 신청"}
              </button>
            </>
          )}
          {deletionError && (
            <p className="mt-2 text-xs text-red-700">{deletionError}</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={
        checked
          ? "rounded-full border border-gray-900 bg-gray-900 px-3 py-1 text-xs font-medium text-white"
          : "rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:border-gray-500"
      }
      aria-pressed={checked}
    >
      {label}
    </button>
  );
}

function providerLabel(p: string): string {
  return ({ google: "Google", kakao: "Kakao", naver: "Naver", email: "이메일/비밀번호" } as Record<
    string,
    string
  >)[p] ?? p;
}
