"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_CONSENT_TEMPLATES,
  getDefaultTemplate,
} from "@/lib/consent-templates";
import { SignaturePad } from "./SignaturePad";
import { saveConsentForm } from "@/app/dashboard/bookings/[id]/consent-actions";

type ExistingConsent = {
  id: string;
  signed_at: string | null;
  signer_name: string | null;
  signature_url: string | null;
  signature_method: string | null;
  template_id: string;
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
  const [templateKey, setTemplateKey] = useState(DEFAULT_CONSENT_TEMPLATES[0].key);
  const [signerName, setSignerName] = useState(customerName);
  const [signaturePath, setSignaturePath] = useState<string | null>(null);
  const [savingSig, setSavingSig] = useState(false);

  const tmpl = getDefaultTemplate(templateKey);

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
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-md border bg-gray-50 p-3 text-sm"
              >
                <span className="text-lg">✅</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {c.signer_name ?? "(서명자명 없음)"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {c.signed_at
                      ? new Date(c.signed_at).toLocaleString("ko-KR")
                      : "미서명"}
                    {" · "}
                    {c.signature_method === "IN_STORE" ? "매장 직접" : "모바일 링크"}
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
            );
          })}
        </div>
      )}

      {/* 새 동의서 받기 */}
      {showForm && (
        <div className="space-y-3 border-t pt-4">
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

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              서명 (직접)
            </label>
            {!signaturePath ? (
              <SignaturePad onSave={handleSignature} disabled={savingSig} />
            ) : (
              <div className="rounded-md border bg-green-50 p-3 text-sm text-green-700">
                ✅ 서명 저장 완료. 아래 "동의서 등록" 버튼으로 마무리하세요.
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

          <p className="text-xs text-gray-500">
            💡 <strong>모바일 링크로 받기</strong>: 다음 단계에서 추가됩니다 (고객 핸드폰으로 링크 보내서 서명 받기).
          </p>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending || !signaturePath || savingSig}
              onClick={handleSubmit}
              className="rounded-md bg-rose-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-gold-700 disabled:opacity-50"
            >
              {isPending ? "등록 중..." : "동의서 등록"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setSignaturePath(null);
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
