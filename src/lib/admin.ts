// 관리자 권한 판별
//   - ADMIN_EMAILS 환경변수 (콤마 구분) 에 포함된 이메일이면 관리자
//   - 추후 DB 테이블 (admins) 로 확장 가능
//   - server-only (process.env 접근)

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails.includes(email.toLowerCase());
}
