"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDefaultTemplate } from "@/lib/consent-templates";

type Result = { error?: string };

const REMOTE_TOKEN_TTL_DAYS = 7;

/**
 * 동의서 in-store 서명 저장.
 * 클라이언트가 미리 Storage 에 PNG 업로드한 후 path 만 전달.
 *
 * 매장별 동의서 템플릿이 DB 에 없으면 기본 코드 상수에서 가져와 사용.
 * (Phase 4: 매장이 자기 템플릿 편집 가능하게 하면 그때 consent_form_templates 사용)
 */
export async function saveConsentForm(input: {
  bookingId: string;
  customerId: string;
  templateKey: string;       // 코드 상수 키 (GENERAL_TREATMENT 등)
  signerName: string;
  signaturePath: string | null;  // null = 아직 미서명 (모바일 링크 발송용)
}): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const tmpl = getDefaultTemplate(input.templateKey);

  // signaturePath 가 본인 매장 폴더로 시작하는지 검증 (간단)
  if (
    input.signaturePath &&
    !input.signaturePath.startsWith(`${shop.id}/`)
  ) {
    return { error: "잘못된 서명 파일 경로입니다." };
  }

  // 매장에 동일 이름 템플릿이 있으면 그 template_id 사용, 없으면 기본 템플릿 자동 생성
  let templateId: string;
  let templateVersion: number;

  const { data: existingTmpl } = await admin
    .from("consent_form_templates")
    .select("id, version")
    .eq("shop_id", shop.id)
    .eq("name", tmpl.name)
    .maybeSingle();

  if (existingTmpl) {
    templateId = existingTmpl.id;
    templateVersion = existingTmpl.version;
  } else {
    const { data: created, error: tmplErr } = await admin
      .from("consent_form_templates")
      .insert({
        shop_id: shop.id,
        name: tmpl.name,
        content: tmpl.content,
        version: 1,
        is_active: true,
      })
      .select("id, version")
      .single();
    if (tmplErr || !created) {
      return { error: tmplErr?.message ?? "템플릿 생성 실패" };
    }
    templateId = created.id;
    templateVersion = created.version;
  }

  const now = new Date().toISOString();
  const { error } = await admin.from("consent_forms").insert({
    shop_id: shop.id,
    customer_id: input.customerId,
    booking_id: input.bookingId,
    template_id: templateId,
    template_version: templateVersion,
    signed_content_snapshot: tmpl.content,
    signature_url: input.signaturePath,
    signature_method: "IN_STORE",
    signed_at: input.signaturePath ? now : null,
    signer_name: input.signerName.trim() || null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/bookings/${input.bookingId}`);
  return {};
}

/**
 * 모바일 링크 동의서 발급.
 * PENDING 동의서 행을 INSERT (signature_method=REMOTE_LINK, signature_token, token_expires_at).
 * 매장은 이 토큰 URL 을 고객에게 SMS/카톡으로 보내고, 고객은 /consent/sign/[token] 에서 서명.
 */
export async function issueRemoteConsent(input: {
  bookingId: string;
  customerId: string;
  templateKey: string;
  signerName: string;
}): Promise<{ error?: string; token?: string }> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const tmpl = getDefaultTemplate(input.templateKey);

  // 매장 템플릿 멱등 보장 (기존 saveConsentForm 과 동일 로직)
  let templateId: string;
  let templateVersion: number;
  const { data: existingTmpl } = await admin
    .from("consent_form_templates")
    .select("id, version")
    .eq("shop_id", shop.id)
    .eq("name", tmpl.name)
    .maybeSingle();

  if (existingTmpl) {
    templateId = existingTmpl.id;
    templateVersion = existingTmpl.version;
  } else {
    const { data: created, error: tmplErr } = await admin
      .from("consent_form_templates")
      .insert({
        shop_id: shop.id,
        name: tmpl.name,
        content: tmpl.content,
        version: 1,
        is_active: true,
      })
      .select("id, version")
      .single();
    if (tmplErr || !created) return { error: tmplErr?.message ?? "템플릿 생성 실패" };
    templateId = created.id;
    templateVersion = created.version;
  }

  // URL-safe 토큰 (32 chars base64url)
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + REMOTE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin.from("consent_forms").insert({
    shop_id: shop.id,
    customer_id: input.customerId,
    booking_id: input.bookingId,
    template_id: templateId,
    template_version: templateVersion,
    signed_content_snapshot: tmpl.content,
    signature_url: null,
    signature_method: "REMOTE_LINK",
    signature_token: token,
    token_expires_at: expiresAt,
    signed_at: null,
    signer_name: input.signerName.trim() || null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/bookings/${input.bookingId}`);
  return { token };
}

export async function revokeRemoteConsent(input: {
  bookingId: string;
  consentId: string;
}): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { error } = await admin
    .from("consent_forms")
    .delete()
    .eq("id", input.consentId)
    .eq("shop_id", shop.id)
    .is("signed_at", null);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/bookings/${input.bookingId}`);
  return {};
}
