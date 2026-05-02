import { GoogleGenerativeAI } from "@google/generative-ai";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProposalType =
  | {
      type: "create_customer";
      data: { name: string; phone?: string; notes?: string };
    }
  | {
      type: "create_booking";
      data: {
        customer_id?: string;
        guest_name?: string;
        guest_phone?: string;
        service_id: string;
        service_name?: string;
        start_at: string;
      };
    }
  | {
      type: "create_order";
      data: {
        items: Array<{
          prodCd: string;
          name: string;
          quantity: number;
          unitPrice?: number;
        }>;
      };
    };

const functionDeclarations = [
  {
    name: "search_customers",
    description:
      "이름 또는 전화번호로 고객을 검색합니다. 고객 정보 조회나 예약 등록 전 고객 확인 시 사용하세요.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description: "검색어 (이름 또는 전화번호 일부)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "search_services",
    description:
      "매장의 시술 메뉴 목록을 조회합니다. 예약 등록 전 메뉴 확인 시 사용하세요.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "get_today_bookings",
    description: "오늘의 예약 현황을 조회합니다.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "propose_create_customer",
    description:
      "신규 고객 등록을 제안합니다. 사용자 확인 후 실제 등록이 진행됩니다.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "고객 이름" },
        phone: { type: "STRING", description: "전화번호 (010-XXXX-XXXX)" },
        notes: { type: "STRING", description: "메모" },
      },
      required: ["name"],
    },
  },
  {
    name: "search_products",
    description:
      "제품명으로 tnt-mall 상품을 검색합니다. 주문 전 prodCd와 가격을 확인하세요.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description: "검색어 (제품명 일부)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "propose_order",
    description:
      "제품 주문을 제안합니다. 사용자 확인 후 실제 주문이 등록됩니다. 먼저 search_products로 prodCd를 확인하세요.",
    parameters: {
      type: "OBJECT",
      properties: {
        items: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              prodCd: { type: "STRING", description: "상품 코드" },
              name: { type: "STRING", description: "상품명" },
              quantity: { type: "NUMBER", description: "수량" },
              unitPrice: { type: "NUMBER", description: "단가 (원)" },
            },
            required: ["prodCd", "name", "quantity"],
          },
          description: "주문할 상품 목록",
        },
      },
      required: ["items"],
    },
  },
  {
    name: "propose_create_booking",
    description:
      "예약 등록을 제안합니다. 사용자 확인 후 실제 등록이 진행됩니다. 먼저 search_customers와 search_services로 ID를 확인하세요.",
    parameters: {
      type: "OBJECT",
      properties: {
        customer_id: {
          type: "STRING",
          description: "고객 ID (search_customers로 찾은 값)",
        },
        guest_name: {
          type: "STRING",
          description: "고객 ID가 없을 때 사용하는 게스트 이름",
        },
        guest_phone: { type: "STRING", description: "게스트 전화번호" },
        service_id: {
          type: "STRING",
          description: "시술 메뉴 ID (search_services로 찾은 값)",
        },
        service_name: {
          type: "STRING",
          description: "시술 메뉴명 (사용자에게 보여주기 위해)",
        },
        start_at: {
          type: "STRING",
          description:
            "예약 시작 시간 (ISO 8601, 예: 2026-05-01T14:00:00+09:00)",
        },
      },
      required: ["service_id", "start_at"],
    },
  },
];

type ToolArgs = Record<string, unknown>;

