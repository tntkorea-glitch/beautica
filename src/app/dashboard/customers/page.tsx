import Link from "next/link";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  visit_count: number;
  last_visit_at: string | null;
  tags: string[] | null;
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { shop } = await requireShop();
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";

  const admin = createAdminClient();
  let query = admin
    .from("customers")
    .select("id, name, phone, email, visit_count, last_visit_at, tags")
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (q) {
    // ILIKE 두 컬럼 동시 검색
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data: customers } = await query;
  const list = (customers ?? []) as Customer[];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">고객</h1>
          <p className="mt-1 text-sm text-gray-600">
            매장의 고객 명부 + 시술 이력 메모를 관리합니다.
          </p>
        </div>
        <Link
          href="/dashboard/customers/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          + 고객 추가
        </Link>
      </div>

      <form className="mb-4">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="이름 / 연락처 검색"
          className="block w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </form>

      {list.length === 0 ? (
        <EmptyState hasQuery={!!q} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">이름</th>
                <th className="px-4 py-3 text-left font-medium">연락처</th>
                <th className="px-4 py-3 text-left font-medium">태그</th>
                <th className="px-4 py-3 text-right font-medium">방문</th>
                <th className="px-4 py-3 text-right font-medium">최근 방문</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/dashboard/customers/${c.id}`}
                      className="text-gray-900 hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-700">
                    {c.phone ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags?.length
                        ? c.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700"
                            >
                              {t}
                            </span>
                          ))
                        : "-"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {c.visit_count}회
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {c.last_visit_at
                      ? new Date(c.last_visit_at).toLocaleDateString("ko-KR")
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  if (hasQuery) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
        검색 결과가 없습니다.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
      <div className="mb-2 text-3xl">👤</div>
      <p className="mb-1 text-sm font-medium text-gray-700">아직 등록된 고객이 없어요</p>
      <p className="mb-4 text-xs text-gray-500">
        고객을 직접 추가하거나, 공개 예약 페이지를 통해 들어온 예약에서 자동 생성됩니다.
      </p>
      <Link
        href="/dashboard/customers/new"
        className="inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
      >
        + 첫 고객 추가
      </Link>
    </div>
  );
}
