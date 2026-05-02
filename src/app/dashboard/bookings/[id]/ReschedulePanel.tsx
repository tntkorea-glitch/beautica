"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rescheduleBooking } from "../actions";

function toLocalDatetimeValue(isoStr: string): string {
  const d = new Date(isoStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ReschedulePanel({
  bookingId,
  startAt,
  endAt,
  status,
}: {
  bookingId: string;
  startAt: string;
  endAt: string;
  status: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newStart, setNewStart] = useState(toLocalDatetimeValue(startAt));
  const [newEnd, setNewEnd] = useState(toLocalDatetimeValue(endAt));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  if (status === "COMPLETED" || status === "CANCELLED" || status === "NO_SHOW") return null;

  async function save() {
    setSaving(true);
    setMsg("");
    const startIso = new Date(newStart).toISOString();
    const endIso = new Date(newEnd).toISOString();
    const res = await rescheduleBooking(bookingId, startIso, endIso);
    setSaving(false);
    if (res.error) {
      setMsg(res.error);
    } else {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <div className="mt-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:border-gray-300 hover:bg-gray-50"
        >
          예약 시간 변경
        </button>
      ) : (
        <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">예약 시간 변경</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">시작 시간</label>
              <input
                type="datetime-local"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">종료 시간</label>
              <input
                type="datetime-local"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
              />
            </div>
          </div>
          {msg && <p className="text-sm text-red-500">{msg}</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--rose-gold-500)" }}
            >
              {saving ? "변경 중..." : "변경 저장"}
            </button>
            <button
              onClick={() => { setOpen(false); setMsg(""); }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
