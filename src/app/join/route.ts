import { NextResponse } from "next/server";

// GET /join?ref=<CODE>
// 추천 코드를 쿠키에 저장 후 로그인 페이지로 리다이렉트
export function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const ref = searchParams.get("ref");

  const res = NextResponse.redirect(`${origin}/login`);

  if (ref && /^[A-Z0-9_-]{6,10}$/.test(ref)) {
    res.cookies.set("beautica_ref", ref, {
      maxAge: 7 * 24 * 60 * 60, // 7일
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  return res;
}
