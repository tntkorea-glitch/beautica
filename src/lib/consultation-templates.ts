/**
 * 시술 카테고리별 상담차트 템플릿 (MVP — 코드 상수)
 * 반반노트 패턴 차용: 시술 종류 선택 시 그에 맞는 체크리스트 자동 로드.
 * 매장별 커스텀 템플릿 편집 기능은 Phase 4.
 */

export type ChartFieldType = "yesno" | "radio" | "multicheck" | "text" | "textarea";

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
  // ─────────────────────────────────────────────────────────
  // 속눈썹 (연장 / 펌 / 제거)
  // ─────────────────────────────────────────────────────────
  {
    key: "EYELASH",
    name: "속눈썹",
    emoji: "👁",
    description: "속눈썹 연장 / 펌 / 제거",
    fields: [
      { key: "customer_type", label: "고객 유형", type: "radio", options: ["신규 고객", "기존 고객"] },
      { key: "referral", label: "유입 경로", type: "radio", options: ["SNS", "블로그", "검색", "지인소개"] },
      { key: "eyelash_service", label: "시술 종목", type: "multicheck", options: ["속눈썹 연장", "타샵 제거", "자샵 제거", "속눈썹 펌"] },
      { key: "lash_style", label: "타입", type: "radio", options: ["내추럴", "아이돌", "볼륨", "캣아이"] },
      { key: "lash_thickness", label: "두께", type: "radio", options: ["0.07", "0.10", "0.15", "0.20", "0.25"] },
      { key: "lash_length", label: "길이", type: "radio", options: ["7mm", "8mm", "9mm", "10mm", "11mm", "12mm", "13mm", "14mm", "15mm", "16mm"] },
      { key: "lash_curl", label: "컬", type: "radio", options: ["J컬", "JC컬", "C컬", "D컬"] },
      { key: "lash_volume", label: "볼륨", type: "radio", options: ["2D", "3D", "4D", "5D"] },
      { key: "first_time", label: "속눈썹 시술이 처음이다", type: "yesno" },
      { key: "eye_condition", label: "안질환 또는 최근 안과 치료", type: "yesno" },
      { key: "eye_allergy", label: "평상시 알러지, 눈가 간지러움", type: "yesno" },
      { key: "weak_lash", label: "속눈썹이 쉽게 빠지고 약하다", type: "yesno" },
      { key: "eye_rubbing", label: "눈을 자주 비비는 습관", type: "yesno" },
      { key: "lash_condition", label: "속눈썹 모발 상태", type: "radio", options: ["나쁨", "보통", "좋음"] },
      { key: "lash_density", label: "속눈썹 모발 모양", type: "radio", options: ["적음", "보통", "풍성"] },
      { key: "lash_angle", label: "속눈썹 모발 각도", type: "radio", options: ["처짐", "보통", "높음"] },
      { key: "natural_style", label: "자연스러운 스타일 선호", type: "yesno" },
      { key: "bold_style", label: "진하고 티 나는 스타일 선호", type: "yesno" },
      { key: "notes", label: "기타 메모", type: "textarea" },
    ],
  },
  // ─────────────────────────────────────────────────────────
  // 왁싱 (여성)
  // ─────────────────────────────────────────────────────────
  {
    key: "WAXING_FEMALE",
    name: "왁싱 (여성)",
    emoji: "🌸",
    description: "왁싱 시술 고객차트 — 여성",
    fields: [
      { key: "customer_type", label: "고객 유형", type: "radio", options: ["신규 고객", "기존 고객"] },
      { key: "referral", label: "유입 경로", type: "radio", options: ["SNS", "블로그", "검색", "지인소개"] },
      { key: "wax_type", label: "왁스 타입", type: "radio", options: ["하드", "소프트", "슈가링"] },
      { key: "skin_note", label: "피부 특이사항", type: "textarea" },
      { key: "service_face", label: "시술 부위 — 페이스", type: "multicheck", options: ["헤어라인", "눈썹", "구렛나루", "인중/코/귀", "턱", "풀페이스"] },
      { key: "service_body", label: "시술 부위 — 상체", type: "multicheck", options: ["뒷목", "겨드랑이", "팔하프", "팔전체", "손등/손가락", "가슴", "배", "등"] },
      { key: "service_brazilian", label: "시술 부위 — 브라질리언", type: "multicheck", options: ["비키니 라인", "디자인", "올누드", "풀바디", "항문/엉덩이"] },
      { key: "service_leg", label: "시술 부위 — 하체", type: "multicheck", options: ["허벅지", "종아리", "다리전체", "발등/발가락"] },
      { key: "first_time", label: "왁싱 시술이 처음이다", type: "yesno" },
      { key: "skin_disease", label: "피부질환이 있다", type: "yesno" },
      { key: "skin_disease_type", label: "피부질환 종류", type: "multicheck", options: ["당뇨", "건선", "포진(두드러기)", "습진/무좀", "지루성 피부염", "아토피", "여드름"] },
      { key: "recent_derma", label: "최근 1개월 이내 피부과 진료", type: "yesno" },
      { key: "medications", label: "병원 처방 복용약", type: "yesno" },
      { key: "pregnant", label: "현재 임신중", type: "yesno" },
      { key: "skincare", label: "사용 중인 스킨케어 제품", type: "multicheck", options: ["아하/바하/파라/라하 필링", "여드름", "주름개선", "태닝"] },
      { key: "notes", label: "기타 메모", type: "textarea" },
    ],
  },
  // ─────────────────────────────────────────────────────────
  // 왁싱 (남성)
  // ─────────────────────────────────────────────────────────
  {
    key: "WAXING_MALE",
    name: "왁싱 (남성)",
    emoji: "🫧",
    description: "왁싱 시술 고객차트 — 남성",
    fields: [
      { key: "customer_type", label: "고객 유형", type: "radio", options: ["신규 고객", "기존 고객"] },
      { key: "referral", label: "유입 경로", type: "radio", options: ["SNS", "블로그", "검색", "지인소개"] },
      { key: "wax_type", label: "왁스 타입", type: "radio", options: ["하드", "소프트", "슈가링"] },
      { key: "skin_note", label: "피부 특이사항", type: "textarea" },
      { key: "service_face", label: "시술 부위 — 페이스", type: "multicheck", options: ["헤어라인", "눈썹", "구렛나루", "인중/코/귀", "턱수염", "풀페이스"] },
      { key: "service_body", label: "시술 부위 — 상체", type: "multicheck", options: ["뒷목", "겨드랑이", "팔하프", "팔전체", "손등/손가락", "가슴", "배", "등"] },
      { key: "service_brazilian", label: "시술 부위 — 브라질리언", type: "multicheck", options: ["비키니 라인", "디자인", "올누드", "풀바디", "항문/엉덩이"] },
      { key: "service_leg", label: "시술 부위 — 하체", type: "multicheck", options: ["허벅지", "종아리", "다리전체", "발등/발가락"] },
      { key: "first_time", label: "왁싱 시술이 처음이다", type: "yesno" },
      { key: "skin_disease", label: "피부질환이 있다", type: "yesno" },
      { key: "skin_disease_type", label: "피부질환 종류", type: "multicheck", options: ["당뇨", "건선", "포진(두드러기)", "습진/무좀", "지루성 피부염", "아토피", "여드름"] },
      { key: "recent_derma", label: "최근 1개월 이내 피부과 진료", type: "yesno" },
      { key: "medications", label: "병원 처방 복용약", type: "yesno" },
      { key: "skincare", label: "사용 중인 스킨케어 제품", type: "multicheck", options: ["아하/바하/파라/라하 필링", "여드름", "주름개선", "태닝"] },
      { key: "notes", label: "기타 메모", type: "textarea" },
    ],
  },
  // ─────────────────────────────────────────────────────────
  // 네일 아크릴
  // ─────────────────────────────────────────────────────────
  {
    key: "ACRYLIC_NAIL",
    name: "네일 아크릴",
    emoji: "💅",
    description: "아크릴 네일 / 패디 시술",
    fields: [
      { key: "customer_type", label: "고객 유형", type: "radio", options: ["신규 고객", "기존 고객"] },
      { key: "nail_removal", label: "제거", type: "radio", options: ["없음", "타샵제거", "자샵제거"] },
      { key: "nail_type", label: "아크릴 네일", type: "radio", options: ["연장 기본", "원톤", "원톤 그라데이션", "투톤 그라데이션", "쓰리톤 그라데이션", "마블", "프렌치"] },
      { key: "pedi_type", label: "아크릴 패디", type: "radio", options: ["없음", "원톤", "그라데이션", "프렌치"] },
      { key: "nail_length", label: "길이 (cm)", type: "radio", options: ["1.5 이하", "1.6–2.5", "2.6–3.5", "3.6–4.5", "4.6–5.5", "5.6–6.5", "6.6–7.5", "7.6–8.5", "8.6–9.5", "9.6 이상"] },
      { key: "nail_shape", label: "쉐입", type: "radio", options: ["코핀", "코핀 오프", "포인트", "라운드 스퀘어", "스퀘어", "스퀘어 오프", "스틸레토", "스틸레토 오프", "특수"] },
      { key: "right_fingers", label: "오른손 특이사항 (엄지~소지)", type: "textarea", hint: "예) 엄지: 짧음, 중지: 파손" },
      { key: "left_fingers", label: "왼손 특이사항 (엄지~소지)", type: "textarea", hint: "예) 엄지: 짧음, 약지: 파손" },
      { key: "consented", label: "시술 전 안내사항 확인", type: "yesno" },
      { key: "privacy_consented", label: "개인정보 수집·이용 동의", type: "yesno" },
      { key: "notes", label: "기타 메모", type: "textarea" },
    ],
  },
  // ─────────────────────────────────────────────────────────
  // 반영구 (기존)
  // ─────────────────────────────────────────────────────────
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

