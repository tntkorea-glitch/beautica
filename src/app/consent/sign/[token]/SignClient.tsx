"use client";

import { useState, useTransition } from "react";
import { SignaturePad } from "@/components/work/SignaturePad";
import { submitMobileSignature } from "./actions";

export function SignClient({
  token,
  shopName,
  customerNameHint,
  templateContent,
  templateName,
  defaultSignerName,
}: {
  token: string;
  shopName: string;
  customerNameHint: string | null;
  templateContent: string;
  templateName: string;
  defaultSignerName: string;
}) {
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSignature = async (blob: Blob) => {
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setSignatureDataUrl(typeof reader.result === "string" ? reader.result : null);
    };
    reader.readAsDataURL(blob);
  };

  const handleSubmit = () => {
    setError(null);
    if (!signatureDataUrl) {
      setError("서명을 먼저 저장해주세요.");
      return;
    }
    if (!signerName.trim()) {
      setError("서명자 성함을 입력해주세요.");
      return;
    }
    startTransition(async () => {
      const r = await submitMobileSignature({
        token,
        signatureBase64: signatureDataUrl,
        signerName,
      });
      if (r.error) {
        setError(r.error);
        return;
      }
      setDone(true);
    });
  };

  if (done) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <div className="mb-2 text-2xl">✅</div>
        <h2 className="text-base font-semibold text-green-900">서명이 저장되었습니다.</h2>
        <p className="mt-1 text-sm text-green-700">
          이 페이지는 닫으셔도 됩니다. {shopName} 에서 확인 후 진행됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs text-gray-500">{shopName}</div>
        <h1 className="mt-1 text-xl font-bold text-gray-900">{templateName}</h1>
        {customerNameHint && (
          <p className="mt-1 text-sm text-gray-600">고객: {customerNameHint}</p>
        )}
      </div>

      <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border bg-gray-50 p-4 text-sm leading-relaxed text-gray-800">
        {templateContent}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">서명자 성함</label>
        <input
          type="text"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="홍길동"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">서명</label>
        {!signatureDataUrl ? (
          <SignaturePad onSave={handleSignature} disabled={pending} />
        ) : (
          <div className="rounded-md border bg-gray-50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signatureDataUrl}
              alt="서명 미리보기"
              className="mx-auto h-32 w-full rounded bg-white object-contain"
            />
            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={() => setSignatureDataUrl(null)}
                className="text-xs text-blue-600 underline"
              >
                다시 서명
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending || !signatureDataUrl}
        className="w-full rounded-md bg-rose-gold-600 px-4 py-3 text-base font-semibold text-white hover:bg-rose-gold-700 disabled:opacity-50"
      >
        {pending ? "저장 중..." : "동의서 제출"}
      </button>
    </div>
  );
}
