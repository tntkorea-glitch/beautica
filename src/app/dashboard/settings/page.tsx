import { requireShop } from "@/lib/shop";
import { NaverBookingSettings } from "./NaverBookingSettings";

export default async function SettingsPage() {
  const { shop } = await requireShop();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">매장 설정</h1>

      <section className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="text-2xl">📅</span>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-900">네이버 예약 연동</h2>
            <p className="mt-1 text-sm text-gray-600">
              네이버 플레이스에서 들어오는 예약을 beautica 와 자동으로 연동합니다.
              <br />
              <span className="text-xs text-amber-700">
                ⚠️ 실제 양방향 sync 는 네이버 비즈니스(스마트플레이스) API 승인 후 활성화됩니다.
                지금은 on/off 설정과 매장 정보만 저장됩니다.
              </span>
            </p>
          </div>
        </div>

        <NaverBookingSettings
          initialEnabled={shop.naver_booking_enabled}
          initialBusinessId={shop.naver_booking_business_id ?? ""}
          initialPlaceUrl={shop.naver_place_url ?? ""}
        />
      </section>

      <section className="mt-6 rounded-lg border border-dashed bg-white p-6">
        <h2 className="text-base font-semibold text-gray-700">매장 기본 정보</h2>
        <p className="mt-1 text-sm text-gray-500">
          매장명/주소/연락처 등은 곧 별도 화면에서 수정 가능합니다.
        </p>
      </section>
    </div>
  );
}
