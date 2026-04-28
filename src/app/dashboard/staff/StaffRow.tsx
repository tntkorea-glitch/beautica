"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleStaffActive } from "./actions";

type Staff = {
  id: string;
  name: string;
  display_color: string;
  position: string | null;
  commission_rate: number | null;
  is_active: boolean;
};

export function StaffRow({ staff: s }: { staff: Staff }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      await toggleStaffActive(s.id, !s.is_active);
      router.refresh();
    });
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
      <td className="px-4 py-3 text-gray-600">{s.position ?? "-"}</td>
      <td className="px-4 py-3 text-right font-mono text-gray-700">
        {s.commission_rate != null ? `${s.commission_rate}%` : "-"}
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className="inline-block h-5 w-5 rounded-full border border-gray-200 align-middle"
          style={{ backgroundColor: s.display_color }}
          title={s.display_color}
        />
      </td>
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
          {s.is_active ? "활성" : "비활성"}
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/dashboard/staff/${s.id}`}
          className="text-xs text-gray-600 hover:text-gray-900 hover:underline"
        >
          편집
        </Link>
      </td>
    </tr>
  );
}
