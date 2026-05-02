import { requireShop } from "@/lib/shop";
import { AIAssistantClient } from "./AIAssistantClient";

export default async function AIAssistantPage() {
  await requireShop();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-100 px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">AI 어시스턴트</h1>
        <p className="mt-0.5 text-xs text-gray-400">
          고객 등록, 예약 확인 등을 자연어로 처리합니다
        </p>
      </div>
      <AIAssistantClient />
    </div>
  );
}
