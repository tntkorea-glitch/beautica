import Link from "next/link";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { StaffRow } from "./StaffRow";

type Staff = {
  id: string;
  name: string;
  display_color: string;
  position: string | null;
  commission_rate: number | null;
  is_active: boolean;
  display_order: number;
};

export default async function StaffPage() {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data } = await admin
    .from("staff")
    .select("id, name, display_color, position, commission_rate, is_active, display_order")
    .eq("shop_id", shop.id)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  const list = (data ?? []) as Staff[];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">스태프</h1>
          <p className="mt-1 text-sm text-gray-600">
            예약/매출이 귀속되는 디자이너/스태프를 관리합니다. 캘린더 색상으로 구분됩니다.
          </p>
        </div>
        <Link
          href="/dashboard/staff/new"
          className="rounded-md bg-rose-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-gold-700"
        >
          + 스태프 추가
        </Link>
      </div>

      {list.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">이름</th>
                <th className="px-4 py-3 text-left font-medium">직책</th>
                <th className="px-4 py-3 text-right font-medium">커미션</th>
                <th className="px-4 py-3 text-center font-medium">색상</th>
                <th className="px-4 py-3 text-center font-medium">상태</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.map((s) => (
                <StaffRow key={s.id} staff={s} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
      <div className="mb-2 text-3xl">👩‍💼</div>
      <p className="mb-1 text-sm font-medium text-gray-700">아직 등록된 스태프가 없어요</p>
      <p className="mb-4 text-xs text-gray-500">
        혼자 운영하시면 본인 한 명만 등록하셔도 됩니다.
      </p>
      <Link
        href="/dashboard/staff/new"
        className="inline-block rounded-md bg-rose-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-gold-700"
      >
        + 첫 스태프 추가
      </Link>
    </div>
  );
}
