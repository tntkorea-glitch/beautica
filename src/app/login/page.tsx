"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/brand/Logo";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [loading, setLoading] = useState(false);

  const signInWithGoogle = async () => {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setLoading(false);
      alert(`로그인 실패: ${error.message}`);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-50 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm ring-1 ring-rose-gold-100">
        <div className="mb-1 flex justify-center">
          <Logo size="lg" />
        </div>
        <p className="mb-8 text-center text-sm text-rose-gold-700/70">로그인</p>

        {error === "auth" && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-center text-xs text-red-600">
            로그인에 실패했습니다. 다시 시도해주세요.
          </p>
        )}

        <div className="space-y-3">
          <button
            type="button"
            disabled={loading}
            onClick={signInWithGoogle}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            <GoogleIcon />
            {loading ? "이동 중..." : "Google로 계속하기"}
          </button>

          <button
            type="button"
            onClick={() => alert("카카오 로그인은 준비 중입니다")}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] text-sm font-medium text-[#191919] transition hover:brightness-95"
          >
            <KakaoIcon />
            카카오로 계속하기
          </button>

          <button
            type="button"
            onClick={() => alert("네이버 로그인은 준비 중입니다")}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#03C75A] text-sm font-medium text-white transition hover:brightness-95"
          >
            <NaverIcon />
            네이버로 계속하기
          </button>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#191919"
        d="M9 1.5C4.582 1.5 1 4.246 1 7.633c0 2.197 1.514 4.122 3.789 5.205-.166.602-.602 2.183-.69 2.523-.108.42.155.415.326.302.135-.09 2.146-1.456 3.014-2.044.516.075 1.046.115 1.561.115 4.418 0 8-2.746 8-6.101S13.418 1.5 9 1.5z"
      />
    </svg>
  );
}

function NaverIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path fill="#fff" d="M10.846 8.578L4.94 0H0v16h5.154V7.422L11.06 16H16V0h-5.154v8.578z" />
    </svg>
  );
}
