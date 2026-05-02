import { requireShop } from "@/lib/shop";
import { NaverBookingSettings } from "./NaverBookingSettings";
import { ShopInfoForm } from "./ShopInfoForm";
import { DepositSettingsForm } from "./DepositSettingsForm";
import { BusinessHoursForm } from "./BusinessHoursForm";
import { NotificationSettingsForm } from "./NotificationSettingsForm";
import { PostNotifyForm } from "./PostNotifyForm";

export default async function SettingsPage() {
  const { shop } = await requireShop();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">매장 설정</h1>

      {/* 매장 기본 정보 */}
      <section className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="text-2xl">🏪</span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">매장 기본 정보</h2>
            <p className="mt-0.5 text-sm text-gray-500">매장명, 연락처, 주소, 소개를 수정합니다.</p>
          </div>
        </div>
        <ShopInfoForm
          name={shop.name ?? ""}
          phone={shop.phone ?? ""}
          address={shop.address ?? ""}
          description={shop.description ?? ""}
        />
      </section>

      {/* 예약금 설정 */}
      <section className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="text-2xl">💳</span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">예약금 설정</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              노쇼 방지를 위해 예약 시 선결제를 받을 수 있습니다.
            </p>
          </div>
        </div>
        <DepositSettingsForm
          initialRequired={shop.deposit_required}
          initialAmount={shop.deposit_amount}
          initialType={shop.deposit_type ?? "FIXED"}
          initialPercent={shop.deposit_percent ?? 0}
          initialWaitMin={shop.deposit_wait_min ?? 30}
          initialCancelMin={shop.deposit_cancel_min ?? 1440}
          initialMemberExcept={shop.deposit_member_except ?? false}
        />
      </section>

      {/* 운영시간 */}
      <section className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="text-2xl">🕐</span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">운영 시간</h2>
            <p className="mt-0.5 text-sm text-gray-500">요일별 영업/휴무·오픈·마감 시간을 설정합니다.</p>
          </div>
        </div>
        <BusinessHoursForm initialHours={shop.business_hours} />
      </section>

      {/* 알림톡 */}
      <section className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="text-2xl">💬</span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">카카오 알림톡</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              예약 확정·취소 시 고객에게 카카오 알림톡을 자동 발송합니다.
            </p>
          </div>
        </div>
        <NotificationSettingsForm
          initialEnabled={shop.kakao_notify_enabled}
          initialPhone={shop.notification_phone ?? ""}
        />
      </section>

      {/* 시술 후 알림 */}
      <section className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="text-2xl">📩</span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">시술 후 자동 알림</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              시술 완료 후 일정 시간이 지나면 고객에게 자동으로 감사/후기 알림톡을 발송합니다.
            </p>
          </div>
        </div>
        <PostNotifyForm
          initialEnabled={shop.post_notify_enabled ?? false}
          initialDelayH={shop.post_notify_delay_h ?? 24}
        />
      </section>

      {/* 네이버 예약 연동 */}
      <section className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="text-2xl">📅</span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">네이버 예약 연동</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              네이버 플레이스 예약을 beautica 와 연동합니다.{" "}
              <span className="text-xs text-amber-700">
                ⚠️ 실제 sync 는 스마트플레이스 API 승인 후 활성화
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
    </div>
  );
}
