import { notFound } from "next/navigation";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { PassesSection } from "@/components/work/PassesSection";

export default async function CustomerPassesPage({
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

  const [services, passRows] = await Promise.all([
    admin
      .from("services")
      .select("id, name")
      .eq("shop_id", shop.id)
      .order("display_order"),
    admin
      .from("service_passes")
      .select(
        "id, pass_type, total_count, remaining_count, prepaid_amount, remaining_amount, expires_at, notes, is_active, purchased_at, service:services(name)",
      )
      .eq("shop_id", shop.id)
      .eq("customer_id", customerId)
      .order("is_active", { ascending: false })
      .order("purchased_at", { ascending: false }),
  ]);

  const passes = (passRows.data ?? []) as unknown as Array<{
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
      <p className="mb-4 text-sm text-gray-600">
        이 고객의 회수권/선불권. 발급/차감 모두 가능 (예약과 무관).
      </p>
      <PassesSection
        customerId={customerId}
        services={services.data ?? []}
        passes={passes}
      />
    </div>
  );
}
