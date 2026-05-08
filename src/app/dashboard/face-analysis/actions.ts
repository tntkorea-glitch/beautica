"use server";

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";

export type BrowStyle = {
  rank: number;
  name: string;
  specs: Record<string, string>;
};

export type AnalysisResult = {
  hashtags: string[];
  summary: string;
  faceShape: string;
  vibe: string;
  browFeature: string;
  skinTone: string;
  boneLine: string;
  faceLine: string;
  improvementPoint: string;
  currentBrowFeatures: string[];
  recommendedStyles: BrowStyle[];
  notRecommendedStyles: { name: string; reason: string }[];
  tip: string;
  eyeRegion?: { x: number; y: number; w: number; h: number };
};

export type AnalysisProvider = "claude" | "openai";

// ─── 분석 프롬프트 ───────────────────────────────────────────
const ANALYSIS_PROMPT = `You are a top-level professional beauty artist specializing in eyebrow design.
Analyze the face photo and return ONLY a valid JSON object (no markdown, no explanation).

Required JSON structure:
{
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "summary": "3-4 sentence professional analysis in Korean. Warm, specific tone the client can relate to.",
  "faceShape": "얼굴형 (예: 부드러운 타원형 / 각진 사각형 / 긴 계란형 / 둥근형 / 하트형)",
  "vibe": "전체 분위기와 인상 (Korean)",
  "browFeature": "현재 눈썹 특징 구체적 묘사 (Korean)",
  "skinTone": "피부톤 (Korean, e.g. 뉴트럴 웜톤)",
  "boneLine": "골격 특징 (Korean)",
  "faceLine": "얼굴선 특징 (Korean)",
  "improvementPoint": "눈썹 시술로 보완 가능한 포인트 (Korean)",
  "currentBrowFeatures": ["특징1", "특징2", "특징3", "특징4"],
  "recommendedStyles": [
    {
      "rank": 1,
      "name": "눈썹 스타일명 (Korean)",
      "specs": {
        "길이": "중간~긴 편",
        "각도": "완만한 아치",
        "두께": "중간",
        "색감": "라이트 브라운",
        "전하기": "자연스러운 편",
        "산위치": "눈동자와 눈꼬리 사이",
        "라운드감": "부드러움"
      }
    },
    { "rank": 2, "name": "스타일2", "specs": {"길이":"","각도":"","두께":"","색감":"","전하기":"","산위치":"","라운드감":""} },
    { "rank": 3, "name": "스타일3", "specs": {"길이":"","각도":"","두께":"","색감":"","전하기":"","산위치":"","라운드감":""} }
  ],
  "notRecommendedStyles": [
    { "name": "비추천1 (Korean)", "reason": "이유 (Korean)" },
    { "name": "비추천2 (Korean)", "reason": "이유 (Korean)" }
  ],
  "tip": "실용적인 눈썹 관리 팁 한 문장 (Korean)",
  "eyeRegion": { "x": 0.10, "y": 0.28, "w": 0.80, "h": 0.22 }
}

eyeRegion: estimate the brow+eye area location as 0-1 ratios (x=left start, y=top start, w=width, h=height).`;

