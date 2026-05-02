import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAIChat } from "@/lib/ai-tools/gemini";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: shopUser } = await supabase
    .from("shop_users")
    .select("shop_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const shopId = shopUser?.shop_id as string | undefined;
  if (!shopId) return NextResponse.json({ error: "No shop" }, { status: 400 });

  const body = await request.json();
  const messages: { role: "user" | "model"; content: string }[] = body.messages;

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "No messages" }, { status: 400 });
  }

  try {
    const result = await runAIChat(shopId, messages);
    return NextResponse.json(result);
  } catch (e) {
    console.error("AI assistant error:", e);
    return NextResponse.json({ reply: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.", proposals: [] });
  }
}
