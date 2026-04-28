import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: shopUser } = await supabase
    .from("shop_users")
    .select("shop_id, shops!inner(onboarding_completed)")
    .eq("user_id", user.id)
    .maybeSingle();

  const shop = shopUser?.shops as unknown as
    | { onboarding_completed: boolean }
    | null
    | undefined;
  const onboarded = !!shop?.onboarding_completed;

  redirect(onboarded ? "/dashboard" : "/onboarding");
}
