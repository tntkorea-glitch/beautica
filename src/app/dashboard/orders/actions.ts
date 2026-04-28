"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";

type OrderItemInput = {
  prodCd: string;
  quantity: number;
  unitPrice?: number | null;
  productName?: string | null;
};

type ShippingInput = {
  recipient: string;
  phone: string;
  zipcode: string;
  address1: string;
  address2?: string;
  memo?: string;
};

type CreateOrderResult =
  | { error: string; missing?: string[] }
  | { ok: true; orderId: string; idempotent: boolean };

export async function createOrderRpc(input: {
  items: OrderItemInput[];
  shipping: ShippingInput;
  paymentMethod?: "BANK_TRANSFER" | "CARD" | "KAKAO_PAY" | "NAVER_PAY" | "OTHER";
  idempotencyKey: string;  // 클라이언트 생성 (BTC-shop-YYYYMMDD-HHMMSS-rand)
}): Promise<CreateOrderResult> {
  const { shop, user } = await requireShop();

  if (!shop.customer_company_id) {
    return { error: "tnt-mall 거래처 매핑이 없어 주문할 수 없습니다. onboarding 다시 진행해주세요." };
  }
  if (input.items.length === 0) {
    return { error: "장바구니가 비어있습니다." };
  }
  if (!input.shipping.recipient.trim() || !input.shipping.phone.trim() || !input.shipping.address1.trim()) {
    return { error: "수령인/연락처/주소는 필수입니다." };
  }

  const admin = createAdminClient();

  const { data, error } = await admin.rpc("beautica_create_order", {
    p_supabase_user_id: user.id,
    p_external_order_no: input.idempotencyKey,
    p_items: input.items.map((it) => ({
      prodCd: it.prodCd,
      quantity: it.quantity,
      ...(it.unitPrice != null ? { unitPrice: it.unitPrice } : {}),
      ...(it.productName ? { productName: it.productName } : {}),
    })),
    p_shipping: {
      recipient: input.shipping.recipient.trim(),
      phone: input.shipping.phone.trim(),
      zipcode: input.shipping.zipcode.trim(),
      address1: input.shipping.address1.trim(),
      ...(input.shipping.address2 ? { address2: input.shipping.address2.trim() } : {}),
      ...(input.shipping.memo ? { memo: input.shipping.memo.trim() } : {}),
    },
    p_payment_method: input.paymentMethod ?? "BANK_TRANSFER",
    p_source: "BEAUTICA",
  });

  if (error) {
    return { error: `RPC 실패: ${error.message}` };
  }

  // RPC 성공 응답 형태:
  //   { idempotent: bool, orderId: 'TNT...', subtotal, shippingFee, total, status, tier }
  // 또는 에러:
  //   { error: 'invalid prodCd ...', missing: ['XX', 'YY'] }
  type RpcOk = { idempotent: boolean; orderId: string };
  type RpcErr = { error: string; missing?: string[] };
  const result = data as RpcOk | RpcErr | null;

  if (!result) return { error: "RPC 응답이 비어있습니다." };
  if ("error" in result) {
    return { error: result.error, missing: result.missing };
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  return { ok: true, orderId: result.orderId, idempotent: result.idempotent };
}

/**
 * createOrderRpc 호출 후 성공 시 server-side redirect.
 * 클라이언트가 catch 안 해도 redirect 자동 처리.
 */
export async function submitOrder(input: Parameters<typeof createOrderRpc>[0]) {
  const r = await createOrderRpc(input);
  if ("error" in r) return r;
  redirect(`/dashboard/orders/${r.orderId}`);
}
