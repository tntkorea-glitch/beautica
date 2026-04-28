import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicBookingForm } from "./PublicBookingForm";

const RESERVED_SLUGS = new Set([
  "login",
  "logout",
  "auth",
  "api",
  "dashboard",
  "onboarding",
  "admin",
]);

export default async function PublicBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  if (RESERVED_SLUGS.has(slug)) notFound();

  const admin = createAdminClient();
  const { data: shop } = await admin
    .from("shops")
    .select("id, name, slug, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (!shop || !shop.is_active) notFound();

  const { data: services } = await admin
    .from("services")
    .select("id, name, price_won, duration_min")
    .eq("shop_id", shop.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-2 text-xs text-gray-500">
          <Link href={`/${slug}`} className="hover:underline">
            ← {shop.name}
          </Link>
        </div>
        <h1 className="mb-6 text-2xl font-bold">예약 신청</h1>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <PublicBookingForm
            shopId={shop.id}
            shopSlug={shop.slug}
            services={services ?? []}
            initialServiceId={sp.service ?? ""}
          />
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          신청하시면 매장에서 확인 후 확정/거절 안내드립니다.
        </p>
      </div>
    </main>
  );
}