/**
 * 시술명(예: "속눈썹 펌", "브라질리언 왁싱", "젤네일") 으로
 * 가장 적합한 차트 템플릿 key 자동 추론.
 * 매칭 안 되면 GENERAL 반환.
 */
export function inferTemplateKey(serviceName: string | null | undefined): string {
  if (!serviceName) return "GENERAL";
  const name = serviceName.toLowerCase().replace(/\s+/g, "");

  // 속눈썹 — 연장/펌/제거 모두 EYELASH
  if (/속눈썹|래쉬|lash|eyelash/.test(name)) return "EYELASH";

  // 네일 / 아크릴 / 패디
  if (/네일|아크릴|패디|nail|gel/.test(name)) return "ACRYLIC_NAIL";

  // 왁싱 / 슈가링 — 남/여 키워드로 분기
  if (/왁싱|슈가링|wax/.test(name)) {
    if (/남|men|male/.test(name)) return "WAXING_MALE";
    return "WAXING_FEMALE";
  }

  // 반영구 — 눈썹 / 엠보 / 콤보 / 마이크로블레이딩
  if (/눈썹|엠보|콤보|마이크로|반영구|brow/.test(name)) return "EYE_BROW";

  // 아이라인
  if (/아이라인|eyeline/.test(name)) return "EYE_LINE";

  // 입술 / 컬러립
  if (/입술|컬러립|베이비립|lip/.test(name)) return "COLOR_LIP";

  // 헤어라인
  if (/헤어라인|이마라인|hairline/.test(name)) return "HAIR_LINE";

  // 두피문신 / SMP
  if (/두피문신|smp|scalp/.test(name)) return "SMP";

  return "GENERAL";
}
