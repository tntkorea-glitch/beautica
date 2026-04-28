import Link from "next/link";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";

type ConsultStatus = "NEW" | "IN_PROGRESS" | "CLOSED";

type Consult = {
  id: string;
  category: string | null;
  message: string;
  status: ConsultStatus;
  shop_response: string | null;
  responded_at: string | null;
  created_at: string;
  guest_name: string | null;
  guest_phone: string | null;
  customer: { name: string; phone: string | null } | null;
};

const TABS: { value: ConsultStatus | "ALL"; label: string }[] = [
  { value: "NEW", label: "새 상담" },
  { value: "IN_PROGRESS", label: "진행 중" },
  { value: "CLOSED", label: "종료" },
  { value: "ALL", label: "전체" },
];

const STATUS_STYLE: Record<ConsultStatus, string> = {
  NEW: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  CLOSED: "bg-gray-100 text-gray-500",
};

const STATUS_LABEL: Record<ConsultStatus, string> = {
  NEW: "새 상담",
  IN_PROGRESS: "진행 중",
  CLOSED: "종료",
};

export default async function ConsultationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { shop } = await requireShop();
  const sp = await searchParams;
  const filter = (sp.status ?? "NEW") as ConsultStatus | "ALL";

  const admin = createAdminClient();
  let query = admin
    .from("consultations")
    .select(
      "id, category, message, status, shop_response, responded_at, created_at, guest_name, guest_phone, customer:customers(name, phone)",
    )
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (filter !== "ALL") query = query.eq("status", filter);

  const { data } = await query;
  const list = (data ?? []) as unknown as Consult[];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">상담</h1>
        <p className="mt-1 text-sm text-gray-600">
          공개 페이지에서 들어온 상담 신청을 확인하고 답변합니다.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 border-b">
        {TABS.map((tab) => {
          const active = filter === tab.value;
          return (
            <Link
              key={tab.value}
              href={
                tab.value === "ALL"
                  ? "/dashboard/consultations?status=ALL"
                  : `/dashboard/consultations?status=${tab.value}`
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
          {filter === "NEW" ? "새 상담이 없습니다." : "상담 내역이 없습니다."}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/consultations/${c.id}`}
              className="block rounded-lg border bg-white p-4 transition hover:border-gray-400 hover:shadow-sm"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[c.status]}`}>
                  {STATUS_LABEL[c.status]}
                </span>
                {c.category && (
                  <span className="text-xs text-gray-500">{c.category}</span>
                )}
                <span className="text-xs text-gray-400">
                  · {new Date(c.created_at).toLocaleString("ko-KR")}
                </span>
              </div>
              <div className="mb-1 text-sm font-medium text-gray-900">
                {c.customer?.name ?? c.guest_name ?? "(이름 없음)"}{" "}
                <span className="ml-1 font-mono text-xs text-gray-500">
                  {c.customer?.phone ?? c.guest_phone ?? ""}
                </span>
              </div>
              <p className="line-clamp-2 text-sm text-gray-700">{c.message}</p>
              {c.shop_response && (
                <p className="mt-2 line-clamp-1 rounded bg-gray-50 px-2 py-1 text-xs text-gray-600">
                  💬 {c.shop_response}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
