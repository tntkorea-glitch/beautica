// 한국 시간 (KST) 포맷 모음 — server/client 일관 (toLocaleString hydration mismatch 방지)
//   - 모두 +09:00 고정 오프셋으로 계산. Intl 의존 없음.
//   - iso 가 null/undefined/유효하지 않으면 "-".
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

function toKstParts(iso: string | Date | null | undefined) {
  if (iso == null) return null;
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d.getTime())) return null;
  const k = new Date(d.getTime() + KST_OFFSET_MS);
  return {
    yyyy: k.getUTCFullYear(),
    mm: k.getUTCMonth() + 1,
    dd: k.getUTCDate(),
    hh: k.getUTCHours(),
    mi: k.getUTCMinutes(),
    weekday: WEEKDAY_KO[k.getUTCDay()],
  };
}

const pad2 = (n: number) => String(n).padStart(2, "0");

// "2026-04-30 10:45" (또는 "2026-04-30")
export function formatKST(iso: string | Date | null | undefined, withTime = true): string {
  const p = toKstParts(iso);
  if (!p) return "-";
  const date = `${p.yyyy}-${pad2(p.mm)}-${pad2(p.dd)}`;
  return withTime ? `${date} ${pad2(p.hh)}:${pad2(p.mi)}` : date;
}

// "2026년 4월 30일"
export function formatKSTFullDate(iso: string | Date | null | undefined): string {
  const p = toKstParts(iso);
  if (!p) return "-";
  return `${p.yyyy}년 ${p.mm}월 ${p.dd}일`;
}

// "4월 30일 (목)"
export function formatKSTMonthDayWeekday(iso: string | Date | null | undefined): string {
  const p = toKstParts(iso);
  if (!p) return "-";
  return `${p.mm}월 ${p.dd}일 (${p.weekday})`;
}

// "4월 30일 (목) 15:30"
export function formatKSTMonthDayWeekdayTime(iso: string | Date | null | undefined): string {
  const p = toKstParts(iso);
  if (!p) return "-";
  return `${p.mm}월 ${p.dd}일 (${p.weekday}) ${pad2(p.hh)}:${pad2(p.mi)}`;
}

// "15:30"
export function formatKSTTime(iso: string | Date | null | undefined): string {
  const p = toKstParts(iso);
  if (!p) return "-";
  return `${pad2(p.hh)}:${pad2(p.mi)}`;
}

// 한국 전화번호 자동 하이픈
//   010-1234-5678 (휴대폰)
//   02-1234-5678 (서울)
//   031-123-4567 (지역)
export function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;

  if (d.startsWith("02")) {
    if (d.length < 6) return `${d.slice(0, 2)}-${d.slice(2)}`;
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }

  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

// 사업자번호 자동 하이픈
//   123-45-67890 (10자리)
export function formatBusinessNumber(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}
