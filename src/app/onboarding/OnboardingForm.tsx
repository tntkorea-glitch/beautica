"use client";

import { useState, useTransition } from "react";
import { completeOnboarding } from "./actions";
import { formatBusinessNumber, formatPhone } from "@/lib/format";
import { PostcodeButton } from "@/components/address/PostcodeButton";
import { createClient } from "@/lib/supabase/client";

type LicenseUploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "uploaded"; path: string; fileName: string }
  | { status: "error"; message: string };

export function OnboardingForm({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address, setAddress] = useState("");
  const [license, setLicense] = useState<LicenseUploadState>({ status: "idle" });

  const handleLicenseChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) {
      setLicense({ status: "idle" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setLicense({ status: "error", message: "10MB 이하 파일만 가능합니다." });
      return;
    }

    setLicense({ status: "uploading" });
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${userId}/${Date.now()}-license.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("business-licenses")
      .upload(path, file, { contentType: file.type || undefined, upsert: false });

    if (uploadError) {
      setLicense({ status: "error", message: `업로드 실패: ${uploadError.message}` });
      return;
    }
    setLicense({ status: "uploaded", path, fileName: file.name });
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);
    if (license.status === "uploading") {
      setError("파일 업로드가 끝날 때까지 기다려주세요.");
      return;
    }
    startTransition(async () => {
      // 성공 시 server action 안에서 redirect → 여기 도달 X
      // 실패 시에만 result.error 가 옴
      const result = await completeOnboarding(formData);
      if (result?.error) setError(result.error);
    });
  };

  const licensePath = license.status === "uploaded" ? license.path : "";
  const willRequestUpgrade = !!businessNumber.trim() && !!licensePath;

  return (
    <form action={handleSubmit} className="space-y-4">
      <Field
        label="매장명"
        name="name"
        required
        placeholder="예: 홍길동 헤어"
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          매장 ID
        </label>
        <div className="flex items-stretch overflow-hidden rounded-md border border-gray-300 focus-within:border-gray-500">
          <span className="flex items-center bg-gray-50 px-3 text-sm text-gray-500">
            beautica.co.kr/
          </span>
          <input
            name="slug"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="hong-hair"
            pattern="[a-z0-9-]+"
            className="block w-full px-3 py-2 text-sm focus:outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          고객이 예약할 때 접속하는 매장 페이지 주소입니다. 영문 소문자/숫자/하이픈(-)만 가능.
        </p>
        {slug && (
          <p className="mt-1 text-xs text-blue-600">
            👉 미리보기: <span className="font-mono">beautica.co.kr/{slug}</span>
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          대표 연락처
        </label>
        <input
          type="tel"
          name="phone"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="010-0000-0000"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          매장 주소
        </label>
        <div className="flex gap-2">
          <input
            name="postal_code"
            value={postalCode}
            readOnly
            placeholder="우편번호"
            className="block w-32 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
          />
          <PostcodeButton
            onComplete={({ postalCode, address }) => {
              setPostalCode(postalCode);
              setAddress(address);
            }}
          />
        </div>
        <input
          name="address"
          value={address}
          readOnly
          placeholder="주소 검색 버튼을 눌러 도로명 주소를 채워주세요"
          className="mt-2 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
        />
        <input
          name="address_detail"
          placeholder="상세 주소 (예: 3층 301호)"
          className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="mb-2 text-sm font-medium text-gray-800">
          🏷️ 도매가(뷰티샵 등급) 신청
        </p>
        <p className="mb-3 text-xs text-gray-600">
          가입 시 기본 등급은 <strong>일반회원</strong> 입니다. 사업자번호 + 사업자등록증(또는 명함) 을 함께 첨부하시면 <strong>관리자 승인 후 도매가(뷰티샵 등급)</strong> 가 적용됩니다. 지금 안 하셔도 나중에 신청 가능합니다.
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            사업자번호 (선택)
          </label>
          <input
            name="business_number"
            inputMode="numeric"
            value={businessNumber}
            onChange={(e) => setBusinessNumber(formatBusinessNumber(e.target.value))}
            placeholder="000-00-00000"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            사업자등록증 또는 명함 (선택)
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleLicenseChange}
            disabled={license.status === "uploading"}
            className="block w-full text-xs text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-200 file:px-3 file:py-2 file:text-xs file:text-gray-700 hover:file:bg-gray-300 disabled:opacity-50"
          />
          <input type="hidden" name="business_license_url" value={licensePath} />
          <p className="mt-1 text-xs text-gray-500">
            JPG / PNG / WEBP / PDF, 10MB 이하
          </p>

          {license.status === "uploading" && (
            <p className="mt-2 text-xs text-gray-500">⏳ 업로드 중...</p>
          )}
          {license.status === "uploaded" && (
            <p className="mt-2 text-xs text-green-700">
              ✅ 업로드 완료: {license.fileName}
            </p>
          )}
          {license.status === "error" && (
            <p className="mt-2 text-xs text-red-700">⚠️ {license.message}</p>
          )}
        </div>

        {willRequestUpgrade && (
          <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
            ✅ 가입 완료 시 도매가 등급 신청이 함께 접수됩니다 (관리자 승인 대기).
          </p>
        )}
        {businessNumber.trim() && !licensePath && license.status === "idle" && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            ⚠️ 사업자등록증/명함을 첨부해야 도매가 신청이 가능합니다.
          </p>
        )}
      </div>

      <div className="text-xs text-gray-500">
        가입 이메일: <span className="font-mono">{userEmail}</span>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending || license.status === "uploading"}
        className="h-12 w-full rounded-lg bg-gray-900 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50"
      >
        {isPending ? "등록 중..." : "매장 등록 완료"}
      </button>
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
