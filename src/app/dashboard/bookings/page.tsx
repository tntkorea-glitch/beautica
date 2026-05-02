import Link from "next/link";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { BookingRow } from "./BookingRow";

type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

type BookingRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  source: "BEAUTICA" | "NAVER" | "WALK_IN" | "PHONE";
  guest_name: string | null;
  guest_phone: string | null;
  price_won: number;
  customer_note: string | null;
  shop_note: string | null;
  customer: { name: string; phone: string | null } | null;
  service: { name: string; duration_min: number } | null;
  staff: { name: string; display_color: string } | null;
};

const STATUS_TABS: { value: BookingStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "PENDING", label: "신청 대기" },
  { value: "CONFIRMED", label: "확정" },
  { value: "COMPLETED", label: "완료" },
  { value: "CANCELLED", label: "취소" },
  { value: "NO_SHOW", label: "노쇼" },
];

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { shop } = await requireShop();
  const sp = await searchParams;
  const statusFilter = (sp.status ?? "PENDING") as BookingStatus | "ALL";

  const admin = createAdminClient();
  let query = admin
    .from("bookings")
    .select(
      "id, start_at, end_at, status, source, guest_name, guest_phone, price_won, customer_note, shop_note, customer:customers(name, phone), service:services(name, duration_min), staff:staff(name, display_color)",
    )
    .eq("shop_id", shop.id)
    .order("start_at", { ascending: false })
    .limit(200);

  if (statusFilter !== "ALL") query = query.eq("status", statusFilter);

  const { data: bookings } = await query;
  const list = (bookings ?? []) as unknown as BookingRow[];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">예약</h1>
          <p className="mt-1 text-sm text-gray-600">
            예약 신청 검토, 확정, 완료/노쇼 처리.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/bookings/calendar"
            className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            캘린더
          </Link>
          <Link
            href="/dashboard/bookings/new"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            + 예약 추가
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 border-b">
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab.value;
          return (
            <Link
              key={tab.value}
              href={
                tab.value === "ALL"
                  ? "/dashboard/bookings?status=ALL"
                  : `/dashboard/bookings?status=${tab.value}`
              }
              className={
                active
                  ? "-mb-px border-b-2 border-gray-900 px-3 py-2 text-sm font-semibold text-gray-900"
                  : "px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          {statusFilter === "PENDING"
            ? "검토할 신청이 없습니다."
            : "예약 내역이 없습니다."}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((b) => (
            <BookingRow key={b.id} booking={b} />
          ))}
        </div>
      )}
    </div>
  );
}
