"use client";

import { useState } from "react";
import { updateShopInfo } from "./actions";
import { formatPhone } from "@/lib/format";

export function ShopInfoForm({
  name, phone, address, description,
}: {
  name: string; phone: string; address: string; description: string;
}) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [phoneVal, setPhoneVal] = useState(() => formatPhone(phone));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const res = await updateShopInfo(new FormData(e.currentTarget));
    setSaving(false);
    setMsg(res.error ?? "저장되었습니다.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">매장명 *</label>
          <input name="name" defaultValue={name} required
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">대표 전화</label>
          <input name="phone" type="tel" inputMode="numeric" value={phoneVal} placeholder="010-0000-0000"
            onChange={(e) => setPhoneVal(formatPhone(e.target.value))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">주소</label>
        <input name="address" defaultValue={address} placeholder="서울시 강남구..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">매장 소개</label>
        <textarea name="description" defaultValue={description} rows={3} placeholder="매장 소개를 입력해주세요"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300 resize-none" />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--rose-gold-500)" }}>
          {saving ? "저장 중..." : "저장"}
        </button>
        {msg && <p className={`text-sm ${msg.includes("오류") || msg.includes("입력") ? "text-red-500" : "text-green-600"}`}>{msg}</p>}
      </div>
    </form>
  );
}
