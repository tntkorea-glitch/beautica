"use server";

import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";

type OrderItem = {
  prodCd: string;
  name: string;
  quantity: number;
  unitPrice?: number;
};

export async function confirmCreateOrder(data: {
  items: OrderItem[];
}): Promise<{ error?: string; orderId?: string }> {
  const { shop, user } = await requireShop();
  const admin = createAdminClient();

  if (!shop.customer_company_id) {
    return { error: "tnt-mall 거래처 매핑이 없습니다. 온보딩을 다시 진행해주세요." };
  }
  if (data.items.length === 0) {
    return { error: "주문할 상품이 없습니다." };
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    "-" +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  const idempotencyKey = `BTC-${shop.slug}-${ts}-${rand}`;

  const { data: result, error } = await admin.rpc("beautica_create_order", {
    p_supabase_user_id: user.id,
    p_external_order_no: idempotencyKey,
    p_items: data.items.map((it) => ({
      prodCd: it.prodCd,
      quantity: it.quantity,
      ...(it.unitPrice != null ? { unitPrice: it.unitPrice } : {}),
      productName: it.name,
    })),
    p_shipping: {
      recipient: shop.name,
      phone: shop.phone ?? "",
      zipcode: shop.postal_code ?? "",
      address1: shop.address ?? "",
      ...(shop.address_detail ? { address2: shop.address_detail } : {}),
    },
    p_payment_method: "BANK_TRANSFER",
    p_source: "BEAUTICA",
  });

  if (error) return { error: `주문 실패: ${error.message}` };

  type RpcOk = { idempotent: boolean; orderId: string };
  type RpcErr = { error: string };
  const rpcResult = result as RpcOk | RpcErr | null;
  if (!rpcResult) return { error: "응답이 없습니다." };
  if ("error" in rpcResult) {
    const codes = data.items.map((i) => i.prodCd).join(", ");
    console.error("[confirmCreateOrder] RPC error:", rpcResult.error, "prodCds:", codes);
    return { error: `${rpcResult.error} (코드: ${codes})` };
  }

  revalidatePath("/dashboard/orders");
  return { orderId: rpcResult.orderId };
}

export async function confirmCreateCustomer(data: {
  name: string;
  phone?: string;
  notes?: string;
}): Promise<{ error?: string; customerId?: string }> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data: created, error } = await admin
    .from("customers")
    .insert({
      shop_id: shop.id,
      name: data.name,
      phone: data.phone ?? null,
      notes: data.notes ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard/customers");
  return { customerId: created.id as string };
}

export async function confirmCreateBooking(data: {
  customer_id?: string;
  guest_name?: string;
  guest_phone?: string;
  service_id: string;
  start_at: string;
}): Promise<{ error?: string }> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data: service } = await admin
    .from("services")
    .select("price_won, duration_min")
    .eq("id", data.service_id)
    .eq("shop_id", shop.id)
    .maybeSingle();

  if (!service) return { error: "시술 메뉴를 찾을 수 없습니다." };

  const startAt = new Date(data.start_at);
  if (Number.isNaN(startAt.getTime())) return { error: "예약 시간이 올바르지 않습니다." };

  const duration = (service.duration_min as number | null) ?? 60;
  const endAt = new Date(startAt.getTime() + duration * 60 * 1000);

  const { error } = await admin.from("bookings").insert({
    shop_id: shop.id,
    customer_id: data.customer_id ?? null,
    service_id: data.service_id,
    guest_name: data.customer_id ? null : (data.guest_name ?? null),
    guest_phone: data.customer_id ? null : (data.guest_phone ?? null),
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    price_won: service.price_won,
    status: "CONFIRMED",
    confirmed_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/bookings");
  return {};
}
