import { notFound } from "next/navigation";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { StaffForm } from "../StaffForm";
import { updateStaff, deleteStaff } from "../actions";

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data: staff } = await admin
    .from("staff")
    .select("name, display_color, position, commission_rate, is_active, display_order")
    .eq("id", id)
    .eq("shop_id", shop.id)
    .maybeSingle();

  if (!staff) notFound();

  const update = async (formData: FormData) => {
    "use server";
    return updateStaff(id, formData);
  };

  const remove = async () => {
    "use server";
    return deleteStaff(id);
  };

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">스태프 수정</h1>
      <StaffForm
        initial={staff}
        submit={update}
        submitLabel="저장"
        onDelete={remove}
      />
    </div>
  );
}
