# tnt-mall 작업 요청: CustomerCompany 모델에 tier + Supabase user 매핑 추가 (회원 통합용)

## 요청 출처 / 배경
beautica (D:\dev\beautica) 의 회원 통합 정책 구현을 위한 사전 작업.

- **현재 정책 (확정):** 어디서 가입하든(beautica OR tnt-mall) 무조건 tnt-mall 거래처 4계층 (Partner/CustomerCompany/Branch/User) 자동 등록. 상세는 [roles_and_auth.md](../../../C:/Users/미르/.claude/projects/D--dev-beautica/memory/roles_and_auth.md) 참조.
- **B2C/B2B 처리:** 모든 회원이 거래처. 차이는 등급(tier) 만:
  - tier1 = B2C 일반 (default for tnt-mall 신규 가입자, 사업자번호 미입력)
  - tier2 = 일반 뷰티샵 (default for beautica 신규 가입자 + 사업자등록증 승인)
  - tier3 = 대형/VIP 거래처 (관리자 별도 지정)
- **양방향 동기화:** beautica 의 `shops.tier` ↔ tnt-mall 의 `CustomerCompany.tier` 일치해야 함. 가격 정책 ([pricing_policy.md](../../../C:/Users/미르/.claude/projects/D--dev-beautica/memory/pricing_policy.md)) 의 `Product.tier1/2/3` 단가가 등급별 노출되는 핵심.

현재 tnt-mall 의 `CustomerCompany` 모델은 B2B 거래처 가정으로 설계되어 있어 다음 변경 필요:

---

## 작업 항목

### A. Prisma schema 변경 (`D:\dev\tnt-mall\prisma\schema.prisma`)

```prisma
model CustomerCompany {
  // ... 기존 필드 유지

  // 1) 사업자번호 nullable 화 (B2C 일반 회원도 거래처 등록되도록)
  businessNumber  String?  // 기존이 String (NOT NULL) 이면 String? 로 변경

  // 2) tier 필드 추가 (가격 등급, Product.tier1/2/3 매핑)
  tier            Int      @default(1)  // 1=B2C일반, 2=일반뷰티샵, 3=VIP
  // CHECK 제약을 raw SQL 로 추가 가능: ALTER TABLE "CustomerCompany" ADD CONSTRAINT tier_range CHECK (tier BETWEEN 1 AND 3);

  // 3) Supabase user 매핑 (beautica 회원 통합)
  //    한 거래처에 여러 supabase user 가 매핑될 수 있다면 별도 join 테이블이 더 적절.
  //    단순 1:1 가정이면 컬럼 한 개:
  supabaseUserId  String?  @unique @db.Uuid  // beautica 의 auth.users.id

  // 4) (선택) 거래처 분류 enum
  customerType    String   @default("INDIVIDUAL")  // 또는 enum: INDIVIDUAL / BEAUTY_SHOP / WHOLESALER
}
```

### B. 마이그레이션
```bash
cd D:\dev\tnt-mall
npx prisma migrate dev --name customer_tier_supabase_link
```

기존 데이터:
- 기존 `CustomerCompany` 행 모두 `tier=2` 로 마이그레이션 (이미 등록된 거래처는 B2B 가정)
- `customerType` 도 기존 행은 `BEAUTY_SHOP` 으로

### C. tnt-mall 회원가입 흐름 변경 (`app/api/auth/register/...` 또는 회원가입 라우트)

**현재 추정 흐름:** 회원가입 폼에서 사업자번호 + 매장명 등 입력 시 거래처 4계층 자동 생성.

**변경:**
1. 사업자번호 미입력 시에도 거래처 자동 등록:
   - Partner (type=CUSTOMER 또는 INDIVIDUAL_CUSTOMER)
   - CustomerCompany (`tier=1`, `customerType="INDIVIDUAL"`, `businessNumber=null`)
   - Branch (default 지점)
   - User (가입한 본인)
2. 사업자번호 입력 시: `tier=2`, `customerType="BEAUTY_SHOP"`, `businessNumber=...`
3. **사업자 인증 후 등업 흐름** (기존에 없으면 추가): 일반회원 → 사업자번호 + 사업자등록증 제출 → 관리자 승인 → `tier=2` + `customerType="BEAUTY_SHOP"` 로 update.

### D. beautica 의 등업 승인 시 tier 동기화

