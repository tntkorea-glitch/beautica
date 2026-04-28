import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicConsultForm } from "./PublicConsultForm";

const RESERVED_SLUGS = new Set([
  "login",
  "logout",
  "auth",
  "api",
  "dashboard",
  "onboarding",
  "admin",
]);

export default async function PublicConsultPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) notFound();

  const admin = createAdminClient();
  const { data: shop } = await admin
    .from("shops")
    .select("id, name, slug, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (!shop || !shop.is_active) notFound();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-2 text-xs text-gray-500">
          <Link href={`/${slug}`} className="hover:underline">
            ← {shop.name}
          </Link>
        </div>
        <h1 className="mb-6 text-2xl font-bold">상담 문의</h1>
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <PublicConsultForm shopId={shop.id} shopSlug={shop.slug} />
        </div>
        <p className="mt-6 text-center text-xs text-gray-500">
          매장에서 확인 후 답변드립니다.
        </p>
      </div>
    </main>
  );
}
