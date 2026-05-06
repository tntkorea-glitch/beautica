import { redirect } from "next/navigation";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShopPlan, PLAN_STAFF_LIMIT } from "@/lib/plan";
import { StaffForm } from "../StaffForm";
import { createStaff } from "../actions";

export default async function NewStaffPage() {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const [{ count }, plan] = await Promise.all([
    admin.from("staff").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
    getShopPlan(shop.id),
  ]);

  const limit = PLAN_STAFF_LIMIT[plan];
  if ((count ?? 0) >= limit) {
    redirect("/dashboard/staff");
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">스태프 추가</h1>
      <StaffForm submit={createStaff} submitLabel="등록" />
    </div>
  );
}
