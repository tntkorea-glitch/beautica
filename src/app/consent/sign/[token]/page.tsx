import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/brand/Logo";
import { formatKST } from "@/lib/format";
import { SignClient } from "./SignClient";

export const dynamic = "force-dynamic";

type ConsentRow = {
  id: string;
  shop_id: string;
  customer_id: string;
  signed_at: string | null;
  signature_method: string | null;
  signature_token: string | null;
  token_expires_at: string | null;
  signer_name: string | null;
  signed_content_snapshot: string;
  template_id: string;
};

export default async function ConsentSignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("consent_forms")
    .select(
      "id, shop_id, customer_id, signed_at, signature_method, signature_token, token_expires_at, signer_name, signed_content_snapshot, template_id",
    )
    .eq("signature_token", token)
    .maybeSingle();

  const consent = row as ConsentRow | null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-5">
          <Logo size="md" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-8">
        {!consent ? (
          <ErrorBox
            title="유효하지 않은 링크입니다"
            message="링크가 잘못되었거나 매장이 취소했을 수 있습니다. 매장에 문의해주세요."
          />
        ) : consent.signed_at ? (
          <ErrorBox
            title="이미 서명이 완료되었습니다"
            message={`${formatKST(consent.signed_at)} 에 서명되었습니다. 추가 서명이 필요하면 매장에 다시 요청해주세요.`}
            tone="info"
          />
        ) : consent.token_expires_at &&
          new Date(consent.token_expires_at).getTime() < Date.now() ? (
          <ErrorBox
            title="링크가 만료되었습니다"
            message="유효 기간 (7일)이 지났습니다. 매장에 다시 요청해주세요."
          />
        ) : (
          <SignSection consent={consent} token={token} />
        )}
      </main>
    </div>
  );
}

async function SignSection({ consent, token }: { consent: ConsentRow; token: string }) {
  const admin = createAdminClient();

  const [{ data: shop }, { data: customer }, { data: tmpl }] = await Promise.all([
    admin.from("shops").select("name").eq("id", consent.shop_id).maybeSingle(),
    admin.from("customers").select("name").eq("id", consent.customer_id).maybeSingle(),
    admin.from("consent_form_templates").select("name").eq("id", consent.template_id).maybeSingle(),
  ]);

  return (
    <SignClient
      token={token}
      shopName={(shop as { name: string } | null)?.name ?? "매장"}
      customerNameHint={(customer as { name: string } | null)?.name ?? null}
      templateName={(tmpl as { name: string } | null)?.name ?? "동의서"}
      templateContent={consent.signed_content_snapshot}
      defaultSignerName={
        consent.signer_name ?? (customer as { name: string } | null)?.name ?? ""
      }
    />
  );
}

function ErrorBox({
  title,
  message,
  tone = "error",
}: {
  title: string;
  message: string;
  tone?: "error" | "info";
}) {
  const cls =
    tone === "info"
      ? "border-blue-200 bg-blue-50 text-blue-900"
      : "border-red-200 bg-red-50 text-red-900";
  return (
    <div className={`rounded-lg border ${cls} p-6 text-center`}>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm opacity-90">{message}</p>
    </div>
  );
}

