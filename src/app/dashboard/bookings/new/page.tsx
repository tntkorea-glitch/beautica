import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { BookingForm } from "./BookingForm";
import { createBooking } from "../actions";

export default async function NewBookingPage() {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const [services, customers, staff] = await Promise.all([
    admin
      .from("services")
      .select("id, name, category, price_won, duration_min")
      .eq("shop_id", shop.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    admin
      .from("customers")
      .select("id, name, phone")
      .eq("shop_id", shop.id)
      .order("name"),
    admin
      .from("staff")
      .select("id, name, display_color, position")
      .eq("shop_id", shop.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">예약 추가</h1>
      <BookingForm
        services={services.data ?? []}
        customers={customers.data ?? []}
        staff={staff.data ?? []}
        submit={createBooking}
      />
    </div>
  );
}
