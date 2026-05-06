import { NextResponse } from "next/server";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** NotificationBell 폴링용 — 읽지 않은(NEW) 상담 카운트 + 최근 5건 미리보기 */
export async function GET() {
  try {
    const { shop } = await requireShop();
    const admin = createAdminClient();

    const [{ count }, { data: recent }] = await Promise.all([
      admin
        .from("consultations")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shop.id)
        .eq("status", "NEW"),
      admin
        .from("consultations")
        .select(
          "id, message, status, created_at, guest_name, customer:customers(name)",
        )
        .eq("shop_id", shop.id)
        .eq("status", "NEW")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    return NextResponse.json({
      newCount: count ?? 0,
      recent: (recent ?? []).map((r: Record<string, unknown>) => {
        const cust = r.customer as { name: string } | null;
        return {
          id: r.id as string,
          name: cust?.name ?? (r.guest_name as string | null) ?? "(이름 없음)",
          message: (r.message as string) ?? "",
          createdAt: r.created_at as string,
        };
      }),
    });
  } catch {
    return NextResponse.json({ newCount: 0, recent: [] }, { status: 200 });
  }
}
