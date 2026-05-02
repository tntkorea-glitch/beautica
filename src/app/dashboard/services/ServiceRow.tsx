"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleActive } from "./actions";

type Service = {
  id: string;
  name: string;
  category: string | null;
  price_won: number;
  duration_min: number;
  is_active: boolean;
  photo_url: string | null;
};

export function ServiceRow({ service: s }: { service: Service }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      await toggleActive(s.id, !s.is_active);
      router.refresh();
    });
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          {s.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.photo_url} alt="" className="h-9 w-9 rounded-md object-cover flex-shrink-0 border border-gray-100" />
          ) : (
            <div className="h-9 w-9 rounded-md bg-gray-100 flex-shrink-0 flex items-center justify-center text-base">💇</div>
          )}
          <span className="font-medium text-gray-900">{s.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono">
        {s.price_won.toLocaleString()}원
      </td>
      <td className="px-4 py-3 text-right text-gray-600">{s.duration_min}분</td>
      <td className="px-4 py-3 text-center">
        <button
          type="button"
          disabled={isPending}
          onClick={handleToggle}
          className={
            s.is_active
              ? "rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
              : "rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-200 disabled:opacity-50"
          }
        >
          {s.is_active ? "공개 중" : "비공개"}
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/dashboard/services/${s.id}`}
          className="text-xs text-gray-600 hover:text-gray-900 hover:underline"
        >
          편집
        </Link>
      </td>
    </tr>
  );
}