function extractJson(text: string): string | null {
  // Remove markdown code fences
  const stripped = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

// ─── 얼굴 분석 ───────────────────────────────────────────────
export async function analyzeFace(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
  provider: AnalysisProvider = "claude",
): Promise<{ result?: AnalysisResult; error?: string }> {
  await requireShop();

  try {
    let text = "";

    if (provider === "claude") {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return { error: "ANTHROPIC_API_KEY 가 설정되지 않았습니다." };
      const client = new Anthropic({ apiKey });
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            { type: "text", text: ANALYSIS_PROMPT },
          ],
        }],
      });
      text = message.content[0].type === "text" ? message.content[0].text : "";

    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return { error: "OPENAI_API_KEY 가 설정되지 않았습니다." };
      const client = new OpenAI({ apiKey });
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 3000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are a professional beauty and eyebrow artist. Always respond with valid JSON only, no markdown.",
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageBase64}`, detail: "high" } },
              { type: "text", text: ANALYSIS_PROMPT },
            ],
          },
        ],
      });
      text = response.choices[0]?.message?.content ?? "";
    }

    const jsonStr = extractJson(text);
    if (!jsonStr) return { error: `분석 결과를 파싱할 수 없습니다. 응답: ${text.slice(0, 200)}` };

    const result = JSON.parse(jsonStr) as AnalysisResult;
    return { result };

  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return { error: `분석 중 오류: ${msg}` };
  }
}

// ─── gpt-image-1 눈썹 스타일 이미지 생성 ─────────────────────
export type GeneratedImages = {
  recommended: string[];   // base64, index 0~2
  notRecommended: string[]; // base64, index 0~1
};

export type ImageQuality = "low" | "medium" | "high";

export async function generateBrowImages(
  result: AnalysisResult,
  quality: ImageQuality = "medium",
): Promise<{ images?: GeneratedImages; error?: string }> {
  await requireShop();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { error: "OPENAI_API_KEY 가 설정되지 않았습니다." };
  const client = new OpenAI({ apiKey });

  function browPrompt(name: string, specs: Record<string, string>, isGood: boolean): string {
    const specText = Object.entries(specs)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    const mood = isGood
      ? "flattering, recommended, beautiful result"
      : "unflattering, not recommended, heavy impression";
    return (
      `Ultra close-up professional beauty photo of eyebrows only. ` +
      `Style: ${name}. ${specText}. ` +
      `Asian face, Korean beauty aesthetic, soft warm lighting, natural skin background. ` +
      `${mood}. ` +
      `Shot from directly in front, only showing the eye and brow area, no text, clean professional photo.`
    );
  }

  try {
    const prompts = [
      ...result.recommendedStyles.slice(0, 3).map((s) =>
        browPrompt(s.name, s.specs, true)
      ),
      ...result.notRecommendedStyles.slice(0, 2).map((s) =>
        browPrompt(s.name, {}, false)
      ),
    ];

    const results = await Promise.allSettled(
      prompts.map((prompt) =>
        client.images.generate({
          model: "gpt-image-2",
          prompt,
          n: 1,
          size: "1024x1024",
          quality,
          output_format: "jpeg",
        })
      )
    );

    const firstError = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
    if (firstError && results.every((r) => r.status === "rejected")) {
      const msg = firstError.reason instanceof Error ? firstError.reason.message : String(firstError.reason);
      return { error: `이미지 생성 오류: ${msg}` };
    }

    const images: string[] = results.map((r) => {
      if (r.status === "fulfilled") {
        return ((r.value.data ?? [])[0] as { b64_json?: string } | undefined)?.b64_json ?? "";
      }
      return "";
    });

    return {
      images: {
        recommended:    images.slice(0, 3),
        notRecommended: images.slice(3, 5),
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return { error: `이미지 생성 오류: ${msg}` };
  }
}

// ─── 고객 검색 ────────────────────────────────────────────────
export type CustomerHit = { id: string; name: string; phone: string | null };

export async function searchCustomers(query: string): Promise<CustomerHit[]> {
  const { shop } = await requireShop();
  if (!query.trim()) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("customers")
    .select("id, name, phone")
    .eq("shop_id", shop.id)
    .ilike("name", `%${query.trim()}%`)
    .order("name")
    .limit(8);
  return (data ?? []) as CustomerHit[];
}

// ─── 분석 결과 저장 ───────────────────────────────────────────
export async function saveAnalysisResult(
  customerId: string | null,
  analysis: AnalysisResult,
): Promise<{ id?: string; error?: string }> {
  const { shop } = await requireShop();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("face_analysis_results")
    .insert({ shop_id: shop.id, customer_id: customerId ?? null, analysis_json: analysis })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: (data as { id: string }).id };
}
