/**
 * 시술 카테고리별 상담차트 템플릿 (MVP — 코드 상수)
 * 시술 메뉴 등록 시 카테고리(@/lib/categories.ts BASE_CATEGORY_PRESETS) 와 1:1 매칭.
 * 시술 등록 시 카테고리가 곧 차트 템플릿이 됨.
 */

export type ChartFieldType = "yesno" | "radio" | "multicheck" | "text" | "textarea";

export type ChartField = {
  key: string;
  label: string;
  type: ChartFieldType;
  options?: string[];
  hint?: string;
};

export type ChartTemplate = {
  /** lib/categories.ts BASE_CATEGORY_PRESETS 와 동일한 한국어 라벨 */
  key: string;
  name: string;
  emoji: string;
  description?: string;
  fields: ChartField[];
};

const CUSTOMER_HEAD: ChartField[] = [
  { key: "customer_type", label: "고객 유형", type: "radio", options: ["신규 고객", "기존 고객"] },
  { key: "referral", label: "유입 경로", type: "radio", options: ["SNS", "블로그", "검색", "지인소개"] },
];

const COMMON_HEALTH: ChartField[] = [
  { key: "skin_type", label: "피부 타입", type: "radio", options: ["건성", "지성", "복합성", "민감성", "중성"] },
  { key: "allergies", label: "알러지", type: "yesno", hint: "Yes 면 옆 칸에 종류 입력" },
  { key: "medications", label: "복용약", type: "yesno" },
];

const COMMON_TAIL: ChartField[] = [
  { key: "desired_design", label: "원하는 디자인 / 스타일", type: "textarea" },
  { key: "shop_assessment", label: "매장 평가 / 권장 시술", type: "textarea" },
  { key: "notes", label: "기타 메모", type: "textarea" },
];

