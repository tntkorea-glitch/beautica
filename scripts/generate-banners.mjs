import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../data-file/banners');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const COLORS = {
  roseGold: '#b76e79',
  roseLight: '#f1c7b8',
  roseDark: '#7d4254',
  sage: '#84a59d',
  sageDark: '#4f6e66',
  cream: '#faf6f1',
  cream100: '#f5ede0',
  dark: '#1f1610',
  white: '#ffffff',
};

/* ─── 1. Instagram Square 1080×1080 ─── */
const instagramHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1080px; overflow: hidden; font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; }

  .wrap {
    width: 1080px; height: 1080px;
    background: linear-gradient(145deg, ${COLORS.cream} 0%, ${COLORS.cream100} 100%);
    position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
  }

  /* 배경 장식 원 */
  .bg-circle-1 {
    position: absolute; top: -120px; right: -120px;
    width: 500px; height: 500px; border-radius: 50%;
    background: radial-gradient(circle, ${COLORS.roseLight}88 0%, transparent 70%);
  }
  .bg-circle-2 {
    position: absolute; bottom: -80px; left: -80px;
    width: 380px; height: 380px; border-radius: 50%;
    background: radial-gradient(circle, ${COLORS.sage}44 0%, transparent 70%);
  }
  .bg-circle-3 {
    position: absolute; top: 50%; left: -60px;
    width: 220px; height: 220px; border-radius: 50%;
    background: radial-gradient(circle, ${COLORS.roseLight}55 0%, transparent 70%);
  }

  /* 상단 브랜드 */
  .brand-block {
    text-align: center; margin-bottom: 52px; position: relative; z-index: 1;
  }
  .brand-tag {
    display: inline-block;
    background: ${COLORS.roseGold}; color: #fff;
    font-size: 22px; font-weight: 700; letter-spacing: 0.18em;
    padding: 10px 28px; border-radius: 100px; margin-bottom: 24px;
  }
  .brand-name {
    font-size: 96px; font-weight: 900; letter-spacing: 0.06em;
    color: ${COLORS.dark}; line-height: 1;
  }
  .brand-name span { color: ${COLORS.roseGold}; }
  .brand-sub {
    font-size: 28px; color: ${COLORS.sageDark}; margin-top: 14px; letter-spacing: 0.04em; font-weight: 500;
  }

  /* 구분선 */
  .divider {
    width: 80px; height: 3px;
    background: linear-gradient(90deg, ${COLORS.roseGold}, ${COLORS.sage});
    border-radius: 2px; margin: 36px auto; position: relative; z-index: 1;
  }

  /* 기능 그리드 */
  .features {
    display: grid; grid-template-columns: repeat(3, 200px); gap: 20px;
    position: relative; z-index: 1;
  }
  .feature-card {
    background: #ffffffcc; backdrop-filter: blur(8px);
    border: 1px solid ${COLORS.roseLight};
    border-radius: 20px; padding: 28px 20px; text-align: center;
  }
  .feature-icon { font-size: 40px; margin-bottom: 12px; }
  .feature-label { font-size: 20px; font-weight: 700; color: ${COLORS.dark}; margin-bottom: 6px; }
  .feature-desc { font-size: 15px; color: #7a6a6a; line-height: 1.4; }

  /* 하단 */
  .bottom {
    margin-top: 52px; text-align: center; position: relative; z-index: 1;
  }
  .bottom-url {
    font-size: 22px; color: ${COLORS.roseGold}; font-weight: 600; letter-spacing: 0.04em;
  }
  .bottom-cta {
    margin-top: 16px;
    display: inline-block;
    background: linear-gradient(135deg, ${COLORS.roseGold}, ${COLORS.roseDark});
    color: #fff; font-size: 22px; font-weight: 700;
    padding: 16px 48px; border-radius: 100px; letter-spacing: 0.06em;
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="bg-circle-1"></div>
  <div class="bg-circle-2"></div>
  <div class="bg-circle-3"></div>

  <div class="brand-block">
    <div class="brand-tag">뷰티샵 운영 통합 플랫폼</div>
    <div class="brand-name">BEAU<span>TICA</span></div>
    <div class="brand-sub">예약부터 제품 주문까지 — 한 곳에서</div>
  </div>

  <div class="divider"></div>

  <div class="features">
    <div class="feature-card">
      <div class="feature-icon">📅</div>
      <div class="feature-label">예약 캘린더</div>
      <div class="feature-desc">일·주·월 뷰<br>더블부킹 방지</div>
    </div>
    <div class="feature-card">
      <div class="feature-icon">👤</div>
      <div class="feature-label">고객 CRM</div>
      <div class="feature-desc">시술 이력·사진<br>알러지 관리</div>
    </div>
    <div class="feature-card">
      <div class="feature-icon">💬</div>
      <div class="feature-label">알림톡 자동화</div>
      <div class="feature-desc">예약 확정·D-1<br>리마인더 자동 발송</div>
    </div>
    <div class="feature-card">
      <div class="feature-icon">✂️</div>
      <div class="feature-label">시술 관리</div>
      <div class="feature-desc">메뉴·가격·사진<br>2단계 카테고리</div>
    </div>
    <div class="feature-card">
      <div class="feature-icon">🛒</div>
      <div class="feature-label">제품 주문</div>
      <div class="feature-desc">티엔티몰 연동<br>재주문 원클릭</div>
    </div>
    <div class="feature-card">
      <div class="feature-icon">📊</div>
      <div class="feature-label">매출 통계</div>
      <div class="feature-desc">예약·결제 현황<br>포인트 로열티</div>
    </div>
  </div>

  <div class="bottom">
    <div class="bottom-cta">무료로 시작하기</div>
    <div class="bottom-url" style="margin-top:16px">beautica.co.kr</div>
  </div>
</div>
</body>
</html>`;

/* ─── 2. Kakao Channel Banner 1200×675 ─── */
const kakaoHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1200px; height: 675px; overflow: hidden; font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; }

  .wrap {
    width: 1200px; height: 675px;
    display: flex; position: relative; overflow: hidden;
  }

  /* 좌측 컬러 패널 */
  .left {
    width: 520px; height: 100%; flex-shrink: 0;
    background: linear-gradient(155deg, ${COLORS.roseDark} 0%, ${COLORS.roseGold} 55%, #d4927e 100%);
    display: flex; flex-direction: column; justify-content: center;
    padding: 64px 56px; position: relative; overflow: hidden;
  }
  .left::before {
    content: '';
    position: absolute; top: -80px; right: -80px;
    width: 300px; height: 300px; border-radius: 50%;
    background: rgba(255,255,255,0.08);
  }
  .left::after {
    content: '';
    position: absolute; bottom: -60px; left: -60px;
    width: 240px; height: 240px; border-radius: 50%;
    background: rgba(255,255,255,0.06);
  }

  .left-tag {
    font-size: 16px; color: rgba(255,255,255,0.8); letter-spacing: 0.2em;
    font-weight: 600; margin-bottom: 20px; text-transform: uppercase;
  }
  .left-brand {
    font-size: 72px; font-weight: 900; color: #fff; letter-spacing: 0.08em;
    line-height: 1; margin-bottom: 20px;
  }
  .left-slogan {
    font-size: 22px; color: rgba(255,255,255,0.9); line-height: 1.5; font-weight: 400;
    border-top: 1px solid rgba(255,255,255,0.3); padding-top: 20px; margin-top: 4px;
  }
  .left-slogan strong { color: #fff; font-weight: 700; }
  .left-url {
    margin-top: 32px; font-size: 15px; color: rgba(255,255,255,0.7); letter-spacing: 0.04em;
  }

  /* 우측 기능 패널 */
  .right {
    flex: 1; height: 100%;
    background: ${COLORS.cream};
    display: flex; flex-direction: column; justify-content: center;
    padding: 48px 48px 48px 52px;
  }
  .right-title {
    font-size: 18px; font-weight: 700; color: ${COLORS.roseGold}; letter-spacing: 0.1em;
    margin-bottom: 28px; text-transform: uppercase;
  }
  .feat-list { display: flex; flex-direction: column; gap: 14px; }
  .feat-item {
    display: flex; align-items: flex-start; gap: 16px;
    background: #fff; border-radius: 14px; padding: 16px 20px;
    border-left: 4px solid ${COLORS.roseGold};
  }
  .feat-item.sage { border-left-color: ${COLORS.sage}; }
  .feat-emoji { font-size: 24px; flex-shrink: 0; line-height: 1.3; }
  .feat-text {}
  .feat-name { font-size: 16px; font-weight: 700; color: ${COLORS.dark}; }
  .feat-info { font-size: 13px; color: #8a7a7a; margin-top: 2px; line-height: 1.4; }

  .plan-bar {
    margin-top: 22px; background: #fff; border-radius: 14px;
    padding: 14px 20px; display: flex; align-items: center; gap: 12px;
    border: 1px solid ${COLORS.roseLight};
  }
  .plan-label { font-size: 14px; color: #7a6a6a; }
  .plan-badges { display: flex; gap: 8px; }
  .badge {
    font-size: 13px; font-weight: 700; padding: 4px 14px; border-radius: 100px;
    letter-spacing: 0.06em;
  }
  .badge.free { background: #f0f0f0; color: #888; }
  .badge.basic { background: ${COLORS.sage}22; color: ${COLORS.sageDark}; }
  .badge.pro { background: ${COLORS.roseGold}22; color: ${COLORS.roseDark}; }
</style>
</head>
<body>
<div class="wrap">
  <div class="left">
    <div class="left-tag">Beauty Shop Platform</div>
    <div class="left-brand">BEAUTICA</div>
    <div class="left-slogan">
      뷰티샵 운영의 <strong>모든 것</strong>을<br>
      한 플랫폼에서 해결하세요
    </div>
    <div class="left-url">beautica.co.kr</div>
  </div>

  <div class="right">
    <div class="right-title">핵심 기능</div>
    <div class="feat-list">
      <div class="feat-item">
        <div class="feat-emoji">📅</div>
        <div class="feat-text">
          <div class="feat-name">스마트 예약 캘린더</div>
          <div class="feat-info">일·주·월 뷰 + 더블부킹 방지 + 예약금 결제(토스페이먼츠)</div>
        </div>
      </div>
      <div class="feat-item">
        <div class="feat-emoji">👤</div>
        <div class="feat-text">
          <div class="feat-name">고객 CRM + 시술 이력</div>
          <div class="feat-info">고객 프로필·알러지·사진·포인트 로열티 통합 관리</div>
        </div>
      </div>
      <div class="feat-item sage">
        <div class="feat-emoji">💬</div>
        <div class="feat-text">
          <div class="feat-name">카카오 알림톡 자동화</div>
          <div class="feat-info">예약 확정 즉시 + D-1 리마인더 자동 발송</div>
        </div>
      </div>
      <div class="feat-item sage">
        <div class="feat-emoji">🛒</div>
        <div class="feat-text">
          <div class="feat-name">티엔티몰 제품 주문 연동</div>
          <div class="feat-info">자주 쓰는 제품 원클릭 재주문 — 별도 사이트 이동 없음</div>
        </div>
      </div>
    </div>
    <div class="plan-bar">
      <div class="plan-label">구독 플랜</div>
      <div class="plan-badges">
        <div class="badge free">FREE</div>
        <div class="badge basic">BASIC</div>
        <div class="badge pro">PRO</div>
      </div>
      <div class="plan-label" style="margin-left:auto; color:${COLORS.roseGold}; font-weight:700;">무료로 시작 →</div>
    </div>
  </div>
</div>
</body>
</html>`;

/* ─── 3. Web Header Banner 1920×400 ─── */
const webHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1920px; height: 400px; overflow: hidden; font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; }

  .wrap {
    width: 1920px; height: 400px;
    background: linear-gradient(110deg, ${COLORS.roseDark} 0%, ${COLORS.roseGold} 35%, #c8857a 58%, ${COLORS.sage} 100%);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 120px; position: relative; overflow: hidden;
  }

  /* 배경 패턴 */
  .deco-circle {
    position: absolute; border-radius: 50%;
    background: rgba(255,255,255,0.06);
  }
  .c1 { width: 500px; height: 500px; top: -180px; left: 360px; }
  .c2 { width: 320px; height: 320px; bottom: -140px; left: 700px; }
  .c3 { width: 420px; height: 420px; top: -160px; right: 300px; }
  .c4 { width: 200px; height: 200px; bottom: -80px; right: 100px; }

  /* 좌측 브랜드 */
  .left { position: relative; z-index: 1; }
  .tag {
    display: inline-block;
    background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.95);
    font-size: 15px; font-weight: 600; letter-spacing: 0.18em;
    padding: 6px 20px; border-radius: 100px; margin-bottom: 18px;
    border: 1px solid rgba(255,255,255,0.3);
  }
  .brand { font-size: 88px; font-weight: 900; color: #fff; letter-spacing: 0.08em; line-height: 1; }
  .slogan { font-size: 22px; color: rgba(255,255,255,0.85); margin-top: 14px; font-weight: 400; letter-spacing: 0.04em; }

  /* 중앙 기능 칩들 */
  .center { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 14px; align-items: center; }
  .chip-row { display: flex; gap: 12px; }
  .chip {
    background: rgba(255,255,255,0.18); backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,0.3); border-radius: 100px;
    padding: 10px 22px; color: #fff; font-size: 16px; font-weight: 600;
    display: flex; align-items: center; gap: 8px; white-space: nowrap;
  }

  /* 우측 CTA */
  .right { position: relative; z-index: 1; text-align: center; }
  .cta-sub { color: rgba(255,255,255,0.8); font-size: 18px; margin-bottom: 20px; font-weight: 400; }
  .cta-btn {
    display: inline-block;
    background: #fff; color: ${COLORS.roseDark};
    font-size: 22px; font-weight: 800; letter-spacing: 0.06em;
    padding: 18px 52px; border-radius: 100px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  }
  .cta-url { margin-top: 16px; color: rgba(255,255,255,0.7); font-size: 15px; letter-spacing: 0.04em; }
</style>
</head>
<body>
<div class="wrap">
  <div class="deco-circle c1"></div>
  <div class="deco-circle c2"></div>
  <div class="deco-circle c3"></div>
  <div class="deco-circle c4"></div>

  <div class="left">
    <div class="tag">뷰티샵 운영 통합 플랫폼</div>
    <div class="brand">BEAUTICA</div>
    <div class="slogan">예약부터 제품 주문까지 — 한 곳에서</div>
  </div>

  <div class="center">
    <div class="chip-row">
      <div class="chip">📅 예약 캘린더</div>
      <div class="chip">👤 고객 CRM</div>
      <div class="chip">💬 알림톡 자동화</div>
    </div>
    <div class="chip-row">
      <div class="chip">✂️ 시술 관리</div>
      <div class="chip">🛒 티엔티몰 제품 주문</div>
      <div class="chip">📊 매출 통계</div>
    </div>
    <div class="chip-row">
      <div class="chip">💳 토스 결제</div>
      <div class="chip">⭐ 포인트 로열티</div>
      <div class="chip">FREE · BASIC · PRO</div>
    </div>
  </div>

  <div class="right">
    <div class="cta-sub">지금 바로 시작하세요</div>
    <div class="cta-btn">무료로 시작하기</div>
    <div class="cta-url">beautica.co.kr</div>
  </div>
</div>
</body>
</html>`;

/* ─── 생성 실행 ─── */
const banners = [
  { name: 'instagram-1080x1080.png', html: instagramHTML, width: 1080, height: 1080 },
  { name: 'kakao-channel-1200x675.png', html: kakaoHTML, width: 1200, height: 675 },
  { name: 'web-header-1920x400.png', html: webHTML, width: 1920, height: 400 },
];

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

for (const b of banners) {
  const page = await browser.newPage();
  await page.setViewport({ width: b.width, height: b.height, deviceScaleFactor: 1 });
  await page.setContent(b.html, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(OUT_DIR, b.name), type: 'png', clip: { x: 0, y: 0, width: b.width, height: b.height } });
  console.log(`✅ ${b.name}`);
  await page.close();
}

await browser.close();
console.log(`\n📁 저장 위치: data-file/banners/`);
