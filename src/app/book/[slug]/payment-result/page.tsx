import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { finalizeBookingPayment } from "../actions";

export default async function PaymentResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const paymentKey = typeof sp.paymentKey === "string" ? sp.paymentKey : null;
  const orderId = typeof sp.orderId === "string" ? sp.orderId : null;
  const amount = typeof sp.amount === "string" ? Number(sp.amount) : null;

  // 실패 케이스: 토스가 ?code=...&message=... 로 돌아옴
  const errorCode = typeof sp.code === "string" ? sp.code : null;
  const errorMsg = typeof sp.message === "string" ? sp.message : null;

  const isFailure = !!errorCode || !paymentKey || !orderId || !amount || Number.isNaN(amount);

  return (
    <main className="min-h-screen" style={{ background: "var(--cream-50)" }}>
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-lg items-center">
          <Logo size="sm" />
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-10 pb-16">
        {isFailure ? (
          <FailureCard slug={slug} code={errorCode} message={errorMsg} />
        ) : (
          <SuccessCard
            slug={slug}
            paymentKey={paymentKey!}
            orderId={orderId!}
            amount={amount!}
          />
        )}
      </div>
    </main>
  );
}

// ─── 성공: 서버에서 결제 승인 + 예약 확정 ──────────────────────
async function SuccessCard({
  slug,
  paymentKey,
  orderId,
  amount,
}: {
  slug: string;
  paymentKey: string;
  orderId: string;
  amount: number;
}) {
  const result = await finalizeBookingPayment({ paymentKey, orderId, amount });

  if (result.error) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1" style={{ borderColor: "var(--red-100, #fee2e2)" }}>
        <div className="mb-4 text-5xl">⚠️</div>
        <h2 className="mb-2 text-xl font-bold text-red-700">결제 승인 실패</h2>
        <p className="text-sm text-gray-500">{result.error}</p>
        <Link
          href={`/book/${slug}`}
          className="mt-6 inline-block rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--rose-gold-500)" }}
        >
          예약 다시 시도
        </Link>
      </div>
    );
  }

  const { booking, pointsEarned } = result;

  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1" style={{ borderColor: "var(--rose-gold-100)" }}>
      <div className="mb-4 text-5xl">🌸</div>
      <h2 className="mb-2 text-xl font-bold" style={{ color: "var(--rose-gold-800)" }}>
        예약금 결제 완료!
      </h2>
      <p className="mb-6 text-sm text-gray-500 leading-relaxed">
        <strong>{booking?.shopName}</strong>에 예약금이 결제되었습니다.<br />
        원장님 확인 후 예약이 확정됩니다.
      </p>

      <div className="rounded-xl p-4 text-left text-sm space-y-2 mb-4" style={{ background: "var(--cream-100)" }}>
        <div className="flex justify-between">
          <span className="text-gray-400">예약자</span>
          <span className="font-medium text-gray-700">{booking?.guestName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">일시</span>
          <span className="font-medium text-gray-700">
            {booking?.startAt ? new Date(booking.startAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">예약금</span>
          <span className="font-bold" style={{ color: "var(--rose-gold-600)" }}>
            {amount.toLocaleString("ko-KR")}원
          </span>
        </div>
      </div>

      {(pointsEarned ?? 0) > 0 && (
        <div className="rounded-xl p-3 text-sm mb-4 text-center" style={{ background: "var(--rose-gold-50)", border: "1px solid var(--rose-gold-100)" }}>
          <span style={{ color: "var(--rose-gold-600)" }}>✨ {pointsEarned}포인트 적립!</span>
          <span className="text-xs text-gray-400 ml-2">tnt-mall 주문 시 사용 가능</span>
        </div>
      )}

      <p className="text-xs text-gray-400">
        예약 확정 후 별도 연락드립니다.
      </p>
    </div>
  );
}

// ─── 실패 ─────────────────────────────────────────────────────
function FailureCard({ slug, code, message }: { slug: string; code: string | null; message: string | null }) {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1" style={{ borderColor: "var(--rose-gold-100)" }}>
      <div className="mb-4 text-5xl">😢</div>
      <h2 className="mb-2 text-xl font-bold text-gray-800">결제가 취소되었습니다</h2>
      <p className="mb-6 text-sm text-gray-500 leading-relaxed">
        {message ?? "결제 과정에서 문제가 발생했습니다."}
        {code && <span className="block text-xs text-gray-300 mt-1">오류코드: {code}</span>}
      </p>
      <Link
        href={`/book/${slug}`}
        className="inline-block rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        style={{ background: "var(--rose-gold-500)" }}
      >
        다시 예약하기
      </Link>
    </div>
  );
}