export const CHART_TEMPLATES: ChartTemplate[] = [
  // ─────────── 헤어 ───────────
  {
    key: "헤어",
    name: "헤어",
    emoji: "💇",
    description: "컷 / 펌 / 염색 / 클리닉",
    fields: [
      ...CUSTOMER_HEAD,
      { key: "service_item", label: "시술 종목", type: "multicheck", options: ["컷", "펌", "염색", "클리닉", "매직", "볼륨매직", "드라이"] },
      { key: "hair_condition", label: "모발 상태", type: "radio", options: ["건강모", "약간 손상", "심한 손상", "탈색모"] },
      { key: "scalp_sensitive", label: "두피 민감/통증", type: "yesno" },
      { key: "previous_color", label: "이전 염색·펌 이력", type: "textarea" },
      ...COMMON_TAIL,
    ],
  },
  // ─────────── 네일 ───────────
  {
    key: "네일",
    name: "네일",
    emoji: "💅",
    description: "젤 / 아크릴 / 페디",
    fields: [
      ...CUSTOMER_HEAD,
      { key: "nail_removal", label: "제거", type: "radio", options: ["없음", "타샵제거", "자샵제거"] },
      { key: "nail_type", label: "네일 타입", type: "radio", options: ["젤 원톤", "원톤 그라데이션", "투톤 그라데이션", "프렌치", "마블", "아크릴 연장"] },
      { key: "pedi_type", label: "패디", type: "radio", options: ["없음", "원톤", "그라데이션", "프렌치"] },
      { key: "nail_length", label: "길이 (cm)", type: "radio", options: ["1.5 이하", "1.6–2.5", "2.6–3.5", "3.6–4.5", "4.6–5.5", "5.6 이상"] },
      { key: "nail_shape", label: "쉐입", type: "radio", options: ["라운드", "스퀘어", "라운드 스퀘어", "코핀", "포인트", "스틸레토"] },
      { key: "right_fingers", label: "오른손 특이사항 (엄지~소지)", type: "textarea" },
      { key: "left_fingers", label: "왼손 특이사항 (엄지~소지)", type: "textarea" },
      { key: "notes", label: "기타 메모", type: "textarea" },
    ],
  },
  // ─────────── 반영구 ───────────
  {
    key: "반영구",
    name: "반영구",
    emoji: "✨",
    description: "눈썹 / 아이라인 / 입술 / 헤어라인 / SMP",
    fields: [
      ...CUSTOMER_HEAD,
      { key: "semi_item", label: "시술 부위", type: "multicheck", options: ["눈썹", "아이라인", "입술", "헤어라인", "SMP(두피문신)"] },
      { key: "brow_shape", label: "선호 모양 (눈썹)", type: "radio", options: ["일자형", "아치형", "각진형", "자연형"] },
      { key: "color_pref", label: "선호 색조", type: "radio", options: ["블랙", "다크브라운", "브라운", "라이트브라운", "헤이즐"] },
      { key: "had_before", label: "이전 반영구 시술 경험", type: "yesno" },
      { key: "herpes_history", label: "헤르페스 이력 (입술 시술 시)", type: "yesno" },
      ...COMMON_HEALTH,
      ...COMMON_TAIL,
    ],
  },
  // ─────────── 속눈썹펌 ───────────
  {
    key: "속눈썹펌",
    name: "속눈썹펌",
    emoji: "👁",
    description: "속눈썹 펌 전용",
    fields: [
      ...CUSTOMER_HEAD,
      { key: "perm_type", label: "펌 종류", type: "radio", options: ["일반 펌", "케라틴 펌", "자연속눈썹 펌"] },
      { key: "perm_curl", label: "컬링 강도", type: "radio", options: ["자연스럽게", "보통", "강하게"] },
      { key: "lash_condition", label: "속눈썹 모발 상태", type: "radio", options: ["나쁨", "보통", "좋음"] },
      { key: "lash_density", label: "속눈썹 모발 모양", type: "radio", options: ["적음", "보통", "풍성"] },
      { key: "lash_angle", label: "속눈썹 모발 각도", type: "radio", options: ["처짐", "보통", "높음"] },
      { key: "first_time", label: "속눈썹 시술이 처음이다", type: "yesno" },
      { key: "eye_condition", label: "안질환 또는 최근 안과 치료", type: "yesno" },
      { key: "eye_allergy", label: "평상시 알러지, 눈가 간지러움", type: "yesno" },
      { key: "weak_lash", label: "속눈썹이 쉽게 빠지고 약하다", type: "yesno" },
      { key: "eye_rubbing", label: "눈을 자주 비비는 습관", type: "yesno" },
      { key: "notes", label: "기타 메모", type: "textarea" },
    ],
  },
  // ─────────── 속눈썹연장 ───────────
  {
    key: "속눈썹연장",
    name: "속눈썹연장",
    emoji: "👁",
    description: "속눈썹 연장 / 제거",
    fields: [
      ...CUSTOMER_HEAD,
      { key: "ext_service", label: "시술 종목", type: "multicheck", options: ["속눈썹 연장", "타샵 제거", "자샵 제거", "리터치"] },
      { key: "lash_style", label: "타입", type: "radio", options: ["내추럴", "아이돌", "볼륨", "캣아이"] },
      { key: "lash_thickness", label: "두께", type: "radio", options: ["0.07", "0.10", "0.15", "0.20", "0.25"] },
      { key: "lash_length", label: "길이", type: "radio", options: ["7mm", "8mm", "9mm", "10mm", "11mm", "12mm", "13mm", "14mm", "15mm", "16mm"] },
      { key: "lash_curl", label: "컬", type: "radio", options: ["J컬", "JC컬", "C컬", "D컬"] },
      { key: "lash_volume", label: "볼륨", type: "radio", options: ["1D", "2D", "3D", "4D", "5D"] },
      { key: "lash_condition", label: "속눈썹 모발 상태", type: "radio", options: ["나쁨", "보통", "좋음"] },
      { key: "first_time", label: "속눈썹 시술이 처음이다", type: "yesno" },
      { key: "eye_condition", label: "안질환 또는 최근 안과 치료", type: "yesno" },
      { key: "eye_allergy", label: "평상시 알러지, 눈가 간지러움", type: "yesno" },
      { key: "weak_lash", label: "속눈썹이 쉽게 빠지고 약하다", type: "yesno" },
      { key: "eye_rubbing", label: "눈을 자주 비비는 습관", type: "yesno" },
      { key: "notes", label: "기타 메모", type: "textarea" },
    ],
  },
  // ─────────── LED속눈썹연장 ───────────
  {
    key: "LED속눈썹연장",
    name: "LED속눈썹연장",
    emoji: "💡",
    description: "LED 글루 속눈썹 연장",
    fields: [
      ...CUSTOMER_HEAD,
      { key: "led_service", label: "시술 종목", type: "multicheck", options: ["LED 연장", "리터치", "타샵 제거", "자샵 제거"] },
      { key: "lash_style", label: "타입", type: "radio", options: ["내추럴", "아이돌", "볼륨", "캣아이"] },
      { key: "lash_thickness", label: "두께", type: "radio", options: ["0.07", "0.10", "0.15", "0.20"] },
      { key: "lash_length", label: "길이", type: "radio", options: ["8mm", "9mm", "10mm", "11mm", "12mm", "13mm", "14mm"] },
      { key: "lash_curl", label: "컬", type: "radio", options: ["J컬", "JC컬", "C컬", "D컬"] },
      { key: "led_intensity", label: "LED 조사 강도", type: "radio", options: ["약", "중", "강"] },
      { key: "first_time", label: "LED 연장이 처음이다", type: "yesno" },
      { key: "eye_condition", label: "안질환 또는 최근 안과 치료", type: "yesno" },
      { key: "notes", label: "기타 메모", type: "textarea" },
    ],
  },
  // ─────────── 스킨케어 ───────────
  {
    key: "스킨케어",
    name: "스킨케어",
    emoji: "🌿",
    description: "기본 관리 / 딥클렌징 / 미백 / 진정",
    fields: [
      ...CUSTOMER_HEAD,
      { key: "skin_program", label: "프로그램", type: "multicheck", options: ["딥클렌징", "재생/진정", "미백", "탄력", "트러블", "수분"] },
      ...COMMON_HEALTH,
      { key: "skin_trouble", label: "현재 트러블", type: "multicheck", options: ["여드름", "색소침착", "홍조", "각질", "건조", "유분과다"] },
      { key: "recent_derma", label: "최근 1개월 이내 피부과 진료", type: "yesno" },
      { key: "skincare_use", label: "사용 중인 제품", type: "multicheck", options: ["AHA/BHA", "레티놀", "비타민C", "여드름 치료제", "주름개선"] },
      ...COMMON_TAIL,
    ],
  },
  // ─────────── 메디컬에스테틱 ───────────
  {
    key: "메디컬에스테틱",
    name: "메디컬에스테틱",
    emoji: "💊",
    description: "관리형 의료 미용 — 리프팅 / 광치료",
    fields: [
      ...CUSTOMER_HEAD,
      { key: "medical_program", label: "프로그램", type: "multicheck", options: ["고주파 리프팅", "초음파", "LED", "레이저 톤업", "스킨부스터", "필링"] },
      ...COMMON_HEALTH,
      { key: "implants", label: "필러/보톡스/실 등 시술 이력", type: "yesno" },
      { key: "recent_derma", label: "최근 1개월 이내 피부과/병원 시술", type: "yesno" },
      { key: "pregnant", label: "임신/수유중", type: "yesno" },
      ...COMMON_TAIL,
    ],
  },
  // ─────────── 왁싱 ───────────
  {
    key: "왁싱",
    name: "왁싱",
    emoji: "🌸",
    description: "하드/소프트 왁싱",
    fields: [
      ...CUSTOMER_HEAD,
      { key: "gender", label: "성별", type: "radio", options: ["여성", "남성"] },
      { key: "wax_type", label: "왁스 타입", type: "radio", options: ["하드", "소프트"] },
      { key: "service_face", label: "시술 부위 — 페이스", type: "multicheck", options: ["헤어라인", "눈썹", "구렛나루", "인중/코/귀", "턱", "풀페이스"] },
      { key: "service_body", label: "시술 부위 — 상체", type: "multicheck", options: ["뒷목", "겨드랑이", "팔하프", "팔전체", "손등/손가락", "가슴", "배", "등"] },
      { key: "service_brazilian", label: "시술 부위 — 브라질리언", type: "multicheck", options: ["비키니 라인", "디자인", "올누드", "풀바디", "항문/엉덩이"] },
      { key: "service_leg", label: "시술 부위 — 하체", type: "multicheck", options: ["허벅지", "종아리", "다리전체", "발등/발가락"] },
      { key: "first_time", label: "왁싱 시술이 처음이다", type: "yesno" },
      { key: "skin_disease", label: "피부질환이 있다", type: "yesno" },
      { key: "skin_disease_type", label: "피부질환 종류", type: "multicheck", options: ["당뇨", "건선", "포진(두드러기)", "습진/무좀", "지루성 피부염", "아토피", "여드름"] },
      { key: "recent_derma", label: "최근 1개월 이내 피부과 진료", type: "yesno" },
      { key: "medications", label: "병원 처방 복용약", type: "yesno" },
      { key: "pregnant", label: "현재 임신중 (여성)", type: "yesno" },
      { key: "skincare", label: "사용 중인 스킨케어 제품", type: "multicheck", options: ["AHA/BHA 필링", "여드름", "주름개선", "태닝"] },
      { key: "notes", label: "기타 메모", type: "textarea" },
    ],
  },
  // ─────────── 슈가링왁싱 ───────────
  {
    key: "슈가링왁싱",
    name: "슈가링왁싱",
    emoji: "🍯",
    description: "슈가링 페이스트",
    fields: [
      ...CUSTOMER_HEAD,
      { key: "gender", label: "성별", type: "radio", options: ["여성", "남성"] },
      { key: "service_face", label: "시술 부위 — 페이스", type: "multicheck", options: ["헤어라인", "눈썹", "구렛나루", "인중/코/귀", "턱", "풀페이스"] },
      { key: "service_body", label: "시술 부위 — 상체", type: "multicheck", options: ["뒷목", "겨드랑이", "팔하프", "팔전체", "손등/손가락", "가슴", "배", "등"] },
      { key: "service_brazilian", label: "시술 부위 — 브라질리언", type: "multicheck", options: ["비키니 라인", "디자인", "올누드", "풀바디", "항문/엉덩이"] },
      { key: "service_leg", label: "시술 부위 — 하체", type: "multicheck", options: ["허벅지", "종아리", "다리전체", "발등/발가락"] },
      { key: "first_time", label: "슈가링이 처음이다", type: "yesno" },
      { key: "skin_disease", label: "피부질환이 있다", type: "yesno" },
      { key: "recent_derma", label: "최근 1개월 이내 피부과 진료", type: "yesno" },
      { key: "medications", label: "병원 처방 복용약", type: "yesno" },
      { key: "pregnant", label: "현재 임신중 (여성)", type: "yesno" },
      { key: "notes", label: "기타 메모", type: "textarea" },
    ],
  },
  // ─────────── 메이크업 ───────────
  {
    key: "메이크업",
    name: "메이크업",
    emoji: "💄",
    description: "데일리 / 웨딩 / 헤어메이크업",
    fields: [
      ...CUSTOMER_HEAD,
      { key: "makeup_purpose", label: "용도", type: "radio", options: ["데일리", "포토", "웨딩", "행사", "기타"] },
      { key: "makeup_style", label: "스타일", type: "radio", options: ["내추럴", "글로우", "큐티", "고저스", "스모키"] },
      ...COMMON_HEALTH,
      { key: "color_pref", label: "선호 색조", type: "textarea", hint: "립/아이/블러셔 등" },
      ...COMMON_TAIL,
    ],
  },
  // ─────────── 발관리 ───────────
  {
    key: "발관리",
    name: "발관리",
    emoji: "🦶",
    description: "각질 / 굳은살 / 무좀 케어",
    fields: [
      ...CUSTOMER_HEAD,
      { key: "foot_program", label: "프로그램", type: "multicheck", options: ["각질 제거", "굳은살 제거", "무좀 케어", "지압/마사지", "패디큐어"] },
      { key: "foot_condition", label: "발 상태", type: "multicheck", options: ["건조/각질", "굳은살", "갈라짐", "무좀", "내성발톱"] },
      { key: "diabetic", label: "당뇨가 있다", type: "yesno" },
      { key: "skin_disease", label: "피부질환이 있다", type: "yesno" },
      ...COMMON_TAIL,
    ],
  },
  // ─────────── 기타 ───────────
  {
    key: "기타",
    name: "기타",
    emoji: "📝",
    description: "위 분류에 없는 시술",
    fields: [
      ...CUSTOMER_HEAD,
      ...COMMON_HEALTH,
      { key: "previous_treatments", label: "이전 시술 이력", type: "textarea" },
      ...COMMON_TAIL,
    ],
  },
];

