"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  closeConsultation,
  reopenConsultation,
  respondConsultation,
} from "../actions";

type Status = "NEW" | "IN_PROGRESS" | "CLOSED";

export function ConsultActions({
  id,
  status,
  currentResponse,
}: {
  id: string;
  status: Status;
  currentResponse: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState(currentResponse ?? "");

  const wrap = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  };

  return (
    <div className="mt-6 rounded-lg border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">매장 답변</h3>
        {status === "CLOSED" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => wrap(() => reopenConsultation(id))}
            className="text-xs text-blue-600 hover:underline"
          >
            다시 열기
          </button>
        )}
      </div>

      <textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        rows={4}
        placeholder="답변 내용을 입력하세요. 저장 시 상태가 '진행 중' 으로 바뀝니다."
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
      />

      {error && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={isPending || !response.trim()}
          onClick={() => wrap(() => respondConsultation(id, response))}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          {isPending ? "저장 중..." : currentResponse ? "답변 수정" : "답변 등록"}
        </button>
        {status !== "CLOSED" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => wrap(() => closeConsultation(id))}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            상담 종료
          </button>
        )}
      </div>
    </div>
  );
}
