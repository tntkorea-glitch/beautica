import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./OnboardingForm";
import { Logo } from "@/components/brand/Logo";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("shop_users")
    .select("shops!inner(onboarding_completed)")
    .eq("user_id", user.id)
    .maybeSingle();

  const shop = existing?.shops as unknown as
    | { onboarding_completed: boolean }
    | null
    | undefined;
  const onboarded = !!shop?.onboarding_completed;

  if (onboarded) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm ring-1 ring-rose-gold-100">
        <div className="mb-3 flex justify-center">
          <Logo size="md" />
        </div>
        <h1 className="mb-1 text-center text-xl font-bold text-rose-gold-800">매장 정보 입력</h1>
        <p className="mb-6 text-center text-xs text-rose-gold-700/70">
          beautica 사용을 위해 매장 정보를 입력해주세요
        </p>
        <p className="mb-6 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
          입력하신 정보로 tnt-mall 거래처가 자동 등록되며, 제품 주문/자주 구매 기능에 사용됩니다.
        </p>
        <OnboardingForm userId={user.id} userEmail={user.email ?? ""} />
      </div>
    </main>
  );
}