export function getTemplate(key: string): ChartTemplate {
  return CHART_TEMPLATES.find((t) => t.key === key) ?? CHART_TEMPLATES[CHART_TEMPLATES.length - 1];
}

/**
 * 차트 템플릿 키 결정 — service.category 우선, 없으면 service.name 키워드 매칭.
 * 시술 메뉴 등록 시 카테고리(BASE_CATEGORY_PRESETS) 가 그대로 차트 키와 일치하므로,
 * category 가 있으면 직접 매칭만 하면 된다.
 */
export function inferTemplateKey(
  serviceCategory?: string | null,
  serviceName?: string | null,
): string {
  // 1) 카테고리 직접 매칭
  if (serviceCategory) {
    const cat = serviceCategory.trim();
    if (CHART_TEMPLATES.some((t) => t.key === cat)) return cat;
  }

  // 2) 카테고리 없을 때만 시술명 키워드 fallback
  if (serviceName) {
    const n = serviceName.toLowerCase().replace(/\s+/g, "");
    if (/led.*속눈썹|속눈썹.*led/.test(n)) return "LED속눈썹연장";
    if (/속눈썹.*펌|래쉬리프트|lashlift/.test(n)) return "속눈썹펌";
    if (/속눈썹|래쉬|lash|eyelash/.test(n)) return "속눈썹연장";
    if (/슈가링|sugar/.test(n)) return "슈가링왁싱";
    if (/왁싱|wax/.test(n)) return "왁싱";
    if (/네일|아크릴|패디|젤|nail/.test(n)) return "네일";
    if (/눈썹|엠보|콤보|마이크로|반영구|아이라인|컬러립|입술|헤어라인|smp/.test(n))
      return "반영구";
    if (/헤어|컷|펌|염색|클리닉|매직|볼륨/.test(n)) return "헤어";
    if (/메디컬|레이저|고주파|초음파|리프팅/.test(n)) return "메디컬에스테틱";
    if (/스킨|관리|필링|클렌징/.test(n)) return "스킨케어";
    if (/메이크업|makeup/.test(n)) return "메이크업";
    if (/발|족|패디/.test(n)) return "발관리";
  }

  return "기타";
}