beautica 측에서 사용자가 사업자등록증 승인하면 → 같은 supabase user 의 `CustomerCompany.tier` 도 함께 업데이트 필요.

옵션 1: beautica 가 같은 Supabase 에 직접 update (`CustomerCompany` 테이블 직접 write).
- beautica 의 `admin/upgrades/actions.ts` 의 `approveUpgrade` 함수에서 `shops.tier=2` 와 함께 `CustomerCompany WHERE supabaseUserId = user.id` 도 update.
- 단점: tnt-mall 의 비즈니스 로직 (재고 정산 등) 우회 가능성.

옵션 2: tnt-mall 이 internal API 제공 (`POST /api/internal/customer-tier`), beautica 가 호출.
- 장점: tnt-mall 의 비즈니스 로직 거치므로 안전.
- 단점: API key + CORS 등 추가 작업.

**추천: 옵션 1** (같은 Supabase 인스턴스 공유 전제, 사용자 한 명이 양쪽 운영, 단순화).

---

## beautica 가 onboarding 완료 시 tnt-mall 거래처 자동 등록 — 사용할 SQL 패턴

위 변경 적용 후 beautica 의 `onboarding/actions.ts` 가 사용할 흐름 (예시):

```ts
// 1) Partner 생성 (또는 기존 매핑 확인)
const { data: partner } = await admin.from("Partner").insert({
  type: "CUSTOMER",
  name: shopName,
  // ... 기타 필드
}).select("id").single();

// 2) CustomerCompany 생성
await admin.from("CustomerCompany").insert({
  partnerId: partner.id,
  tier: hasBusinessLicense ? 2 : 1,    // 가입 시점은 1, 등업 후 2
  customerType: hasBusinessLicense ? "BEAUTY_SHOP" : "INDIVIDUAL",
  businessNumber: businessNumber,       // nullable
  supabaseUserId: user.id,              // 핵심 매핑
  companyName: shopName,
  // ...
});

// 3) Branch 생성 (default 지점)
await admin.from("Branch").insert({
  customerCompanyId: ...,
  name: "본점",
});

// 4) User 생성 (tnt-mall 의 자체 User 테이블)
await admin.from("User").insert({
  email: user.email,
  branchId: ...,
  role: "PARTNER",
  // ... password 는 random (실제 로그인 안 함, supabaseUserId 로 매핑)
});

// 5) beautica 의 shops.customer_company_id 채우기
await admin.from("shops").update({ customer_company_id: customerCompany.id }).eq("id", shop.id);
```

**현재 정확한 스키마 (필드명/필수 필드/제약) 확인 필요.** tnt-mall 측에서 위 흐름이 작동하는 수준의 schema 정리 + 누락 필드 안내 부탁드립니다.

---

## 검증 시나리오 (기능 완성 후)

1. **B2C 가입 (tnt-mall)**: 사업자번호 미입력 → CustomerCompany 자동 생성, `tier=1`, `customerType=INDIVIDUAL`.
2. **B2B 가입 (tnt-mall)**: 사업자번호 입력 → `tier=2`, `customerType=BEAUTY_SHOP`.
3. **B2C → B2B 등업**: 일반회원이 사업자번호 + 등록증 제출 → 관리자 승인 → 같은 CustomerCompany 의 tier/businessNumber/customerType 업데이트 (별도 행 추가 X).
4. **beautica 가입**: onboarding 완료 → tnt-mall CustomerCompany 자동 생성 (supabaseUserId 매핑).
5. **등업 승인 동기화**: beautica 의 admin 화면에서 승인 → `shops.tier=2` + `CustomerCompany.tier=2` 동시 갱신.

## 영향 범위
- tnt-mall DB 스키마 (CustomerCompany 컬럼 추가/변경)
- tnt-mall 회원가입/인증 코드
- tnt-mall 거래처 표시 화면 (B2C 도 보이게 변경 필요할 수 있음)
- beautica 는 후속 작업 (이 변경 완료 후 onboarding/actions.ts + admin/upgrades/actions.ts 코드 추가)

## 예상 작업 시간
- Schema + 마이그레이션: 1시간
- 회원가입/인증 코드 변경: 2~3시간
- 표시 화면 변경: 1~2시간
- **총 4~6시간**

## 완료 알림
완료되면 beautica 측에 알림 → 회원 통합 코드 (onboarding/admin) 작성 진행.
