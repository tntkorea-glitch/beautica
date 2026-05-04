import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPointBalance } from "@/lib/points";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  const shopSlug = req.nextUrl.searchParams.get("shopSlug");

  if (!phone || !shopSlug) {
    return NextResponse.json({ balance: 0 });
  }

  const admin = createAdminClient();
  const { data: shop } = await admin
    .from("shops")
    .select("id, points_enabled")
    .eq("slug", shopSlug)
    .maybeSingle();

  if (!shop || !(shop.points_enabled as boolean)) {
    return NextResponse.json({ balance: 0 });
  }

  const result = await getPointBalance(phone, shop.id as string);
  return NextResponse.json({ balance: result?.balance ?? 0 });
}
