import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { ServiceForm } from "../ServiceForm";
import { createService } from "../actions";

export default async function NewServicePage() {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data: cats } = await admin
    .from("services")
    .select("category")
    .eq("shop_id", shop.id)
    .not("category", "is", null);

  const shopCategories = [
    ...new Set((cats ?? []).map((r) => (r.category as string).trim()).filter(Boolean)),
  ];

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">시술 추가</h1>
      <ServiceForm submit={createService} submitLabel="등록" shopCategories={shopCategories} shopId={shop.id} />
    </div>
  );
}
