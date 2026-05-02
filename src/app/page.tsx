import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/brand/Logo";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: shopUser } = await supabase
      .from("shop_users")
      .select("shop_id, shops!inner(onboarding_completed)")
      .eq("user_id", user.id)
      .maybeSingle();
    const shop = shopUser?.shops as unknown as { onboarding_completed: boolean } | null;
    redirect(shop?.onboarding_completed ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="min-h-screen bg-white">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderColor: "var(--rose-gold-100)" }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo size="md" />
          <Link
            href="/login"
            className="rounded-xl px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
            style={{ background: "var(--rose-gold-500)" }}
          >
            무료로 시작하기
          </Link>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-6 pb-28 pt-24 text-center"
        style={{ background: "linear-gradient(160deg, #fdf6f3 0%, #f9e6df 45%, #faf6f1 100%)" }}
      >
        {/* 데코 블롭 */}
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, #e3a08a44, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, #b76e7933, transparent 70%)" }}
        />

        <div className="relative mx-auto max-w-3xl">
          {/* 베타 뱃지 */}
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
            style={{ background: "var(--rose-gold-100)", color: "var(--rose-gold-600)" }}
          >
            ✦ 베타 무료 운영 중
          </div>

          {/* 헤드라인 */}
          <h1 className="mb-6 text-5xl font-extrabold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
            <span style={{ color: "var(--rose-gold-900)" }}>뷰티샵 운영,</span>
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, var(--rose-gold-500) 0%, var(--rose-gold-800) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              이제 하나로
            </span>
          </h1>

          {/* 서브텍스트 */}
          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-gray-500">
            예약·고객 관리부터 제품 주문, 포인트 적립까지
            <br />
            원장님이 <strong className="font-semibold text-gray-700">시술에만 집중</strong>할 수 있도록 만들었어요
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="rounded-2xl px-10 py-4 text-base font-bold text-white shadow-xl transition hover:-translate-y-0.5 hover:opacity-90"
              style={{ background: "linear-gradient(135deg, var(--rose-gold-500) 0%, var(--rose-gold-700) 100%)" }}
            >
              무료로 시작하기 →
            </Link>
            <Link
              href="#features"
              className="rounded-2xl border-2 px-8 py-4 text-base font-semibold transition hover:bg-white"
              style={{ borderColor: "var(--rose-gold-200)", color: "var(--rose-gold-700)" }}
            >
              기능 둘러보기
            </Link>
          </div>

          {/* 플로팅 뱃지 */}
          <div className="mt-10 flex flex-wrap justify-center gap-2.5">
            {[
              "📅 스마트 예약 관리",
              "👥 고객 이력 관리",
              "🛒 tnt-mall 제품 직결",
              "💎 포인트 1% 적립",
              "💰 베타 기간 무료",
            ].map((b) => (
              <span
                key={b}
                className="rounded-full px-4 py-2 text-sm font-medium shadow-sm"
                style={{
                  background: "white",
                  color: "var(--rose-gold-800)",
                  border: "1px solid var(--rose-gold-100)",
                }}
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PAIN POINTS ────────────────────────────────────── */}
      <section className="py-24" style={{ background: "var(--cream-50)" }}>
        <div className="mx-auto max-w-5xl px-6">
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest" style={{ color: "var(--rose-gold-400)" }}>
            공감하시나요?
          </p>
          <h2 className="mb-3 text-center text-3xl font-bold tracking-tight" style={{ color: "var(--rose-gold-900)" }}>
            이런 불편함, 혼자가 아니에요
          </h2>
          <p className="mb-14 text-center text-sm text-gray-400">beautica가 하나씩 해결해드려요</p>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                before: "예약 전화 받다가\n시술에 집중 못한 적 있다",
                after: "앱으로 예약 자동 관리\n전화 없이도 운영 가능",
                icon: "📱",
              },
              {
                before: "노쇼 때문에\n하루 매출이 통째로 날아갔다",
                after: "예약금 선결제로\n노쇼 걱정 제로",
                icon: "🚫",
              },
              {
                before: "제품 앱 따로, 예약 앱 따로\n앱이 너무 많아 복잡하다",
                after: "beautica 하나로\n모든 게 해결",
                icon: "🎯",
              },
            ].map((item) => (
              <div
                key={item.icon}
                className="rounded-3xl p-7"
                style={{ background: "white", border: "1px solid var(--rose-gold-100)" }}
              >
                <div className="mb-5 text-3xl">{item.icon}</div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-300">Before</p>
                <p className="mb-5 whitespace-pre-line text-sm leading-relaxed text-gray-400 line-through">
                  {item.before}
                </p>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--rose-gold-400)" }}>
                  After ✓
                </p>
                <p className="whitespace-pre-line font-bold leading-relaxed" style={{ color: "var(--rose-gold-800)" }}>
                  {item.after}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────── */}
      <section id="features" className="py-24" style={{ background: "var(--rose-gold-900)" }}>
        <div className="mx-auto max-w-5xl px-6">
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest" style={{ color: "var(--rose-gold-400)" }}>
            핵심 기능
          </p>
          <h2 className="mb-3 text-center text-3xl font-bold tracking-tight text-white">
            뷰티샵 운영에 꼭 필요한 것들만
          </h2>
          <p className="mb-14 text-center text-sm" style={{ color: "var(--rose-gold-300)" }}>
            복잡한 기능 없이, 원장님에게 진짜 필요한 것만 담았어요
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: "📅",
                title: "스마트 예약 관리",
                desc: "예약 확정·취소·노쇼 처리까지. 고객 온라인 예약 페이지 자동 생성.",
              },
              {
                icon: "👥",
                title: "고객 이력 관리",
                desc: "시술 기록, 상담 차트, 동의서를 디지털로. 고객 카드를 한눈에.",
              },
              {
                icon: "🤖",
                title: "AI 어시스턴트",
                desc: '"이소영 고객 등록해줘" — 전화받으며 말하듯 운영하세요.',
              },
              {
                icon: "🛒",
                title: "제품 주문",
                desc: "tnt-mall 도매가 직결. 자주 구매한 상품 한 번에 재주문.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl p-6"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div className="mb-4 text-3xl">{f.icon}</div>
                <h3 className="mb-2 font-bold text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--rose-gold-200)" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TNT-MALL DIFFERENTIATOR ─────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div
            className="overflow-hidden rounded-3xl p-10 md:flex md:items-center md:gap-16"
            style={{
              background: "linear-gradient(135deg, var(--rose-gold-50) 0%, var(--cream-100) 100%)",
              border: "1px solid var(--rose-gold-100)",
            }}
          >
            <div className="mb-8 md:mb-0 md:flex-1">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--rose-gold-400)" }}>
                beautica only
              </p>
              <h2 className="mb-4 text-2xl font-bold leading-snug tracking-tight" style={{ color: "var(--rose-gold-900)" }}>
                제품 주문까지
                <br />
                하나의 앱에서
              </h2>
              <p className="text-sm leading-relaxed text-gray-500">
                tnt-mall과 직접 연동되어 시술 제품을 도매가로 주문하고,
                자주 구매한 상품을 한 번에 재주문할 수 있습니다.
                다른 앱을 따로 쓸 필요가 없어요.
              </p>
            </div>
            <div className="space-y-3 md:flex-1">
              {[
                { label: "등급별 도매가 자동 적용", sub: "TICA New · Star · Crown · 딜러가", icon: "💰" },
                { label: "자주 구매 빠른 재주문", sub: "최근 구매 이력 자동 저장", icon: "⚡" },
                { label: "신상품 알림", sub: "tnt-mall 신규 입고 대시보드 즉시 노출", icon: "🆕" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-4 rounded-2xl px-5 py-4"
                  style={{ background: "white", border: "1px solid var(--rose-gold-100)" }}
                >
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--rose-gold-800)" }}>{item.label}</p>
                    <p className="text-xs text-gray-400">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── LOYALTY LOOP ───────────────────────────────────── */}
      <section className="py-24" style={{ background: "var(--cream-50)" }}>
        <div className="mx-auto max-w-5xl px-6">
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest" style={{ color: "var(--rose-gold-400)" }}>
            로열티 프로그램
          </p>
          <h2 className="mb-3 text-center text-3xl font-bold tracking-tight" style={{ color: "var(--rose-gold-900)" }}>
            예약할수록 쌓이는 혜택
          </h2>
          <p className="mb-14 text-center text-sm text-gray-400">
            beautica 포인트로 tnt-mall 제품을 더 싸게 구매하세요
          </p>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {[
              { icon: "📅", label: "예약 완료", sub: "시술 금액의 1% 포인트 즉시 적립" },
              null,
              { icon: "💎", label: "포인트 누적", sub: "어느 샵에서나 함께 적립되는 공용 포인트" },
              null,
              { icon: "🛒", label: "tnt-mall 할인", sub: "제품 주문 시 포인트로 결제" },
            ].map((item, i) =>
              item === null ? (
                <div key={i} className="flex justify-center text-2xl text-gray-200 sm:self-center">
                  →
                </div>
              ) : (
                <div
                  key={i}
                  className="flex flex-1 flex-col items-center rounded-2xl p-6 text-center"
                  style={{ background: "white", border: "1px solid var(--rose-gold-100)" }}
                >
                  <div className="mb-3 text-3xl">{item.icon}</div>
                  <p className="mb-1 text-sm font-bold" style={{ color: "var(--rose-gold-800)" }}>
                    {item.label}
                  </p>
                  <p className="text-xs leading-relaxed text-gray-400">{item.sub}</p>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── COMPARISON ─────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest" style={{ color: "var(--rose-gold-400)" }}>
            비교
          </p>
          <h2 className="mb-3 text-center text-3xl font-bold tracking-tight" style={{ color: "var(--rose-gold-900)" }}>
            왜 beautica인가요?
          </h2>
          <p className="mb-10 text-center text-sm text-gray-400">기존 솔루션과 비교해보세요</p>

          <div className="overflow-hidden rounded-3xl shadow-sm" style={{ border: "1px solid var(--rose-gold-100)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--rose-gold-900)" }}>
                  <th className="w-2/5 py-5 pl-7 text-left text-xs font-semibold text-white">기능</th>
                  <th className="py-5 text-center text-xs font-bold" style={{ color: "var(--rose-gold-300)" }}>
                    beautica
                  </th>
                  <th className="py-5 text-center text-xs text-gray-400">기존 예약앱</th>
                  <th className="py-5 pr-5 text-center text-xs text-gray-400">기존 제품몰</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white" style={{ borderColor: "var(--rose-gold-50)" }}>
                {[
                  { feature: "예약 + 제품 통합", beautica: "✓ 하나의 앱", a: "✗", b: "✗" },
                  { feature: "tnt-mall 도매가 직결", beautica: "✓", a: "✗", b: "△ 별도 가입" },
                  { feature: "AI 어시스턴트", beautica: "✓", a: "✗", b: "✗" },
                  { feature: "포인트 → 제품 할인", beautica: "✓", a: "✗", b: "✗" },
                  { feature: "예약금 (노쇼 방지)", beautica: "✓ 카드/간편결제", a: "△ 일부만", b: "✗" },
                  { feature: "가격", beautica: "무료 (베타)", a: "유료 구독", b: "별도 비용" },
                ].map((row) => (
                  <tr key={row.feature} className="transition hover:bg-rose-50">
                    <td className="py-4 pl-7 font-medium text-gray-700">{row.feature}</td>
                    <td className="py-4 text-center font-bold" style={{ color: "var(--rose-gold-500)" }}>
                      {row.beautica}
                    </td>
                    <td className="py-4 text-center text-gray-300">{row.a}</td>
                    <td className="py-4 pr-5 text-center text-gray-300">{row.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-xs text-gray-300">
            * 기존 예약앱: 일반 뷰티샵 예약 SaaS 기준 · 기존 제품몰: 뷰티 제품 도매 쇼핑몰 기준
          </p>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────── */}
      <section className="py-24" style={{ background: "var(--cream-50)" }}>
        <div className="mx-auto max-w-md px-6">
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest" style={{ color: "var(--rose-gold-400)" }}>
            요금
          </p>
          <h2 className="mb-3 text-center text-3xl font-bold tracking-tight" style={{ color: "var(--rose-gold-900)" }}>
            지금은 얼리액세스 무료
          </h2>
          <p className="mb-10 text-center text-sm leading-relaxed text-gray-400">
            베타 기간 동안 모든 기능을 무료로 사용할 수 있습니다.
            <br />
            정식 출시 전 가입 시 장기 할인 혜택 제공 예정
          </p>

          <div
            className="rounded-3xl p-8 shadow-md"
            style={{ background: "white", border: "1px solid var(--rose-gold-100)" }}
          >
            <div className="mb-7 flex items-end justify-between">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--rose-gold-500)" }}>
                  얼리액세스
                </p>
                <p className="text-4xl font-extrabold" style={{ color: "var(--rose-gold-900)" }}>
                  무료
                </p>
                <p className="mt-1 text-xs text-gray-400">베타 기간 종료 전까지</p>
              </div>
              <span
                className="rounded-2xl px-3 py-1.5 text-xs font-bold"
                style={{ background: "var(--rose-gold-100)", color: "var(--rose-gold-600)" }}
              >
                LIMITED
              </span>
            </div>

            <ul className="mb-8 space-y-3">
              {[
                "예약 관리 (무제한)",
                "고객 이력·상담 차트·동의서",
                "AI 어시스턴트",
                "tnt-mall 도매가 제품 주문",
                "고객용 온라인 예약 페이지",
                "포인트 1% 적립",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-gray-600">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: "var(--rose-gold-500)" }}
                  >
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/login"
              className="block w-full rounded-2xl py-4 text-center text-sm font-bold text-white shadow-lg transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, var(--rose-gold-500) 0%, var(--rose-gold-700) 100%)" }}
            >
              지금 무료로 시작하기 →
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA BAND ───────────────────────────────────────── */}
      <section
        className="py-24 text-center"
        style={{ background: "linear-gradient(135deg, var(--rose-gold-800) 0%, var(--rose-gold-900) 100%)" }}
      >
        <div className="mx-auto max-w-xl px-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--rose-gold-300)" }}>
            지금 바로
          </p>
          <h2 className="mb-4 text-3xl font-bold text-white">
            원장님의 매장,<br />
            beautica와 함께 시작해보세요
          </h2>
          <p className="mb-10 text-sm leading-relaxed" style={{ color: "var(--rose-gold-200)" }}>
            무료로 가입하고 매장을 등록하면 바로 사용할 수 있습니다
          </p>
          <Link
            href="/login"
            className="inline-block rounded-2xl px-10 py-4 text-base font-bold text-white shadow-xl transition hover:opacity-90 hover:-translate-y-0.5"
            style={{ background: "var(--rose-gold-500)" }}
          >
            Google로 무료 시작하기 →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="py-10 text-center" style={{ background: "var(--rose-gold-900)" }}>
        <p className="text-xs" style={{ color: "var(--rose-gold-500)" }}>
          beautica.co.kr &copy; {new Date().getFullYear()} TNT Korea · 사업자등록번호 896-87-00493
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--rose-gold-700)" }}>
          문의 tntkorea@tntkorea.co.kr
        </p>
      </footer>
    </main>
  );
}
