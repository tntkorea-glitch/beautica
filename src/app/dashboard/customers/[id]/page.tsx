import { notFound } from "next/navigation";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { CustomerForm } from "../CustomerForm";
import { updateCustomer, deleteCustomer } from "../actions";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthday: string | null;
  gender: string | null;
  notes: string | null;
  tags: string[] | null;
};

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data: customer } = await admin
    .from("customers")
    .select("id, name, phone, email, birthday, gender, notes, tags")
    .eq("id", id)
    .eq("shop_id", shop.id)
    .maybeSingle();

  if (!customer) notFound();

  const update = async (formData: FormData) => {
    "use server";
    return updateCustomer(id, formData);
  };

  const remove = async () => {
    "use server";
    return deleteCustomer(id);
  };

  return (
    <div className="max-w-xl">
      <CustomerForm
        initial={customer as Customer}
        submit={update}
        submitLabel="저장"
        onDelete={remove}
      />
    </div>
  );
}
