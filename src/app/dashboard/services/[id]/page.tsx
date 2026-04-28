import { notFound } from "next/navigation";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { ServiceForm } from "../ServiceForm";
import { updateService, deleteService } from "../actions";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data: service } = await admin
    .from("services")
    .select("name, category, price_won, duration_min, description, is_active, display_order")
    .eq("id", id)
    .eq("shop_id", shop.id)
    .maybeSingle();

  if (!service) notFound();

  const update = async (formData: FormData) => {
    "use server";
    return updateService(id, formData);
  };

  const remove = async () => {
    "use server";
    return deleteService(id);
  };

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">시술 수정</h1>
      <ServiceForm
        initial={service}
        submit={update}
        submitLabel="저장"
        onDelete={remove}
      />
    </div>
  );
}
