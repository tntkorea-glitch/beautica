"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_CONSENT_TEMPLATES,
  getDefaultTemplate,
} from "@/lib/consent-templates";
import { SignaturePad } from "./SignaturePad";
import {
  saveConsentForm,
  issueRemoteConsent,
  revokeRemoteConsent,
} from "@/app/dashboard/bookings/[id]/consent-actions";
import { formatKST } from "@/lib/format";

type ExistingConsent = {
  id: string;
  signed_at: string | null;
  signer_name: string | null;
  signature_url: string | null;
  signature_method: string | null;
  template_id: string;
  signature_token: string | null;
  token_expires_at: string | null;
};

export function ConsentSection({
  bookingId,
  customerId,
  shopId,
  customerName,
  existingConsents,
  signedUrls,
}: {
  bookingId: string;
  customerId: string;
  shopId: string;
  customerName: string;
  existingConsents: ExistingConsent[];
  signedUrls: Map<string, string>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(existingConsents.length === 0);
  const [mode, setMode] = useState<"IN_STORE" | "REMOTE_LINK">("IN_STORE");
  const [templateKey, setTemplateKey] = useState(DEFAULT_CONSENT_TEMPLATES[0].key);
  const [signerName, setSignerName] = useState(customerName);
  const [signaturePath, setSignaturePath] = useState<string | null>(null);
  const [savingSig, setSavingSig] = useState(false);
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<Record<string, "idle" | "copied">>({});

  const tmpl = getDefaultTemplate(templateKey);

  const buildSignUrl = (token: string) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/consent/sign/${token}`
      : `/consent/sign/${token}`;

  const copyUrl = async (token: string, key: string) => {
    try {
      await navigator.clipboard.writeText(buildSignUrl(token));
      setCopyState((s) => ({ ...s, [key]: "copied" }));
      setTimeout(() => setCopyState((s) => ({ ...s, [key]: "idle" })), 1500);
    } catch {
      window.prompt("아래 URL 을 복사해주세요", buildSignUrl(token));
    }
  };

  const handleIssueRemote = () => {
    setError(null);
    if (!signerName.trim()) {
      setError("서명자 이름을 먼저 입력해주세요.");
      return;
    }
    startTransition(async () => {
      const r = await issueRemoteConsent({
        bookingId,
        customerId,
        templateKey,
        signerName,
      });
      if (r.error) {
        setError(r.error);
        return;
      }
      if (r.token) {
        setIssuedToken(r.token);
        setShowForm(false);
        router.refresh();
      }
    });
  };

  const handleRevokeRemote = (consentId: string) => {
    if (!confirm("이 모바일 링크를 취소하시겠습니까? 기존 URL 은 무효화됩니다.")) return;
    startTransition(async () => {
      const r = await revokeRemoteConsent({ bookingId, consentId });
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  };

  const handleSignature = async (blob: Blob) => {
    setError(null);
    setSavingSig(true);
    const supabase = createClient();
    const path = `${shopId}/${customerId}/signatures/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.png`;
    const { error: upErr } = await supabase.storage
      .from("customer-photos")
      .upload(path, blob, { contentType: "image/png" });
    if (upErr) {
      setError(`서명 업로드 실패: ${upErr.message}`);
      setSavingSig(false);
      return;
    }
    setSignaturePath(path);
    setSavingSig(false);
  };

  const handleSubmit = () => {
    setError(null);
    if (!signaturePath) {
      setError("서명을 먼저 저장해주세요.");
      return;
    }
    if (!signerName.trim()) {
      setError("서명자 이름을 입력해주세요.");
      return;
    }
    startTransition(async () => {
      const r = await saveConsentForm({
        bookingId,
        customerId,
        templateKey,
        signerName,
        signaturePath,
      });
      if (r?.error) {
        setError(r.error);
        return;
      }
      // 폼 리셋 + 새로고침
      setSignaturePath(null);
      setShowForm(false);
      router.refresh();
    });
  };

  return (
    <section className="rounded-lg border border-rose-gold-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">✍️ 동의서</h3>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md bg-rose-gold-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-gold-700"
          >
            + 동의서 받기
          </button>
        )}
      </div>

      {/* 기존 동의서 목록 */}
      {existingConsents.length > 0 && (
        <div className="mb-4 space-y-2">
          {existingConsents.map((c) => {
            const sigUrl = c.signature_url ? signedUrls.get(c.signature_url) : null;
            const isPendingRemote =
              c.signature_method === "REMOTE_LINK" && !c.signed_at && c.signature_token;
            const expired =
              c.token_expires_at && new Date(c.token_expires_at).getTime() < Date.now();
            return (
              <div
                key={c.id}
                className="rounded-md border bg-gray-50 p-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{c.signed_at ? "✅" : isPendingRemote ? "📱" : "⏳"}</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {c.signer_name ?? "(서명자명 없음)"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {c.signed_at ? formatKST(c.signed_at) : "미서명"}
                      {" · "}
                      {c.signature_method === "IN_STORE" ? "매장 직접" : "모바일 링크"}
                      {isPendingRemote && expired && " · 링크 만료"}
                    </div>
                  </div>
                  {sigUrl && (
                    <a href={sigUrl} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sigUrl}
                        alt="서명"
                        className="h-12 w-24 rounded border bg-white object-contain"
                      />
                    </a>
                  )}
                </div>

                {isPendingRemote && c.signature_token && !expired && (
                  <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs">
                    <div className="mb-1 text-blue-900">
                      📲 고객에게 이 링크를 보내주세요. 서명 시 자동 반영됩니다.
                      {c.token_expires_at && (
                        <span className="ml-1 text-blue-700">
                          (만료: {formatKST(c.token_expires_at, false)})
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={buildSignUrl(c.signature_token)}
                        className="flex-1 rounded border border-blue-200 bg-white px-2 py-1 font-mono text-[11px] text-gray-700"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <button
                        type="button"
                        onClick={() => copyUrl(c.signature_token!, c.id)}
                        className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        {copyState[c.id] === "copied" ? "복사됨" : "URL 복사"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevokeRemote(c.id)}
                        className="rounded border border-red-300 bg-white px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 새 동의서 받기 */}
      {showForm && (
        <div className="space-y-3 border-t pt-4">
          {/* 발급 방식 토글 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              서명 방식
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("IN_STORE")}
                className={
                  mode === "IN_STORE"
                    ? "rounded-md bg-rose-gold-600 px-3 py-1.5 text-xs font-medium text-white"
                    : "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                }
              >
                매장에서 직접 서명
              </button>
              <button
                type="button"
                onClick={() => setMode("REMOTE_LINK")}
                className={
                  mode === "REMOTE_LINK"
                    ? "rounded-md bg-rose-gold-600 px-3 py-1.5 text-xs font-medium text-white"
                    : "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                }
              >
                모바일 링크로 받기
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              동의서 종류
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_CONSENT_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTemplateKey(t.key)}
                  className={
                    templateKey === t.key
                      ? "rounded-full bg-rose-gold-600 px-3 py-1.5 text-xs font-medium text-white"
                      : "rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  }
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* 동의서 본문 */}
          <div className="max-h-48 overflow-y-auto rounded-md border bg-gray-50 p-3 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
            {tmpl.content}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              서명자 이름
            </label>
            <input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="고객 이름"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>

          {mode === "IN_STORE" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                서명 (직접)
              </label>
              {!signaturePath ? (
                <SignaturePad onSave={handleSignature} disabled={savingSig} />
              ) : (
                <div className="rounded-md border bg-green-50 p-3 text-sm text-green-700">
                  ✅ 서명 저장 완료. 아래 &quot;동의서 등록&quot; 버튼으로 마무리하세요.
                  <button
                    type="button"
                    onClick={() => setSignaturePath(null)}
                    className="ml-2 text-xs text-green-600 underline"
                  >
                    다시 서명
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === "REMOTE_LINK" && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
              발급 후 표시되는 URL 을 SMS/카카오톡으로 고객에게 보내주세요. 고객이 모바일에서 서명하면
              자동으로 반영됩니다. 링크 유효기간은 7일.
              {issuedToken && (
                <div className="mt-3 flex gap-2">
                  <input
                    readOnly
                    value={buildSignUrl(issuedToken)}
                    className="flex-1 rounded border border-blue-200 bg-white px-2 py-1 font-mono text-[11px] text-gray-700"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button
                    type="button"
                    onClick={() => copyUrl(issuedToken, "fresh")}
                    className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    {copyState["fresh"] === "copied" ? "복사됨" : "URL 복사"}
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            {mode === "IN_STORE" ? (
              <button
                type="button"
                disabled={isPending || !signaturePath || savingSig}
                onClick={handleSubmit}
                className="rounded-md bg-rose-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-gold-700 disabled:opacity-50"
              >
                {isPending ? "등록 중..." : "동의서 등록"}
              </button>
            ) : (
              <button
                type="button"
                disabled={isPending || !!issuedToken}
                onClick={handleIssueRemote}
                className="rounded-md bg-rose-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-gold-700 disabled:opacity-50"
              >
                {isPending ? "발급 중..." : issuedToken ? "발급됨" : "모바일 링크 발급"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setSignaturePath(null);
                setIssuedToken(null);
                setError(null);
              }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
