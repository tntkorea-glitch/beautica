import Link from "next/link";
import { notFound } from "next/navigation";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKSTMonthDayWeekdayTime, formatKSTTime } from "@/lib/format";
import { ConsultationChartSection } from "@/components/work/ConsultationChartSection";
import { ServiceRecordSection } from "@/components/work/ServiceRecordSection";
import { NotificationSection } from "@/components/work/NotificationSection";
import { ConsentSection } from "@/components/work/ConsentSection";
import { PassesSection } from "@/components/work/PassesSection";
import { createSignedUrls } from "@/app/dashboard/customers/[id]/records/signed-urls";
import { GuestToCustomerPanel } from "./GuestToCustomerPanel";
import { ReschedulePanel } from "./ReschedulePanel";
import { BookingStatusActions } from "./BookingStatusActions";

type BookingDetail = {
  id: string;
  start_at: string;
  end_at: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  source: "BEAUTICA" | "NAVER" | "WALK_IN" | "PHONE";
  guest_name: string | null;
  guest_phone: string | null;
  customer_note: string | null;
  shop_note: string | null;
  price_won: number;
  customer_id: string | null;
  service_id: string | null;
  staff_id: string | null;
  customer: { id: string; name: string; phone: string | null } | null;
  service: { id: string; name: string; duration_min: number } | null;
  staff: { id: string; name: string; display_color: string } | null;
};

type ExistingRecord = {
  id: string;
  performed_at: string;
  formula: string | null;
  techniques: string | null;
  notes: string | null;
  before_photo_urls: string[];
  after_photo_urls: string[];
  staff: { name: string; display_color: string } | null;
  service: { name: string } | null;
};

const STATUS_LABEL = {
  PENDING: "신청 대기",
  CONFIRMED: "확정",
  COMPLETED: "완료",
  CANCELLED: "취소",
  NO_SHOW: "노쇼",
} as const;

