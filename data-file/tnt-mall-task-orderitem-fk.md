# tnt-mall 작업 요청: `OrderItem.productRef` → `Product.prodCd` 외래키 강화

## 요청 출처 / 배경
beautica (D:\dev\beautica) 프로젝트와의 데이터 연동을 위한 사전 작업.

- 두 프로젝트가 **같은 Supabase 인스턴스를 공유** (project ref: `iuffpkiwarkdmddwgdwt`)
- beautica 의 핵심 기능인 **"뷰티샵별 자주 구매 상품 카드 + 빠른 재주문"** 이 `OrderItem ↔ Product` 직접 조인을 전제로 함
- 또한 가격 정책이 **MAX(최근 구매단가, 현재 등급별 단가)** 로직이라 OrderItem 에서 어떤 상품인지 정확히 식별돼야 함
- 현재 `OrderItem.productRef` 는 자유 String 이라 집계/매핑 불가능 (mock-xxx, prodCd 혼재)

## 목표
`OrderItem.productRef` (자유 문자열) → `OrderItem.productProdCd` (Product 외래키) 로 강제. 데이터 정리 + 마이그레이션 + 코드 수정 포함.

---

## 작업 항목

### A. Prisma schema 변경 — `D:\dev\tnt-mall\prisma\schema.prisma`

**변경 전 (현재):**
```prisma
model OrderItem {
  id          String  @id @default(cuid())
  orderId     String
  productRef  String   // 자유 문자열, FK 아님 ← 문제
  productName String
  unitPrice   Int
  quantity    Int
  // ...
  order       Order   @relation(fields: [orderId], references: [id])
}
```

**변경 후:**
```prisma
model OrderItem {
  id            String  @id @default(cuid())
  orderId       String
  productProdCd String   // 명확한 외래키 컬럼명
  productName   String   // 주문 시점 스냅샷 보존 (변경 X)
  unitPrice     Int
  quantity      Int
  // ...
  order         Order   @relation(fields: [orderId], references: [id])
  product       Product @relation(fields: [productProdCd], references: [prodCd])
}

// Product 모델에도 역방향 추가:
model Product {
  // ... 기존 필드
  orderItems OrderItem[]
}
```

### B. 기존 데이터 정리 (마이그레이션 전 필수)

FK 추가 전에 모든 `productRef` 값이 `Product.prodCd` 에 존재해야 함. 안 그러면 마이그레이션 실패.

**1단계 — 매칭 실패 행 조사:**
```sql
SELECT DISTINCT "productRef", COUNT(*) AS 행수
FROM "OrderItem"
WHERE "productRef" NOT IN (SELECT "prodCd" FROM "Product")
GROUP BY "productRef"
ORDER BY 행수 DESC;
```

**2단계 — 처리 정책 (작업자/사용자 결정 필요):**

| 케이스 | 권장 처리 |
|---|---|
| `mock-*` 같은 개발 더미 | 삭제 (개발 데이터, 운영 의미 없음) |
| 진짜 prodCd 인데 표기 다름 (`TNT-001` vs `TNT001` 등) | 정규화 후 매핑 (UPDATE) |
| 진짜 같지만 Product 에 누락된 상품 | Product 에 추가 등록 후 매핑 |
| 식별 불가능한 잔존 데이터 | 별도 백업 테이블로 옮긴 뒤 OrderItem 행 삭제 |

**3단계 — 정리 후 재확인:** 위 1단계 SQL 결과가 0 건이어야 함.

### C. 마이그레이션 작성 + 실행

```bash
cd D:\dev\tnt-mall
npx prisma migrate dev --name strengthen_orderitem_product_fk
```

생성된 SQL 검토 (예상):
- `ALTER TABLE "OrderItem" RENAME COLUMN "productRef" TO "productProdCd";`
- `ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productProdCd_fkey" FOREIGN KEY ("productProdCd") REFERENCES "Product"("prodCd") ON UPDATE CASCADE ON DELETE RESTRICT;`

### D. 코드 수정 — `productRef` 참조 전부

```bash
grep -rn "productRef" D:\dev\tnt-mall\app D:\dev\tnt-mall\lib D:\dev\tnt-mall\components D:\dev\tnt-mall\scripts
```

식별된 모든 위치를 `productProdCd` 로 변경. 영향 받을 영역 (예상):
- 주문 생성: `POST /api/orders` (`app/api/orders/route.ts`)
- 주문 조회: `GET /api/orders/[id]`, `POST /api/orders/by-ids`
- 관리자 화면 (주문 표시/검색/필터)
- 사용자 화면 (주문 내역, localStorage 저장 형식)
- 타입 정의 (`lib/types.ts`)
- mock data (`lib/mock-data/*`)

특히 **localStorage 형식**: 사용자가 새로고침했을 때 옛 형식(productRef) 으로 저장된 임시 주문이 깨지지 않게 마이그레이션 헬퍼 또는 키 버전 업 필요.

### E. 검증

1. **기존 주문 표시 정상** — 관리자 페이지 + 사용자 주문 내역
2. **신규 주문 생성 정상** — 한 건 만들어서 OrderItem 에 productProdCd 가 정상 들어가는지 확인
3. **다음 SQL 이 정상 동작 (beautica 가 사용할 형태):**
   ```sql
   SELECT oi."productProdCd", p."name",
          COUNT(*) AS 구매횟수, SUM(oi.quantity) AS 총수량,
          MAX(o."createdAt") AS 최근구매일,
          MAX(oi."unitPrice") AS 최근구매단가
   FROM "OrderItem" oi
   JOIN "Order" o ON o."id" = oi."orderId"
   JOIN "Product" p ON p."prodCd" = oi."productProdCd"
   WHERE o."customerCompanyId" = $특정거래처id
   GROUP BY oi."productProdCd", p."name"
   ORDER BY 구매횟수 DESC
   LIMIT 10;
   ```

---

## 영향 범위
- ✅ tnt-mall DB 스키마 + 코드
- ❌ beautica 영향 없음 (아직 OrderItem 사용 코드 작성 전)
- ⚠️ tnt-mall 의 외부 거래처(B2B) 신규 주문 생성 흐름 변경 (CS 페이지 만들고 있다면 그쪽도 적용)

## 완료 후 알림
외래키 적용 완료되면 beautica 측에 알려주세요 → 자주 구매 집계 코드 작성 진행할 수 있음.

## 작업 시간 추정
- Schema + 마이그레이션: 30분
- 데이터 정리 (양에 따라 다름): 1~3시간
- 코드 수정: 1~2시간
- 검증: 1시간
- **총 3~6시간**
