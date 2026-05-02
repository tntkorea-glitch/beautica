import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/brand/Logo";
import { BookingClient } from "./BookingClient";

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: shop } = await admin
    .from("shops")
    .select("id, name, slug, phone, address, owner_name, is_active, deposit_required, deposit_amount, bank_code, bank_name, bank_account_no, bank_holder")
    .eq("slug", slug)
    .maybeSingle();

  if (!shop || !shop.is_active) notFound();

  const { data: services } = await admin
    .from("services")
    .select("id, name, category, price_won, duration_min, photo_url")
    .eq("shop_id", shop.id)
    .eq("is_active", true)
    .order("display_order");

  return (
    <main className="min-h-screen" style={{ background: "var(--cream-50)" }}>
      {/* header */}
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Logo size="sm" />
          <p className="text-sm font-semibold text-gray-700">{shop.name as string}</p>
        </div>
      </header>

      {/* shop info */}
      <div className="mx-auto max-w-lg px-4 pt-6 pb-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 mb-5" style={{ borderColor: "var(--rose-gold-100)" }}>
          <h1 className="mb-1 text-xl font-bold" style={{ color: "var(--rose-gold-800)" }}>
            {shop.name as string}
          </h1>
          {shop.address && (
            <p className="text-xs text-gray-400">📍 {shop.address as string}</p>
          )}
          {shop.phone && (
            <p className="text-xs text-gray-400">📞 {shop.phone as string}</p>
          )}
        </div>

        <BookingClient
          shop={{
            id: shop.id as string,
            name: shop.name as string,
            slug: shop.slug as string,
            depositRequired: (shop.deposit_required as boolean | null) ?? false,
            depositAmount: (shop.deposit_amount as number | null) ?? 0,
            bankCode: (shop.bank_code as string | null) ?? null,
            bankName: (shop.bank_name as string | null) ?? null,
            bankAccountNo: (shop.bank_account_no as string | null) ?? null,
            bankHolder: (shop.bank_holder as string | null) ?? null,
          }}
          services={(services ?? []).map((s) => ({
            id: s.id as string,
            name: s.name as string,
            category: s.category as string | null,
            price_won: s.price_won as number | null,
            duration_min: s.duration_min as number | null,
            photo_url: (s.photo_url as string | null) ?? null,
          }))}
        />
      </div>

      <footer className="py-8 text-center text-xs text-gray-300">
        Powered by beautica.co.kr
      </footer>
    </main>
  );
}
