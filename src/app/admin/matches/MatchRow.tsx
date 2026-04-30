"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveMatch, rejectMatch } from "./actions";

type Shop = {
  id: string;
  name: string;
  slug: string;
  owner_name: string | null;
  phone: string | null;
  business_number: string | null;
  postal_code: string | null;
  address: string | null;
  address_detail: string | null;
  matched_partner_id: string | null;
  match_score: number | null;
  match_signals: string[] | null;
  match_requested_at: string | null;
};

type Partner = {
  id: string;
  name: string;
  representative: string | null;
  businessNo: string | null;
  mobile: string | null;
  phone: string | null;
  zipcode: string | null;
  address1: string | null;
  address2: string | null;
  createdAt: string;
};

export function MatchRow({
  shop,
  partner,
  previewUrl,
}: {
  shop: Shop;
  partner: Partner | null;
  previewUrl: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [targetTier, setTargetTier] = useState<2 | 3>(2);

  const handleApprove = () => {
    setError(null);
    startTransition(async () => {
      const result = await approveMatch(shop.id, targetTier);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      setError("거절 사유를 입력해주세요.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await rejectMatch(shop.id, rejectReason.trim());
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  const shopAddr = [shop.postal_code, shop.address, shop.address_detail]
    .filter(Boolean)
    .join(" ");
  const partnerAddr = partner
    ? [partner.zipcode, partner.address1, partner.address2].filter(Boolean).join(" ")
    : "";

  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {shop.name}
            <span className="ml-2 font-mono text-xs text-gray-500">/{shop.slug}</span>
          </h2>
          <p className="text-xs text-gray-500">
            매칭 점수 <strong className="text-gray-700">{shop.match_score ?? "-"}</strong>
            {shop.match_signals && shop.match_signals.length > 0 && (
              <span className="ml-2">신호: {shop.match_signals.join(" · ")}</span>
            )}
          </p>
        </div>
        <p className="text-xs text-gray-500">
          {shop.match_requested_at
            ? new Date(shop.match_requested_at).toLocaleString("ko-KR")
            : "-"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 좌: 회원 입력 정보 */}
        <div className="rounded-md border bg-gray-50 p-3">
          <div className="mb-2 text-xs font-semibold text-gray-700">회원이 입력한 정보</div>
          <Detail label="대표자" value={shop.owner_name ?? "-"} />
          <Detail label="사업자번호" value={shop.business_number ?? "-"} mono />
          <Detail label="연락처" value={shop.phone ?? "-"} />
          <Detail label="주소" value={shopAddr || "-"} />
        </div>

        {/* 우: 매칭된 거래처 정보 (전체 노출 — admin 검토용) */}
        <div className="rounded-md border bg-blue-50/50 p-3">
          <div className="mb-2 text-xs font-semibold text-gray-700">
            매칭된 거래처 (Partner)
          </div>
          {partner ? (
            <>
              <Detail label="상호" value={partner.name} />
              <Detail label="대표자" value={partner.representative ?? "-"} />
              <Detail label="사업자번호" value={partner.businessNo ?? "-"} mono />
              <Detail label="휴대폰" value={partner.mobile ?? "-"} />
              <Detail label="전화" value={partner.phone ?? "-"} />
              <Detail label="주소" value={partnerAddr || "-"} />
              <Detail
                label="등록일"
                value={new Date(partner.createdAt).toLocaleDateString("ko-KR")}
              />
              <Detail label="Partner.id" value={partner.id} mono />
            </>
          ) : (
            <p className="text-xs text-red-600">⚠️ Partner 정보를 찾을 수 없습니다.</p>
          )}
        </div>
      </div>

      {/* 사업자등록증 */}
      <div className="mt-4">
        <div className="mb-1 text-xs font-medium text-gray-700">
          사업자등록증/명함 (회원 첨부)
        </div>
        {previewUrl ? (
          previewUrl.match(/\.(pdf)(\?|$)/i) ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-44 items-center justify-center rounded-md border border-dashed bg-gray-50 text-xs text-blue-600 hover:bg-gray-100"
            >
              📄 PDF 새 탭에서 열기
            </a>
          ) : (
            <a href={previewUrl} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="사업자등록증"
                className="h-44 w-full rounded-md border bg-gray-50 object-contain"
              />
            </a>
          )
        ) : (
          <div className="flex h-24 items-center justify-center rounded-md border border-dashed bg-gray-50 text-xs text-gray-400">
            첨부 파일 없음 (회원이 등록증 미첨부 — tier 1 로 매핑 가능)
          </div>
        )}
      </div>

      {/* 액션 */}
      <div className="mt-4 border-t pt-4">
        {error && (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}

        {!rejecting ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-gray-600">
              승인 등급:
              <select
                value={targetTier}
                onChange={(e) => setTargetTier(Number(e.target.value) as 2 | 3)}
                className="ml-1 rounded-md border border-gray-300 px-2 py-1 text-xs"
              >
                <option value={2}>tier 2 (뷰티샵)</option>
                <option value={3}>tier 3 (VIP/대형)</option>
              </select>
            </label>
            <button
              type="button"
              disabled={isPending}
              onClick={handleApprove}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isPending ? "처리 중..." : "✅ 매칭 승인"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setRejecting(true)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              거절
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거절 사유 (예: 사업자등록증 명의 불일치, 후보 거래처가 본인 아님 등)"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={handleReject}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "처리 중..." : "거절 확정"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setRejecting(false);
                  setRejectReason("");
                  setError(null);
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex text-sm">
      <span className="w-20 text-xs text-gray-500">{label}</span>
      <span className={mono ? "font-mono text-xs" : "text-xs"}>{value}</span>
    </div>
  );
}