const STATUS_STYLE = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  NO_SHOW: "bg-red-100 text-red-700",
} as const;

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data } = await admin
    .from("bookings")
    .select(
      "id, start_at, end_at, status, source, guest_name, guest_phone, customer_note, shop_note, price_won, customer_id, service_id, staff_id, customer:customers(id, name, phone), service:services(id, name, duration_min), staff:staff(id, name, display_color)",
    )
    .eq("id", id)
    .eq("shop_id", shop.id)
    .maybeSingle();

  if (!data) notFound();
  const b = data as unknown as BookingDetail;

  const customerId = b.customer?.id ?? b.customer_id;
  const customerName = b.customer?.name ?? b.guest_name ?? "(이름 없음)";
  const customerPhone = b.customer?.phone ?? b.guest_phone ?? "";

  // 기존 상담차트 (이 예약 연결)
  const { data: chart } = await admin
    .from("consultation_charts")
    .select(
      "skin_type, allergies, medical_history, medications, previous_treatments, desired_design, shop_assessment, notes",
    )
    .eq("booking_id", id)
    .eq("shop_id", shop.id)
    .maybeSingle();

  // 이전 방문 요약 — 이 예약과 다른 booking_id의 최근 기록
  const prevRecordRes = customerId
    ? await admin
        .from("service_records")
        .select("id, performed_at, notes, formula, service:services(name), staff:staff(name)")
        .eq("shop_id", shop.id)
        .eq("customer_id", customerId)
        .neq("booking_id", id)
        .order("performed_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : null;
  const prevRecord = prevRecordRes?.data as {
    id: string;
    performed_at: string;
    notes: string | null;
    formula: string | null;
    service: { name: string } | null;
    staff: { name: string } | null;
  } | null;

  // 시술기록 + services + staff
  const [recordsRes, servicesRes, staffRes] = await Promise.all([
    admin
      .from("service_records")
      .select(
        "id, performed_at, formula, techniques, notes, before_photo_urls, after_photo_urls, staff:staff(name, display_color), service:services(name)",
      )
      .eq("shop_id", shop.id)
      .eq("booking_id", id)
      .order("performed_at", { ascending: false }),
    admin
      .from("services")
      .select("id, name")
      .eq("shop_id", shop.id)
      .eq("is_active", true)
      .order("display_order"),
    admin
      .from("staff")
      .select("id, name, display_color")
      .eq("shop_id", shop.id)
      .eq("is_active", true)
      .order("display_order"),
  ]);

  const records = (recordsRes.data ?? []) as unknown as ExistingRecord[];

  // 동의서 (이 예약 연결)
  const { data: consentRows } = await admin
    .from("consent_forms")
    .select(
      "id, signed_at, signer_name, signature_url, signature_method, template_id, signature_token, token_expires_at",
    )
    .eq("shop_id", shop.id)
    .eq("booking_id", id)
    .order("created_at", { ascending: false });
  const consents = (consentRows ?? []) as unknown as Array<{
    id: string;
    signed_at: string | null;
    signer_name: string | null;
    signature_url: string | null;
    signature_method: string | null;
    template_id: string;
    signature_token: string | null;
    token_expires_at: string | null;
  }>;

  // 사진 + 서명 path 모두 모아서 signed URL 한 번에
  const allPaths = [
    ...records.flatMap((r) => [...r.before_photo_urls, ...r.after_photo_urls]),
    ...consents.map((c) => c.signature_url).filter((p): p is string => !!p),
  ];
  const signedMap = await createSignedUrls(admin, allPaths);

  // 회수권/선불권 (이 고객의 활성 + 만료 모두)
  const { data: passRows } = await admin
    .from("service_passes")
    .select(
      "id, pass_type, total_count, remaining_count, prepaid_amount, remaining_amount, expires_at, notes, is_active, purchased_at, service:services(name)",
    )
    .eq("shop_id", shop.id)
    .eq("customer_id", customerId ?? "")
    .order("is_active", { ascending: false })
    .order("purchased_at", { ascending: false });
  const passes = (passRows ?? []) as unknown as Array<{
    id: string;
    pass_type: "COUNT" | "PREPAID" | "MEMBERSHIP";
    service: { name: string } | null;
    total_count: number | null;
    remaining_count: number | null;
    prepaid_amount: number | null;
    remaining_amount: number | null;
    expires_at: string | null;
    notes: string | null;
    is_active: boolean;
    purchased_at: string;
  }>;

  return (
    <div>
      <div className="mb-2 text-xs text-gray-500">
        <Link href="/dashboard/bookings" className="hover:underline">
          ← 예약 목록
        </Link>
      </div>

      {/* 헤더 */}
      <header className="mb-6 rounded-lg border border-rose-gold-100 bg-white p-5">
        <div className="mb-2 flex flex-wrap items-baseline gap-2">
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status]}`}>
            {STATUS_LABEL[b.status]}
          </span>
          <h1 className="text-xl font-bold text-gray-900">{customerName}</h1>
          {customerPhone && (
            <span className="font-mono text-sm text-gray-500">{customerPhone}</span>
          )}
          {customerId && (
            <Link
              href={`/dashboard/customers/${customerId}`}
              className="text-xs text-blue-600 hover:underline"
            >
              고객 카드 →
            </Link>
          )}
        </div>
        <div className="grid gap-1 text-sm text-gray-700 md:grid-cols-2">
          <div>
            🗓 {formatKSTMonthDayWeekdayTime(b.start_at)} ~ {formatKSTTime(b.end_at)}
          </div>
          <div>
            💇 {b.service?.name ?? "(시술 없음)"} ·{" "}
            <span className="font-mono">{b.price_won.toLocaleString()}원</span>
          </div>
          {b.staff && (
            <div className="flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: b.staff.display_color }}
              />
              담당 {b.staff.name}
            </div>
          )}
          <div className="text-xs text-gray-500">출처: {b.source}</div>
        </div>
        {b.customer_note && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            📝 고객 요청: {b.customer_note}
          </p>
        )}
        {b.shop_note && (
          <p className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
            📌 매장 메모: {b.shop_note}
          </p>
        )}
        <ReschedulePanel
          bookingId={b.id}
          startAt={b.start_at}
          endAt={b.end_at}
          status={b.status}
        />
        <BookingStatusActions bookingId={b.id} status={b.status} />
      </header>

      {/* 이전 방문 기록 요약 */}
      {prevRecord && (
        <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-semibold text-amber-700">이전 방문 기록</span>
            <span className="text-xs text-amber-600">{formatKSTMonthDayWeekdayTime(prevRecord.performed_at)}</span>
            {prevRecord.service && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                {prevRecord.service.name}
              </span>
            )}
            {prevRecord.staff && (
              <span className="text-xs text-amber-600">담당 {prevRecord.staff.name}</span>
            )}
          </div>
          {prevRecord.formula && (
            <p className="text-xs text-amber-800">
              <span className="font-medium">공식:</span> {prevRecord.formula}
            </p>
          )}
          {prevRecord.notes && (
            <p className="mt-0.5 text-xs text-amber-800">
              <span className="font-medium">메모:</span> {prevRecord.notes}
            </p>
          )}
        </div>
      )}

      {/* 작업 허브 — 인라인 섹션들 */}
      {customerId ? (
        <div className="space-y-4">
          <ConsultationChartSection
            bookingId={b.id}
            customerId={customerId}
            existing={chart}
          />

          <ServiceRecordSection
            bookingId={b.id}
            customerId={customerId}
            shopId={shop.id}
            defaultServiceId={b.service_id}
            defaultStaffId={b.staff_id}
            services={servicesRes.data ?? []}
            staff={staffRes.data ?? []}
            existingRecords={records}
            signedUrls={signedMap}
          />

          <ConsentSection
            bookingId={b.id}
            customerId={customerId}
            shopId={shop.id}
            customerName={customerName}
            existingConsents={consents}
            signedUrls={signedMap}
          />

          <NotificationSection bookingId={b.id} />

          <PassesSection
            customerId={customerId}
            bookingId={b.id}
            services={servicesRes.data ?? []}
            passes={passes}
          />
        </div>
      ) : (
        <GuestToCustomerPanel
          bookingId={b.id}
          initialName={b.guest_name ?? ""}
          initialPhone={b.guest_phone ?? ""}
        />
      )}
    </div>
  );
}

function PlaceholderSection({ title, note }: { title: string; note: string }) {
  return (
    <section className="rounded-lg border border-dashed border-rose-gold-200 bg-white/50 p-5">
      <h3 className="text-base font-semibold text-gray-700">{title}</h3>
      <p className="mt-1 text-xs text-gray-500">{note}</p>
    </section>
  );
}
