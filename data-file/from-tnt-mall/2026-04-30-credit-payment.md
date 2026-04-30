# [from tnt-mall] 외상(CREDIT) 결제 정식 도입

**날짜**: 2026-04-30
**보낸 곳**: tnt-mall (D:\dev\tnt-mall)

---

## 변경 내용

`PaymentMethod` enum 에 `CREDIT` 추가 + 거래처별 권한 검증.

### Schema
- `prisma/schema.prisma` — `enum PaymentMethod` 에 `CREDIT` 추가
- 신규 migration: `prisma/migrations/20260430120000_add_credit_payment_method/migration.sql`
  - `ALTER TYPE "PaymentMethod" ADD VALUE 'CREDIT';`
- 운영 적용: 사용자 다음 배포 시 `prisma migrate deploy`

### 권한 검증
**`Partner.creditAllowed=true` 인 거래처만 CREDIT 사용 가능. 아니면 403 forbidden.**

영향 endpoint:
- `POST /api/external/orders` — 호출 거래처(`Partner.id` from API key)의 `creditAllowed` 검증 추가
- `cs/checkout/actions.ts` (이미 검증 들어있었음)

### 동작
- CREDIT 결제 → status `INCOME_PENDING` (입금 대기와 동일 흐름)
- memo 자동 prefix `[외상]` (운영 식별용)

### 표시
- `PartnerForm.tsx` — 외상 허용 토글 / 외상 한도 입력 (기존 UI, 변경 없음)
- `admin/orders/page.tsx`, `admin/orders/[id]/page.tsx` — `PAYMENT_LABEL.CREDIT = "외상"` 추가

---

## beautica 측 영향

`beautica_create_order` RPC 가 `p_payment_method: 'CREDIT'` 받을 수 있도록 패치 권장:
1. supabaseUserId → Partner 조회 시 `creditAllowed` 도 SELECT
2. payment_method 가 CREDIT 인데 `creditAllowed=false` 면 에러 반환 (tnt-mall API 와 동일 정책)
3. CREDIT 주문은 status `INCOME_PENDING` 으로 시작하도록 처리

또는 RPC 측은 그대로 두고, beautica 자재 주문 화면에서 admin이 미리 외상 사용 가능 거래처만 CREDIT 옵션 노출하는 방식도 OK.

---

## 정책 (사용자 확정 2026-04-30)

- **기본 결제**: 무통장입금 / 카드결제 (모든 거래처)
- **외상 결제**: 기능만 정식 구현. 사용 여부는 **거래처별로 셋팅** (admin이 PartnerForm 에서 토글)
- 외상 정식 처리 후속 작업 (AccountsReceivable 자동 생성, Partner.creditBalance 갱신, 한도 검증) 은 **운영 직전 단계**에서 추가 검토. 현재는 단순 입력 단계 (status + memo marker)만.

---

## 함께 진행 사항

- ✅ 이카운트 판매현황 import 완료: 878 Order + 4,228 OrderItem (2025-10-01 ~ 2026-04-28). customerCompanyId 100% 매칭. → beautica 자주구매 집계 SQL 즉시 사용 가능.
- ✅ 거래처 마스터 사용중 2,019/2,019 등록 (사용중단 KBA 4건 보류 결정).
- ✅ 빌드 에러 fix (`OrderSource` enum 누락, daum.Postcode 타입 통일).
