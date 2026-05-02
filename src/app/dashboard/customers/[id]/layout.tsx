import Link from "next/link";
import { notFound } from "next/navigation";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKST } from "@/lib/format";
import { CustomerTabs } from "./CustomerTabs";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  visit_count: number;
  last_visit_at: string | null;
};

export default async function CustomerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data: customer } = await admin
    .from("customers")
    .select("id, name, phone, visit_count, last_visit_at")
    .eq("id", id)
    .eq("shop_id", shop.id)
    .maybeSingle();

  if (!customer) notFound();
  const c = customer as Customer;

  return (
    <div>
      <div className="mb-2 text-xs text-gray-500">
        <Link href="/dashboard/customers" className="hover:underline">
          ← 고객 목록
        </Link>
      </div>

      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{c.name}</h1>
          {c.phone && <p className="mt-0.5 font-mono text-sm text-gray-600">{c.phone}</p>}
        </div>
        <div className="text-right text-xs text-gray-500">
          <div>총 {c.visit_count}회 방문</div>
          {c.last_visit_at && (
            <div>최근 {formatKST(c.last_visit_at, false)}</div>
          )}
        </div>
      </header>

      <CustomerTabs customerId={c.id} />

      <div className="mt-6">{children}</div>
    </div>
  );
}