async function executeTool(
  name: string,
  args: ToolArgs,
  shopId: string,
  proposals: ProposalType[]
): Promise<Record<string, unknown>> {
  const admin = createAdminClient();

  if (name === "search_customers") {
    const query = String(args.query ?? "");
    const pattern = `%${query}%`;
    const { data } = await admin
      .from("customers")
      .select("id, name, phone, visit_count, last_visit_at")
      .eq("shop_id", shopId)
      .or(`name.ilike.${pattern},phone.ilike.${pattern}`)
      .order("name")
      .limit(10);
    return { customers: data ?? [], count: data?.length ?? 0 };
  }

  if (name === "search_services") {
    const { data } = await admin
      .from("services")
      .select("id, name, category, price_won, duration_min")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .order("display_order");
    return { services: data ?? [] };
  }

  if (name === "get_today_bookings") {
    const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayKST = nowKST.toISOString().slice(0, 10);
    const { data } = await admin
      .from("bookings")
      .select(
        "id, start_at, status, guest_name, guest_phone, customers(name, phone), services(name)"
      )
      .eq("shop_id", shopId)
      .gte("start_at", `${todayKST}T00:00:00+09:00`)
      .lte("start_at", `${todayKST}T23:59:59+09:00`)
      .order("start_at");
    return { bookings: data ?? [], date: todayKST };
  }

  if (name === "search_products") {
    const query = String(args.query ?? "");
    // 단어별 AND 검색 — "701 글루" → name contains "701" AND "글루"
    const words = query.split(/\s+/).filter(Boolean);

    const { data: shopRow } = await admin
      .from("shops")
      .select("tier, customer_company_id")
      .eq("id", shopId)
      .maybeSingle();
    const shopTier = (shopRow?.tier as number) ?? 1;
    const tierKey = `tier${shopTier}` as "tier1" | "tier2" | "tier3";
    const customerCompanyId = shopRow?.customer_company_id as string | null;

    type ProductResult = { prodCd: string; name: string; price: number | null; source: string };
    const results: ProductResult[] = [];
    const seen = new Set<string>();

    if (customerCompanyId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let fq: any = admin
        .from("shop_frequent_products")
        .select("prod_cd, product_name, tier1, tier2, tier3, last_unit_price")
        .eq("customer_company_id", customerCompanyId);
      for (const w of words) fq = fq.ilike("product_name", `%${w}%`);
      const { data: frequent } = await fq.limit(5);
      for (const p of frequent ?? []) {
        const fp = p as Record<string, unknown>;
        if (seen.has(fp.prod_cd as string)) continue;
        seen.add(fp.prod_cd as string);
        const tierPrice = fp[tierKey] as number | null;
        const last = fp.last_unit_price as number | null;
        const price =
          tierPrice != null && last != null
            ? Math.max(tierPrice, last)
            : (last ?? tierPrice);
        results.push({ prodCd: fp.prod_cd as string, name: fp.product_name as string, price, source: "자주 구매" });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sq: any = admin
      .from("SiteProduct")
      .select("id, name")
      .in("visibility", ["PUBLIC", "WHOLESALE"]);
    for (const w of words) sq = sq.ilike("name", `%${w}%`);
    const { data: sites } = await sq.limit(8);

    if (sites && sites.length > 0) {
      const siteIds = (sites as Array<{ id: string; name: string }>).map((s) => s.id);
      const { data: skus } = await admin
        .from("SiteProductSKU")
        .select("siteProductId, prodCd, isPrimary")
        .in("siteProductId", siteIds);
      const prodCdBySite = new Map<string, string>();
      for (const sku of (skus ?? []) as Array<{ siteProductId: string; prodCd: string | null; isPrimary: boolean }>) {
        if (!sku.prodCd) continue;
        const existing = prodCdBySite.get(sku.siteProductId);
        if (!existing || sku.isPrimary) prodCdBySite.set(sku.siteProductId, sku.prodCd);
      }
      const newProdCds = [...new Set([...prodCdBySite.values()])].filter((p) => !seen.has(p));
      let priceMap = new Map<string, Record<string, number | null>>();
      if (newProdCds.length > 0) {
        const { data: products } = await admin
          .from("Product")
          .select("prodCd, tier1, tier2, tier3")
          .in("prodCd", newProdCds);
        priceMap = new Map(
          (products ?? []).map((p) => {
            const pp = p as Record<string, unknown>;
            return [pp.prodCd as string, pp as Record<string, number | null>];
          })
        );
      }
      for (const s of sites as Array<{ id: string; name: string }>) {
        const prodCd = prodCdBySite.get(s.id);
        if (!prodCd || seen.has(prodCd)) continue;
        const priceRow = priceMap.get(prodCd);
        if (!priceRow) continue; // Product 레코드 없으면 제외 (RPC 검증 실패 방지)
        seen.add(prodCd);
        const price = (priceRow[tierKey] as number | null) ?? null;
        results.push({ prodCd, name: s.name, price, source: "카탈로그" });
      }
    }

    return { products: results, count: results.length };
  }

  if (name === "propose_order") {
    type OrderItem = { prodCd: string; name: string; quantity: number; unitPrice?: number };
    const items = (args.items as OrderItem[]) ?? [];

    // prodCd 사전 검증 — AI 할루시네이션 방지
    const codes = items.map((i) => i.prodCd).filter(Boolean);
    const { data: validRows } = await admin
      .from("Product")
      .select("prodCd")
      .in("prodCd", codes)
      .eq("isActive", true);
    const validSet = new Set((validRows ?? []).map((r) => (r as Record<string, unknown>).prodCd as string));
    const invalid = codes.filter((c) => !validSet.has(c));
    if (invalid.length > 0) {
      return {
        error: "invalid_prodCd",
        invalid_codes: invalid,
        message: `다음 코드는 유효하지 않습니다: ${invalid.join(", ")}. search_products 로 다시 검색해 올바른 코드를 확인하세요.`,
      };
    }

    const proposal: ProposalType = {
      type: "create_order",
      data: { items },
    };
    proposals.push(proposal);
    return { proposed: true, itemCount: items.length };
  }

  if (name === "propose_create_customer") {
    const proposal: ProposalType = {
      type: "create_customer",
      data: {
        name: String(args.name ?? ""),
        phone: args.phone ? String(args.phone) : undefined,
        notes: args.notes ? String(args.notes) : undefined,
      },
    };
    proposals.push(proposal);
    return { proposed: true, name: args.name, phone: args.phone };
  }

  if (name === "propose_create_booking") {
    const proposal: ProposalType = {
      type: "create_booking",
      data: {
        customer_id: args.customer_id ? String(args.customer_id) : undefined,
        guest_name: args.guest_name ? String(args.guest_name) : undefined,
        guest_phone: args.guest_phone ? String(args.guest_phone) : undefined,
        service_id: String(args.service_id ?? ""),
        service_name: args.service_name ? String(args.service_name) : undefined,
        start_at: String(args.start_at ?? ""),
      },
    };
    proposals.push(proposal);
    return { proposed: true, ...args };
  }

  return { error: "unknown tool" };
}

export async function runAIChat(
  shopId: string,
  messages: { role: "user" | "model"; content: string }[]
): Promise<{ reply: string; proposals: ProposalType[] }> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toLocaleDateString(
    "ko-KR",
    { year: "numeric", month: "long", day: "numeric", weekday: "long" }
  );

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ functionDeclarations }] as any,
    systemInstruction: `당신은 뷰티샵 운영을 돕는 AI 어시스턴트입니다.
고객 조회/등록, 시술 메뉴 조회, 예약 조회/등록, tnt-mall 제품 주문을 자연어로 처리합니다.
오늘 날짜: ${today}
답변은 간결하고 명확하게 한국어로 해주세요.
고객 등록, 예약 등록, 제품 주문 시에는 반드시 propose 도구를 사용해 사용자 확인을 받으세요.
제품 주문 시 흐름:
1) search_products로 제품 검색
2) 결과가 여러 개면 번호 목록으로 제품 선택 요청
3) 제품 확정 후 → propose_order 호출 전 반드시 아래 형식으로 주문 내용 안내:

  ✅ 주문 내용 확인
  제품: [제품명]
  수량: [N]개
  단가: [단가]원
  총 금액: [단가 × 수량]원

  장바구니에 추가할까요?
  1. 네
  2. 아니오

사용자 메시지에서 수량 정보(예: "2개", "3개")를 반드시 파악해 propose_order에 반영하세요.
수량 언급이 없으면 1개로 가정하되 확인 단계에서 명시하세요.

[중요] prodCd(상품코드)는 절대 사용자에게 노출하지 마세요.

여러 항목을 나열할 때는 줄바꿈으로 구분하고 번호 목록으로 표시하세요.
사용자가 번호로 답하면 해당 항목으로 바로 진행하세요.
검색 결과가 없을 때는 솔직하게 안내하고 다른 검색어를 제안하세요.`,
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1].content;
  const chat = model.startChat({ history });

  const proposals: ProposalType[] = [];
  let result = await chat.sendMessage(lastMessage);

  for (let i = 0; i < 6; i++) {
    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fnCallPart = parts.find((p: any) => p.functionCall);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(fnCallPart as any)?.functionCall) break;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { name, args } = (fnCallPart as any).functionCall;
    const toolResult = await executeTool(name, args as ToolArgs, shopId, proposals);

    result = await chat.sendMessage([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { functionResponse: { name, response: toolResult } } as any,
    ]);
  }

  return { reply: result.response.text(), proposals };
}
