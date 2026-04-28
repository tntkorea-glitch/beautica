import { notFound } from "next/navigation";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { RecordForm } from "./RecordForm";

export default async function NewRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: customerId } = await params;
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data: customer } = await admin
    .from("customers")
    .select("id, name")
    .eq("id", customerId)
    .eq("shop_id", shop.id)
    .maybeSingle();
  if (!customer) notFound();

  const [services, staff] = await Promise.all([
    admin
      .from("services")
      .select("id, name")
      .eq("shop_id", shop.id)
      .order("display_order"),
    admin
      .from("staff")
      .select("id, name")
      .eq("shop_id", shop.id)
      .eq("is_active", true)
      .order("display_order"),
  ]);

  return (
    <div className="max-w-2xl">
      <h2 className="mb-1 text-lg font-bold text-gray-900">시술 기록 추가</h2>
      <p className="mb-6 text-sm text-gray-500">
        고객: <strong>{customer.name}</strong>
      </p>
      <RecordForm
        shopId={shop.id}
        customerId={customerId}
        services={services.data ?? []}
        staff={staff.data ?? []}
      />
    </div>
  );
}
