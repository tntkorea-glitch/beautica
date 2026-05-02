import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { Logo } from "@/components/brand/Logo";
import { AdminToggle } from "@/components/AdminToggle";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) redirect("/");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Logo size="md" />
            </Link>
            <AdminToggle />
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="text-gray-700 hover:underline">
              대시보드
            </Link>
            <Link href="/admin/shops" className="text-gray-700 hover:underline">
              매장 관리
            </Link>
            <Link href="/admin/matches" className="text-gray-700 hover:underline">
              거래처 매칭
            </Link>
            <Link href="/admin/upgrades" className="text-gray-700 hover:underline">
              등업 신청
            </Link>
            <Link href="/admin/subscriptions" className="text-gray-700 hover:underline">
              구독 관리
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
              >
                로그아웃
              </button>
            </form>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
