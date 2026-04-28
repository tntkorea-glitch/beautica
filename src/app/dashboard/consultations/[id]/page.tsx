import Link from "next/link";
import { notFound } from "next/navigation";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConsultActions } from "./ConsultActions";

type Consult = {
  id: string;
  category: string | null;
  message: string;
  status: "NEW" | "IN_PROGRESS" | "CLOSED";
  shop_response: string | null;
  responded_at: string | null;
  created_at: string;
  guest_name: string | null;
  guest_phone: string | null;
  customer_id: string | null;
  customer: { name: string; phone: string | null } | null;
  converted_booking_id: string | null;
};

export default async function ConsultationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data: c } = await admin
    .from("consultations")
    .select(
      "id, category, message, status, shop_response, responded_at, created_at, guest_name, guest_phone, customer_id, converted_booking_id, customer:customers(name, phone)",
    )
    .eq("id", id)
    .eq("shop_id", shop.id)
    .maybeSingle();

  if (!c) notFound();
  const consult = c as unknown as Consult;

  const customerName = consult.customer?.name ?? consult.guest_name ?? "(이름 없음)";
  const customerPhone = consult.customer?.phone ?? consult.guest_phone ?? "-";

  return (
    <div className="max-w-2xl">
      <div className="mb-2 text-xs text-gray-500">
        <Link href="/dashboard/consultations" className="hover:underline">
          ← 상담 목록
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-2xl font-bold">{customerName}</h1>
        <span className="font-mono text-sm text-gray-500">{customerPhone}</span>
      </div>

      <div className="mb-1 text-xs text-gray-500">
        {consult.category && <span>{consult.category} · </span>}
        {new Date(consult.created_at).toLocaleString("ko-KR")}
      </div>

      <div className="mt-4 space-y-4">
        <Bubble label="고객 문의" body={consult.message} />

        {consult.shop_response && (
          <Bubble
            label={`매장 답변 ${
              consult.responded_at
                ? `(${new Date(consult.responded_at).toLocaleString("ko-KR")})`
                : ""
            }`}
            body={consult.shop_response}
            tone="response"
          />
        )}
      </div>

      <ConsultActions
        id={consult.id}
        status={consult.status}
        currentResponse={consult.shop_response}
      />
    </div>
  );
}

function Bubble({
  label,
  body,
  tone,
}: {
  label: string;
  body: string;
  tone?: "response";
}) {
  return (
    <div
      className={
        tone === "response"
          ? "rounded-lg border border-blue-200 bg-blue-50 p-4"
          : "rounded-lg border bg-white p-4"
      }
    >
      <div className="mb-1 text-xs font-medium text-gray-500">{label}</div>
      <p className="whitespace-pre-wrap text-sm text-gray-800">{body}</p>
    </div>
  );
}
