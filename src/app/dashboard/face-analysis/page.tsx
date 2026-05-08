import { requireShop } from "@/lib/shop";
import { FaceAnalysisClient } from "./FaceAnalysisClient";

export default async function FaceAnalysisPage() {
  await requireShop();

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">얼굴형 &amp; 눈썹 분석</h1>
        <p className="mt-1 text-sm text-gray-500">
          고객 사진을 업로드하면 AI가 얼굴형과 최적의 눈썹 디자인을 분석해 리포트를 제공합니다.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        💡 정면을 바라보는 밝은 조명의 사진일수록 분석 정확도가 높아집니다. 고객 상담 전 함께 촬영하거나, 기존 보유 사진을 사용하세요.
      </div>

      <FaceAnalysisClient />
    </div>
  );
}
