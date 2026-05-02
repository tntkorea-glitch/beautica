"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveUpgrade, rejectUpgrade } from "./actions";
import { formatKST } from "@/lib/format";

type Shop = {
  id: string;
  name: string;
  slug: string;
  business_number: string | null;
  phone: string | null;
  postal_code: string | null;
  address: string | null;
  address_detail: string | null;
  tier_upgrade_requested_at: string | null;
  created_at: string;
};

export function UpgradeRow({
  shop,
  previewUrl,
}: {
  shop: Shop;
  previewUrl: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleApprove = () => {
    setError(null);
    startTransition(async () => {
      const result = await approveUpgrade(shop.id);
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
      const result = await rejectUpgrade(shop.id, rejectReason.trim());
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  const fullAddress = [shop.postal_code, shop.address, shop.address_detail]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="grid gap-5 md:grid-cols-[1fr_300px]">
        {/* 좌: 매장 정보 */}
        <div className="space-y-2 text-sm">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{shop.name}</h2>
            <span className="font-mono text-xs text-gray-500">/{shop.slug}</span>
          </div>
          <Detail label="사업자번호" value={shop.business_number ?? "-"} mono />
          <Detail label="대표 연락처" value={shop.phone ?? "-"} />
          <Detail label="매장 주소" value={fullAddress || "-"} />
          <Detail
            label="신청일시"
            value={
              shop.tier_upgrade_requested_at
                ? formatKST(shop.tier_upgrade_requested_at)
                : "-"
            }
          />
        </div>

        {/* 우: 사업자등록증 미리보기 */}
        <div>
          <div className="mb-1 text-xs font-medium text-gray-700">
            사업자등록증/명함
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
                  className="h-44 w-full rounded-md border object-contain bg-gray-50"
                />
              </a>
            )
          ) : (
            <div className="flex h-44 items-center justify-center rounded-md border border-dashed bg-gray-50 text-xs text-gray-400">
              파일 없음
            </div>
          )}
        </div>
      </div>

      {/* 액션 영역 */}
      <div className="mt-4 border-t pt-4">
        {error && (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        {!rejecting ? (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handleApprove}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isPending ? "처리 중..." : "✅ TICA Crown 승인 (tier 2)"}
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
              placeholder="거절 사유 (예: 사업자등록증이 흐려서 확인 불가, 명의 불일치 등)"
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
    <div className="flex">
      <span className="w-24 text-xs text-gray-500">{label}</span>
      <span className={mono ? "font-mono" : undefined}>{value}</span>
    </div>
  );
}
