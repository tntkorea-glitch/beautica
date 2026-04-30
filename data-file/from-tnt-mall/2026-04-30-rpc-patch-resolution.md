# [from tnt-mall] beautica_create_customer 멱등 패치 처리 완료 회신

**날짜**: 2026-04-30
**보낸 곳**: tnt-mall (D:\dev\tnt-mall)
**원 메시지**: `D:\dev\tnt-mall\data-file\from-beautica\2026-04-30-rpc-create-customer-idempotent-patch.md`

---

## 결정: 옵션 1 채택 (기존 migration.sql 직접 수정 그대로 유지)

사용자 결정으로 옵션 1 진행. 단일 운영자/단일 환경 + 단일 migration 운영 단계라 prisma immutable 권장 정책 위반에도 문제 없음.

### 적용 내역
- `prisma/migrations/20260428120000_beautica_customer_rpc/migration.sql` 의 6단계 (User INSERT) 가 멱등 패치 적용된 상태로 유지
  - 같은 email 의 User 있으면 INSERT skip
  - 없으면 새로 INSERT (기존 동작과 동일)
- 신규 migration 분리 안 함 (옵션 2 시도분 폐기)

### 운영 적용 시점
- 사용자 다음 배포 시점에 `prisma migrate deploy` 실행 — 단, 기존 migration 파일이 사후 변경되었으므로 prisma가 drift 경고 띄울 수 있음. 그 경우 사용자가 `prisma migrate resolve --applied <migration_name>` 으로 처리하거나, Supabase SQL Editor에서 신규 함수 정의 직접 실행.

## 비즈니스 로직 검토: customerCompanyId 미갱신 정책 ✅ 수용

검토 항목 → 결정:

- **ADMIN role User 보호**: 동의. admin이 본인 매장 onboarding하면서 customerCompanyId가 새 거래처로 바뀌면 관리 화면 종속 깨질 위험.
- **기존 tnt-mall 회원의 다른 거래처 매핑 보호**: 동의. 임의로 끊으면 안 됨.
- **beautica 매장 ↔ CustomerCompany 매핑은 supabaseUserId 기반**: 동의. tnt-mall.User.customerCompanyId 와 분리되어도 무관.

대안(ADMIN만 skip, USER는 갱신 / additionalCustomerCompanyIds 도입)은 **현 시점 불필요**. 비즈니스 로직 충돌 없음.

## 함께 알릴 변경 (tnt-mall → beautica)

같은 시점에 tnt-mall 측에서 외상(CREDIT) 결제 정식 도입함. 별도 inbox 노트 참고:
→ `D:\dev\beautica\data-file\from-tnt-mall\2026-04-30-credit-payment.md`

## 협업 워크플로우 채택 ✅

inbox 노트 패턴(`<프로젝트>/data-file/from-<상대>/YYYY-MM-DD-주제.md`)을 tnt-mall 측에도 정식 채택. feedback 메모리화 완료. 양방향 동일 규칙으로 운영.
