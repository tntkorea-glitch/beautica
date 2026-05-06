import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordReferralSignup } from "@/lib/referral";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard/bookings/calendar";

  if (code) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && user) {
      const res = NextResponse.redirect(`${origin}${next}`);

      const refCode = request.cookies.get("beautica_ref")?.value;
      if (refCode) {
        res.cookies.delete("beautica_ref");
        // 비동기 처리 — 리다이렉트를 블로킹하지 않음
        recordReferralSignup(refCode, user.id).catch(() => {});
      }

      return res;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
