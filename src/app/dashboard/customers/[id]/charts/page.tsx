import { notFound } from "next/navigation";
import Link from "next/link";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKST } from "@/lib/format";

type Chart = {
  id: string;
  visit_at: string;
  skin_type: string | null;
  allergies: string | null;
  medications: string | null;
  previous_treatments: string | null;
  desired_design: string | null;
  shop_assessment: string | null;
  notes: string | null;
  booking_id: string | null;
  staff: { name: string; display_color: string } | null;
};

export default async function CustomerChartsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: customerId } = await params;
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data: customer } = await admin
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("shop_id", shop.id)
    .maybeSingle();
  if (!customer) notFound();

  const { data } = await admin
    .from("consultation_charts")
    .select(
      "id, visit_at, skin_type, allergies, medications, previous_treatments, desired_design, shop_assessment, notes, booking_id, staff:staff(name, display_color)",
    )
    .eq("shop_id", shop.id)
    .eq("customer_id", customerId)
    .order("visit_at", { ascending: false })
    .limit(100);

  const list = (data ?? []) as unknown as Chart[];

  return (
    <div>
      <p className="mb-4 text-sm text-gray-600">
        이 고객의 누적 상담차트. 새 차트 작성은 <strong>예약 상세 페이지</strong>에서 진행됩니다.
      </p>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          작성된 상담차트가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((c) => (
            <div key={c.id} className="rounded-lg border border-rose-gold-100 bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {formatKST(c.visit_at)}
                </span>
                {c.staff && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: c.staff.display_color }}
                    />
                    {c.staff.name}
                  </span>
                )}
                {c.booking_id && (
                  <Link
                    href={`/dashboard/bookings/${c.booking_id}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    예약 보기 →
                  </Link>
                )}
              </div>
              <div className="grid gap-1 text-sm md:grid-cols-2">
                <ChartItem label="피부타입" value={c.skin_type} />
                <ChartItem label="알러지" value={c.allergies} />
                <ChartItem label="복용약" value={c.medications} />
                <ChartItem label="이전 시술" value={c.previous_treatments} />
                <ChartItem label="원하는 디자인" value={c.desired_design} full />
                <ChartItem label="매장 평가" value={c.shop_assessment} full />
                <ChartItem label="메모" value={c.notes} full />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChartItem({
  label,
  value,
  full,
}: {
  label: string;
  value: string | null;
  full?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={full ? "md:col-span-2" : undefined}>
      <span className="text-xs text-gray-500">{label}</span>{" "}
      <span className="text-gray-800 whitespace-pre-wrap">{value}</span>
    </div>
  );
}
