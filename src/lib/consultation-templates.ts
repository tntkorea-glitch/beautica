/**
 * 시술 카테고리별 상담차트 템플릿 (MVP — 코드 상수)
 * 반반노트 패턴 차용: 시술 종류 선택 시 그에 맞는 체크리스트 자동 로드.
 * 매장별 커스텀 템플릿 편집 기능은 Phase 4.
 */

export type ChartFieldType = "yesno" | "radio" | "text" | "textarea";

export type ChartField = {
  key: string;
  label: string;
  type: ChartFieldType;
  options?: string[]; // radio 용
  hint?: string;
};

export type ChartTemplate = {
  key: string;
  name: string;
  emoji: string;
  description?: string;
  fields: ChartField[];
};

const COMMON_HEAD: ChartField[] = [
  { key: "skin_type", label: "피부 타입", type: "radio", options: ["건성", "지성", "복합성", "민감성", "중성"] },
  { key: "allergies", label: "알러지", type: "yesno", hint: "Yes 면 옆 칸에 종류 입력" },
  { key: "medications", label: "복용약", type: "yesno" },
  { key: "previous_treatments", label: "이전 시술 이력", type: "textarea" },
];

const COMMON_TAIL: ChartField[] = [
  { key: "desired_design", label: "원하는 디자인 / 스타일", type: "textarea" },
  { key: "shop_assessment", label: "매장 평가 / 권장 시술", type: "textarea" },
  { key: "notes", label: "기타 메모", type: "textarea" },
];

export const CHART_TEMPLATES: ChartTemplate[] = [
  {
    key: "EYE_BROW",
    name: "눈썹 (반영구)",
    emoji: "✨",
    description: "엠보/콤보/마이크로블레이딩",
    fields: [
      ...COMMON_HEAD,
      { key: "brow_shape_pref", label: "선호 모양", type: "radio", options: ["일자형", "아치형", "각진형", "자연형"] },
      { key: "color_pref", label: "선호 색조", type: "radio", options: ["블랙", "다크브라운", "브라운", "라이트브라운", "헤이즐"] },
      { key: "had_brow_before", label: "이전 반영구 시술 경험", type: "yesno" },
      ...COMMON_TAIL,
    ],
  },
  {
    key: "EYE_LINE",
    name: "아이라인",
    emoji: "👁️",
    description: "점안식/얇은선/굵은선",
    fields: [
      ...COMMON_HEAD,
      { key: "eye_sensitivity", label: "눈 시림/예민함", type: "yesno" },
      { key: "lens_user", label: "콘택트렌즈 사용", type: "yesno" },
      { key: "line_thickness", label: "원하는 굵기", type: "radio", options: ["점안식", "얇은선", "중간선", "굵은선"] },
      ...COMMON_TAIL,
    ],
  },
  {
    key: "COLOR_LIP",
    name: "입술 (컬러립)",
    emoji: "💋",
    description: "컬러립/베이비립",
    fields: [
      ...COMMON_HEAD,
      { key: "herpes_history", label: "헤르페스 이력", type: "yesno", hint: "있을 시 시술 1주 전 항바이러스제 권장" },
      { key: "lip_color_pref", label: "원하는 색조", type: "radio", options: ["코랄", "MLBB", "체리", "누드핑크", "오렌지", "기타"] },
      ...COMMON_TAIL,
    ],
  },
  {
    key: "HAIR_LINE",
    name: "헤어라인",
    emoji: "💇",
    description: "이마라인/모근",
    fields: [
      ...COMMON_HEAD,
      { key: "scalp_condition", label: "두피 상태", type: "radio", options: ["정상", "건성", "지성", "비듬", "민감"] },
      { key: "hair_loss_history", label: "탈모 진행", type: "yesno" },
      ...COMMON_TAIL,
    ],
  },
  {
    key: "SMP",
    name: "두피문신 (SMP)",
    emoji: "🪖",
    description: "Scalp Micropigmentation",
    fields: [
      ...COMMON_HEAD,
      { key: "scalp_treatment", label: "두피 치료 받은 적", type: "yesno" },
      { key: "minoxidil_use", label: "미녹시딜 사용", type: "yesno" },
      ...COMMON_TAIL,
    ],
  },
  {
    key: "GENERAL",
    name: "일반/기타",
    emoji: "📝",
    description: "위 분류에 없는 경우",
    fields: [
      ...COMMON_HEAD,
      ...COMMON_TAIL,
    ],
  },
];

export function getTemplate(key: string): ChartTemplate {
  return CHART_TEMPLATES.find((t) => t.key === key) ?? CHART_TEMPLATES[CHART_TEMPLATES.length - 1];
}
