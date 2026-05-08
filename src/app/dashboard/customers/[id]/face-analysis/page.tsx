import { notFound } from "next/navigation";
import Link from "next/link";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKST } from "@/lib/format";
import type { AnalysisResult } from "@/app/dashboard/face-analysis/actions";
import { AnalysisReport } from "@/app/dashboard/face-analysis/AnalysisReport";

export default async function CustomerFaceAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: customerId } = await params;
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data: customer } = await admin
    .from("customers")
    .select("id, name")
    .eq("id", customerId)
    .eq("shop_id", shop.id)
    .maybeSingle();
  if (!customer) notFound();

  const { data } = await admin
    .from("face_analysis_results")
    .select("id, analysis_json, created_at")
    .eq("shop_id", shop.id)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(20);

  const records = (data ?? []) as { id: string; analysis_json: AnalysisResult; created_at: string }[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {(customer as { name: string }).name} 고객의 얼굴형 &amp; 눈썹 분석 기록
        </p>
        <Link
          href={`/dashboard/face-analysis`}
          className="rounded-lg bg-[#c4896a] px-4 py-2 text-sm font-medium text-white hover:bg-[#b07a5e]"
        >
          + 새 분석
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          분석 기록이 없습니다.
          <div className="mt-3">
            <Link href="/dashboard/face-analysis" className="text-[#c4896a] hover:underline">
              얼굴 분석 시작하기 →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {records.map((r) => (
            <div key={r.id}>
              <p className="mb-3 text-xs font-medium text-gray-400">
                분석일: {formatKST(r.created_at)}
              </p>
              <AnalysisReport
                result={r.analysis_json}
                imageDataUrl=""
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
