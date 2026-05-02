"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { error?: string };

/**
 * 모바일 링크 동의서 서명 저장 (anon 호출).
 * 토큰 검증 → 서명 PNG 를 admin client 로 storage 업로드 → DB 업데이트.
 *
 * 보안: 익명 호출이므로 token 으로 행 식별. 토큰은 32-char base64url (랜덤 24바이트).
 *       이미 서명됐거나 만료됐으면 reject. 같은 토큰 재사용 불가 (signed_at 박힌 후 수정 차단).
 */
export async function submitMobileSignature(input: {
  token: string;
  signatureBase64: string; // "data:image/png;base64,..." 또는 raw base64
  signerName: string;
}): Promise<Result> {
  if (!input.token || input.token.length < 16) return { error: "잘못된 링크입니다." };

  const admin = createAdminClient();

  const { data: row } = await admin
    .from("consent_forms")
    .select("id, shop_id, customer_id, signed_at, signature_method, token_expires_at")
    .eq("signature_token", input.token)
    .maybeSingle();

  if (!row) return { error: "이 링크는 유효하지 않습니다." };
  if (row.signature_method !== "REMOTE_LINK") return { error: "잘못된 링크 형식입니다." };
  if (row.signed_at) return { error: "이미 서명된 동의서입니다." };
  if (row.token_expires_at && new Date(row.token_expires_at).getTime() < Date.now()) {
    return { error: "링크가 만료되었습니다. 매장에 다시 요청해주세요." };
  }

  // base64 → Buffer
  const raw = input.signatureBase64.startsWith("data:")
    ? input.signatureBase64.split(",")[1] ?? ""
    : input.signatureBase64;
  if (!raw) return { error: "서명 이미지 데이터가 없습니다." };

  const buffer = Buffer.from(raw, "base64");
  if (buffer.length === 0) return { error: "서명 이미지 데이터가 비어있습니다." };
  if (buffer.length > 2 * 1024 * 1024) {
    return { error: "서명 이미지가 너무 큽니다 (2MB 초과)." };
  }

  // 경로에 timestamp 포함 — 동시 서명/재업로드 시 race condition 으로
  // 다른 사람의 PNG 를 덮어쓰는 사고 방지 (orphan 은 무해)
  const path = `${row.shop_id}/${row.customer_id}/signatures/${row.id}-${Date.now()}.png`;
  const { error: upErr } = await admin.storage
    .from("customer-photos")
    .upload(path, buffer, { contentType: "image/png", upsert: false });
  if (upErr) {
    console.error("[consent/sign] storage upload 실패:", upErr);
    return { error: `서명 이미지 저장 실패: ${upErr.message}` };
  }

  const now = new Date().toISOString();
  const { error: updErr } = await admin
    .from("consent_forms")
    .update({
      signature_url: path,
      signed_at: now,
      signer_name: input.signerName.trim() || null,
    })
    .eq("id", row.id)
    .is("signed_at", null);

  if (updErr) {
    console.error("[consent/sign] DB update 실패:", updErr);
    return { error: `서명 저장 실패: ${updErr.message}` };
  }

  revalidatePath(`/consent/sign/${input.token}`);
  return {};
}
